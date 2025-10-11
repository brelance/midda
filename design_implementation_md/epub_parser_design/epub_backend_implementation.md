# EPUB 导入后端实现速记

## 能力概览
- **文件校验**：`assertValidEpub` 保证路径、扩展名、类型与大小符合要求，避免主进程解析无效文件。
- **解析管线**：`EPUBService.parseEpubFile` 统一封装元数据、封面、章节抽取，并通过进度回调分阶段上报。
- **错误语义化**：`EpubBaseError` 系列为常见异常提供错误码/阶段，便于渲染端展示友好提示。
- **文件落地**：`copyToLibrary` 将导入文件复制到 `userData/library/epub`，防止原始文件被移动后读取失败。
- **IPC 集成**：`epub:select-file`、`epub:parse-file`、`epub:get-cover` 三个 handler 完成 UI → 主进程的导入闭环。

## 核心文件一览

| 模块 | 作用 |
| --- | --- |
| `electron/main/api/epub/errors.ts` | 定义 `EpubValidationError`、`EpubParseError`、`EpubCoverError`、`EpubStorageError` 等错误类型及阶段枚举。 |
| `electron/main/api/epub/validators.ts` | `assertValidEpub` 负责路径存在、扩展名、文件类型与大小校验。 |
| `electron/main/api/epub/storage.ts` | 处理库目录创建、文件复制或删改，确保导入后文件位置稳定。 |
| `electron/main/api/epub/epubService.ts` | 解析 EPUB：生成稳定 ID、提取元数据、封面与章节、推送进度、封装返回值。 |
| `electron/main/api/epub/epub.api.ts` | 注册 IPC handler，整合验证、解析、存储与异常包装，同时向渲染进程发送进度事件。 |
| `src/types/types.ts` | 为 `EpubMetadata` 新增 `sourcePath`，回传原始文件来源。 |

## 解析与进度上报
`epubService.ts` 利用 `ParseOptions.onProgress` 回调向外部暴露解析阶段。章节解析过程中会根据处理数量动态计算百分比：

```ts
// electron/main/api/epub/epubService.ts
const chapters = await this.extractChapters(epub, includeRawHtml, (current, total, chapterId) => {
  emit({
    stage: "chapters",
    percent: 55 + Math.round((current / total) * 35),
    detail: { current, total, chapterId },
  });
});
```

最终在 `epub.api.ts` 中通过 `event.sender.send("epub:parse-progress", progress)` 推送给渲染进程，配合 `window.api.epub.onParseProgress` 即可显示导入状态。

## 稳定书籍 ID 生成
为避免重复导入导致 ID 重复，`generateId` 将解析路径与文件 `mtime`（或当前时间）进行哈希：

```ts
// electron/main/api/epub/epubService.ts
const stat = await fs.stat(filePath);
const hash = createHash("sha1");
hash.update(path.resolve(filePath));
hash.update(String(Math.floor(stat.mtimeMs)));
return hash.digest("base64url").slice(0, 16);
```

即使同一本书再次导入，如果原文件未修改，仍能产生一致 ID；若文件发生变动，ID 会随之更新。

## IPC Handler 组合流程

```ts
// electron/main/api/epub/epub.api.ts
ipcMain.handle("epub:parse-file", async (event, rawFilePath) => {
  const filePath = normalizePath(rawFilePath);
  await assertValidEpub(filePath);

  const bookData = await epubService.parseEpubFile(filePath, {
    sourcePath: filePath,
    onProgress: (payload) => event.sender.send("epub:parse-progress", payload),
  });

  const storedPath = await copyToLibrary(filePath, bookData.id);
  bookData.filePath = storedPath;
  return bookData;
});
```

语义化错误会被 `formatIpcError` 转换为携带 `code`/`stage` 的 `Error` 实例，渲染端可根据 `err.code` 定制提示。

## 类型补充
`src/types/types.ts` 中的 `EpubMetadata` 新增 `sourcePath`，记录导入前原始路径，便于后续排查或同步：

```ts
export interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  language: string;
  publisher?: string;
  identifier: string;
  sourcePath?: string;
}
```

## 后续扩展建议
- 将 `EpubBookData` 写入 SQLite，支持应用重启后的书架恢复。
- 在解析阶段追加目录（TOC）结构，支撑多层级章节导航。
- 对 `copyToLibrary` 提供去重策略（按 `identifier` 判断是否覆盖）。
- 基于 `onProgress` 增加导入取消能力。
