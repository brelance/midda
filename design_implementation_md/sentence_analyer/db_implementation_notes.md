# EPUB 语句分析数据库实现记录

## 初始化与迁移策略
- `electron/main/api/db/databse.ts` 在应用启动时建立 Better-SQLite 连接，并启用 `PRAGMA foreign_keys = ON`，确保级联删除生效。
- 同文件中通过单次事务执行所有建表及索引创建语句，涵盖 `books`、`chapters`、`chapter_reading_positions`、`sentence_analysis_records`、`sentence_analysis_jobs` 与 `user_preferences`，保证多表结构同时就绪。
- 统一使用 `CURRENT_TIMESTAMP` 维护 `added_at`/`updated_at` 字段，同时对进度与状态字段设置 `CHECK` 约束，避免写入非法数据。

## 仓储层封装
`electron/main/api/db/library.repositories.ts` 提供每张表的访问封装，规避重复 SQL 与类型散落：

- **BookRepository**
  - `upsert`：使用 `INSERT ... ON CONFLICT(id) DO UPDATE`，默认状态 `not-started`、进度 `0`，返回最新数据库行。
  - `getAll` 与 `delete` 提供基础 CRUD 支持，所有取出的列映射成驼峰风格对象。
- **ChapterRepository**
  - `bulkUpsert`：在事务内批量 upsert，每行 `is_read` 以布尔映射 `0/1`；`getByBookId` 按 `order_index` 排序返回章节。
  - 删除书籍章节时调用 `deleteByBookId`，依赖外键约束保持一致性。
- **ChapterReadingPositionRepository**
  - 通过主键 `(book_id, chapter_id)` upsert 滚动进度，返回更新后的最新记录，并提供 `get`/`delete` 接口。
- **SentenceAnalysisRepository**
  - 基于 `computeSentenceHash`（SHA-256）将 `bookId + context + text` 生成稳定哈希，实现去重缓存。
  - `upsert`/`getBySentence` 序列化 `TokenData[]` 至 `tokens_json`，读取时解析 JSON。
  - `listByContext` 支持按 `book`、可选章节/段落过滤。
- **SentenceAnalysisJobRepository**
  - 将未完成或失败任务记录在 `sentence_analysis_jobs`；`enqueue` 与 `updateStatus` 支持状态流转。
  - `getPending(limit)` 返回最久未处理的任务，供后续队列执行器消费。
- **UserPreferencesRepository**
  - 简单键值存储，写入时更新时间戳，可用于阅读器 UI 设置等。

## IPC 接口与类型暴露
- `electron/main/api/db/db.api/db.api.ts` 注册 IPC 通道，分别调用上述仓储方法；`chapters:bulkUpsert` 在写入前校验所有记录的 `bookId` 一致性。
- `electron/preload.ts` 暴露 `window.api.db`，并为每类操作提供函数签名。关键入参采用 `src/types/database.ts` 中定义的 payload 类型，返回值保持强类型。
- `src/index.d.ts` 重新定义 `IElectronAPI`，供渲染进程下发命令时享受完整类型推断，涵盖书籍、章节、进度、句子分析、任务队列与用户偏好。

## Renderer 侧类型同步
- `src/types/database.ts` 聚合所有数据库 record/payload 类型，渲染进程可直接 import 使用，避免手写结构体。
- `src/types/types.ts` 中的 `SentenceAnalysisRecord` 扩展了数据库字段（`id`、`sentenceHash`、时间戳），便于前端展示与调试。

## 后续集成提示
- 在 Reader 页面挂载时，可调用 `window.api.db.books.get` 与 `chapters.getByBook` 取回持久化数据，滚动事件内通过 `readingPositions.upsert` 实时写库。
- `SentenceAnalyzer` 组件在请求 LLM 前应尝试 `sentenceAnalysis.getBySentence`，命中缓存后直接展示结果；失败时创建 `sentenceAnalysisJobs.enqueue` 任务供后台处理。
- 如需同步书籍总进度，可在章节进度更新后调用 `books.upsert`（仅更新 `progress` 与 `lastReadChapterId` 字段）。
