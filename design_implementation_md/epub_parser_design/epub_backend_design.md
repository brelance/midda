# Electron EPUB 导入解析后端设计

## 背景与目标
- 现有阅读器前端已具备章节渲染、进度同步等功能，`src/types/types.ts` 中同时定义了 `Book`/`EpubBookData`/`EpubChapter` 等结构，可以直接接收来自 Electron 主进程的解析结果。
- 目标是在 Electron 主进程内提供一套稳定的 EPUB 导入能力，负责文件选择、EPUB 解包解析、封面与章节抽取，以及与渲染进程的 IPC 通信，最终交付符合前端类型约束的 `EpubBookData`。
- 非目标：书籍内容的数据库持久化、章节内的高亮/批注处理、其他文件格式（PDF/MOBI）解析，这些可在后续迭代扩展。

## 架构概览
导入流程分为 4 个环节，贯穿 Electron 主进程的 `api` 层、`service` 层与渲染进程：
1. **渲染进程**（`src/components/AddBookButton.tsx`）通过 `window.api.epub.selectFile()` 弹出对话框并获取用户选择的 EPUB 路径。
2. 渲染进程调用 `window.api.epub.parseFile(filePath)` → 触发主进程 `ipcMain.handle('epub:parse-file')`。
3. 主进程委托 `EPUBService` 解析文件（元数据、封面、章节），必要时通过 `win.webContents.send('epub:parse-progress')` 推送阶段性进度。
4. 主进程返回 `EpubBookData`，前端将其转为 `Book` 并写入状态树。

## 模块划分

### electron/main/api/epub/epub.api.ts
- **职责**：注册 `epub:*` IPC 处理器，封装权限校验、错误转换、进度分发。
- **接口**：
  - `epub:select-file`：弹出文件对话框，返回本地路径或 `null`。
  - `epub:parse-file`：接收文件绝对路径，返回 `EpubBookData`。内部捕获异常并包装为 `ElectronIpcError`，渲染端据此提示。
  - `epub:get-cover`：（可重用）单独拉取封面 Base64 数据，用于已导入书籍的刷新。
  - `epub:parse-progress`（push channel）：解析阶段事件（`selecting`、`unzipping`、`metadata`、`chapters`、`finalizing`）及百分比，供渲染端展示导入进度。
- **防护**：校验传入路径必须位于用户允许的盘符，拒绝网络路径及不存在的文件；对 IPC 结果统一做 `try/catch`。

### electron/main/api/epub/epubService.ts
- **职责**：对 `epub` 库（`node_modules/epub`）进行二次封装，输出符合 `EpubBookData` 的对象，同时聚合封面和章节。
- **核心方法**：
  - `parseEpubFile(filePath, options?)`：主入口，加载、解析并组装结果。
  - `extractMetadata(epub)`：读取 `title/creator/description/language/publisher/identifier`，兼容缺省字段。
  - `extractCover(epub | filePath)`：尝试使用 `epub.metadata.cover` 获取图片；若缺失则回落到 manifest 中的 `cover.*` 项。
  - `extractChapters(epub, { includeRawHtml: boolean })`：遍历 spine / flow，按 `index` 生成 `EpubChapter`。为减少前端重复解析，章节内容保持原始 HTML。
  - `normalizeAuthor(metadata)`：将 `metadata.creator` 中的多作者情况拆分并只取首个展示；后续可扩展返回数组。
  - `generateId(filePath)`：结合文件路径 + `fs.stat` 的 `mtimeMs` 生成稳定 ID，避免同书重复导入冲突。
- **进度回调**：`parseEpubFile` 接收可选 `onProgress(stage, payload)`，由 API 层转发给渲染端。
- **错误约定**：抛出自定义 `EpubParseError`（含 stage/type/innerError），用于区分 `ENOENT`、`UNSUPPORTED_MIMETYPE`、`PARSE_FAILED` 等场景。

### electron/main/api/epub/storage.ts（新）
- **职责**：负责将导入的 EPUB 原文件复制到应用私有目录中，确保后续阅读无需依赖原始文件位置。
- **行为**：
  - `resolveLibraryPath()`：调用 `app.getPath('userData')`，创建 `library/epub` 目录。
  - `copyToLibrary(filePath, targetId)`：复制文件至 `${userData}/library/epub/${targetId}.epub`，返回持久化路径。
  - `cleanup(targetId)`：当删除书籍时可调用，用后续迭代时复用。
- **集成**：`parseEpubFile` 成功后将 `filePath` 字段替换为库内路径；原始路径可通过 `metadata.sourcePath` 另存。

### electron/main/api/epub/validators.ts（新）
- **职责**：在解析前执行快速验证。
- **校验项**：
  - 文件存在性、可访问性（`fs.promises.access`）。
  - MIME/扩展名校验：使用 `file-type` 或 `path.extname` 判定，仅允许 `.epub`。
  - 文件尺寸限制：默认 100MB，可通过环境变量调整，防止一次性解析超大文件造成主进程阻塞。
- **接口**：`assertValidEpub(filePath): Promise<void>`，不通过则抛出 `EpubValidationError`。

## 数据结构映射

| EPUBService 输出字段 | 来源 | 对应前端类型 (src/types/types.ts) | 说明 |
| --- | --- | --- | --- |
| `id` | `generateId(filePath)` | `EpubBookData.id` | 前端转为 `Book.id` |
| `title` | `metadata.title ?? '未知标题'` | `EpubBookData.title` | 处理空值 |
| `author` | `normalizeAuthor(metadata.creator)` | `EpubBookData.author` | |
| `cover` | `extractCover` → Base64 | `EpubBookData.cover` | 可为 `undefined` |
| `chapters` | `extractChapters` | `EpubChapter[]` | `content`保留 HTML |
| `metadata` | `extractMetadata` | `EpubMetadata` | 直接透传 |
| `filePath` | `storage.copyToLibrary` 结果 | `EpubBookData.filePath` | 用于后续打开 |
| `addedDate` | `new Date()` | `EpubBookData.addedDate` | |
| `progress` | 初始化 0 | `EpubBookData.progress` | |
| `status` | `'not-started'` | `EpubBookData.status` | |

## IPC 接口契约
- `epub:select-file` → `Promise<string | null>`：仅主进程可调用 `dialog.showOpenDialog`；对话框默认过滤 `*.epub`，但允许“全部文件”以便手动选择。
- `epub:parse-file` → `Promise<EpubBookData>`：
  1. IPC 层调用 `validators.assertValidEpub(filePath)`
  2. 执行 `storage.copyToLibrary`
  3. 调用 `EPUBService.parseEpubFile(libraryPath, { onProgress })`
  4. 成功：返回 `EpubBookData`
  5. 失败：`throw { code: 'EPUB_PARSE_FAILED', message, detail }`
- `epub:get-cover` → `Promise<string | undefined>`：复用 `EPUBService.extractCover`，支持在前端刷新封面或生成缩略图。
- `epub:parse-progress`：消息体 `{ stage: 'metadata' | 'chapters' | ..., percent: number }`；渲染端可选监听。

## 解析流程
1. **选择文件**：渲染端触发对话框，IPC 返回路径。
2. **前置校验**：验证文件存在、扩展名合法、尺寸未超限；不通过则立即返回错误。
3. **复制入库**：将文件复制到用户数据目录，避免用户移动原文件导致后续失败。
4. **初始化解析器**：`new EPub(libraryPath)`，绑定 `end`/`error` 事件，发送 `stage: 'initializing'`。
5. **解析元数据**：读取书籍标题、作者、语言等，`stage: 'metadata'`。
6. **提取封面**：尝试 `epub.metadata.cover` → manifest fallback，`stage: 'cover'`。
7. **遍历章节**：循环 `epub.spine.contents` 或 `epub.flow`，通过 `getChapter` 拉取 HTML 内容；每成功一个章节更新进度 `stage: 'chapters'`。
8. **组装结果**：构造 `EpubBookData` 对象，初始进度 0、状态 `'not-started'`。
9. **返回渲染端**：IPC resolve；若失败则 reject 并写入日志。

## 错误与日志
- 主进程应在 `parse-file` 捕获所有异常，使用 `console.error` + 自定义 `logger.warn`（待引入）记录。
- 典型错误码：
  - `EPUB_FILE_NOT_FOUND`
  - `EPUB_FILE_INVALID`
  - `EPUB_PARSE_FAILED`
  - `EPUB_COVER_NOT_FOUND`（非致命）
- IPC 返回错误对象 `{ code, message, stack? }`，渲染端可根据 `code` 显示用户友好提示。

## 测试计划
- **单元测试**（Node 环境，可使用 `vitest` 或 `jest`）：
  - `validators.assertValidEpub` 针对合法/非法路径、扩展名、超大文件。
  - `EPUBService.extractMetadata`/`extractChapters` 针对包含/缺失章节的 EPUB。
- **集成测试**：
  - 使用 `test_epub/負けヒロインが多すぎる 8...epub` 通过主进程脚本执行完整解析，断言 `EpubBookData` 结构。
  - 模拟解析过程中抛错（如损坏文件），验证 IPC 错误传递。
- **手动验证**：
  - 在开发模式下导入不同大小与语言的 EPUB，观察进度条与前端渲染。
  - 移除原始文件，确认库内副本依旧可被解析。

## 扩展方向
- 将 `EpubBookData` 写入 SQLite（`electron/main/api/db`）以支持多会话持久化。
- 在解析阶段提取目录（TOC）信息，丰富章节层级。
- 提供章节懒加载接口，减少初次导入时的内存占用。
- 支持增量更新（检测重复 `identifier`，提示覆盖或跳过）。

