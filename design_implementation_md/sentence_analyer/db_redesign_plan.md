# EPUB 语句分析数据库重构方案

## 目标与范围

- 将原始字幕数据库结构重构为适配 EPUB 阅读器与句子分析的通用存储层。
- 支持书籍导入、章节内容缓存、阅读进度同步、句子分析结果缓存等核心场景。
- 为后续的批注、词汇卡片、阅读配置等扩展功能预留表结构与索引。

## 拟定 SQLite 表结构

### 1. `books`

- **用途**：存储导入的 EPUB 书籍及其元数据。
- **主要字段**：
  - `id TEXT PRIMARY KEY`：由解析服务生成的稳定书籍 ID。
  - `title TEXT NOT NULL` / `author TEXT` / `description TEXT`。
  - `cover_path TEXT`：封面在库目录中的文件相对路径。
  - `file_path TEXT NOT NULL`：库内 EPUB 实际路径。
  - `source_path TEXT`：导入前原始路径（可空）。
  - `status TEXT NOT NULL DEFAULT 'not-started'`：阅读状态。
  - `progress REAL NOT NULL DEFAULT 0`：整体进度（0-100）。
  - `current_chapter_id TEXT` / `last_read_chapter_id TEXT`。
  - `metadata_language TEXT` / `metadata_publisher TEXT` / `metadata_identifier TEXT`。
  - `added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`。
  - `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`。
- **索引**：
  - `CREATE INDEX idx_books_status ON books(status);`
  - `CREATE INDEX idx_books_progress ON books(progress);`
  - `CREATE INDEX idx_books_updated_at ON books(updated_at);`

### 2. `chapters`

- **用途**：缓存章节 HTML 内容与展开顺序，避免重复解析。
- **主键策略**：复合主键 `(book_id, chapter_id)`，确保不同书籍可复用同名章节 ID。
- **主要字段**：
  - `book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE`。
  - `chapter_id TEXT NOT NULL`：EPUB manifest/spine 中的章节标识。
  - `title TEXT` / `href TEXT` / `order_index INTEGER NOT NULL`。
  - `content_html TEXT`：章节原始 HTML。
  - `is_read INTEGER NOT NULL DEFAULT 0`（0/1）。
  - `word_count INTEGER`：可选，方便展示阅读统计。
  - 时间戳 `created_at` / `updated_at`。
- **索引**：
  - `CREATE UNIQUE INDEX idx_chapters_unique ON chapters(book_id, chapter_id);`
  - `CREATE INDEX idx_chapters_order ON chapters(book_id, order_index);`

### 3. `chapter_reading_positions`

- **用途**：记录每本书每章的阅读滚动进度与滚动位置。
- **主键**：`(book_id, chapter_id)`。
- **主要字段**：
  - `scroll_progress REAL NOT NULL`：0-1 之间的精度值。
  - `scroll_offset INTEGER`：像素级滚动位置，供精确恢复。
  - `viewport_height INTEGER`：计算 `scroll_progress` 时的视口高度。
  - `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`。
- **外键**：`FOREIGN KEY (book_id, chapter_id) REFERENCES chapters(book_id, chapter_id) ON DELETE CASCADE`。

### 4. `sentence_analysis_records`

- **用途**：缓存句子分析的 token 结果，避免重复请求 LLM。
- **主要字段**：
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`。
  - `book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE`。
  - `chapter_id TEXT` / `paragraph_id TEXT` / `sentence_id TEXT`：定位上下文，可空。
  - `sentence_hash TEXT NOT NULL`：`text` + 上下文字段生成的稳定 hash，用于去重。
  - `text TEXT NOT NULL`。
  - `tokens_json TEXT NOT NULL`：与 `TokenData[]` 对应的 JSON。
  - `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`。
  - `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`。
- **索引**：
  - `CREATE UNIQUE INDEX idx_sentence_analysis_hash ON sentence_analysis_records(book_id, sentence_hash);`
  - `CREATE INDEX idx_sentence_analysis_locator ON sentence_analysis_records(book_id, chapter_id, paragraph_id);`

### 5. `sentence_analysis_jobs`（可选扩展）

- **用途**：记录待分析/执行中的句子任务，支撑离线队列或失败重试。
- **字段**：
  - `job_id INTEGER PRIMARY KEY AUTOINCREMENT`。
  - `book_id TEXT NOT NULL` / `chapter_id TEXT` / `sentence_hash TEXT NOT NULL`。
  - `text TEXT NOT NULL`。
  - `status TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed'))`。
  - `error TEXT` / `result_record_id INTEGER REFERENCES sentence_analysis_records(id)`。
  - `created_at` / `updated_at`。
- **索引**：
  - `CREATE UNIQUE INDEX idx_sentence_analysis_jobs ON sentence_analysis_jobs(book_id, sentence_hash);`

### 6. `user_preferences`

- **用途**：存储全局或阅读器级别的配置（阅读模式、字体、主题等）。
- **字段**：
  - `key TEXT PRIMARY KEY`。
  - `value TEXT NOT NULL`（序列化 JSON）。
  - `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`。

> 说明：如需支持批注、高亮或词汇本，可在此基础上追加 `annotations` / `highlights` / `vocabulary_cards` 等表，字段设计参考 `book_id + chapter_id + cfi/span + content` 的复合主键模式。

## 数据流与调用关系

- **书籍导入**：`epubService.parseEpubFile` 返回的 `EpubBookData` 写入 `books`，章节批量写入 `chapters`，并初始化对应的阅读进度记录。
- **阅读进度**：前端滚动回调通过 `window.api.db.readingPositions.upsert` 更新 `chapter_reading_positions`，并同步 `books.progress`、`books.last_read_chapter_id`。
- **句子分析**：
  - 先查询 `sentence_analysis_records` 是否已有缓存；
  - 若无，写入 `sentence_analysis_jobs` 设为 `pending`，待分析完成后落盘结果并更新状态；
  - `SentenceAnalyzer` 读取 `tokens_json` 并转换回 `TokenData[]`。
- **全局设置**：阅读器 UI 改动（例如单/双页模式）经由 `user_preferences` 持久化。

## 实施任务拆解

1. **基础设施更新**

   - 重命名 `subtitles.db.ts` 为更通用的 `library.db.ts`（或拆分为 `books.repository.ts` 等）。
   - 在 `databse.ts` 启动阶段确保上述所有表结构存在（`CREATE TABLE IF NOT EXISTS` + 必要索引）。
   - 为未来迁移添加版本表（可选的 `schema_migrations`）。

2. **仓储层实现**

   - 新增仓储类：`BookRepository`、`ChapterRepository`、`ReadingPositionRepository`、`SentenceAnalysisRepository`。
   - 老的 `SubtitleLinesRepository` 标记为待删除或保留兼容层（若需要迁移旧数据）。

3. **IPC 接口重构**

   - 在 `electron/main/api/db/db.api.ts` 注册新的通道，例如：
     - `db:books:upsert`, `db:books:all`, `db:books:delete`.
     - `db:chapters:bulkUpsert`, `db:chapters:byBook`.
     - `db:readingPositions:get`, `db:readingPositions:upsert`.
     - `db:sentenceAnalysis:get`, `db:sentenceAnalysis:upsert`, `db:sentenceAnalysis:jobs:enqueue`.
   - 调整 preload `index.d.ts` 与前端类型引用。

4. **前端集成与回归**

   - 更新前端服务层（新增 `libraryService`）以消费新的 IPC 方法。
   - 替换 `SentenceAnalyzer`/`AnalysisLine` 等组件的旧数据访问逻辑。
   - 在 Reader 入口加载书籍/章节/进度，并在滚动时落盘。

5. **迁移与清理**

   - 若需保留旧字幕数据，编写一次性迁移脚本或明确丢弃策略。
   - 移除不再使用的 API 通道与类型声明。

6. **测试与验证**
   - 引入针对仓储层的单元测试（可使用 `better-sqlite3` 的内存模式）。
   - 编写端到端冒烟脚本：导入 EPUB → 打开阅读器 → 生成句子分析 → 重启确认数据持久化。

## 风险与注意事项

- `content_html` 体积可能较大，需评估是否对 SQLite page size 产生影响；必要时可引入章节懒加载策略。
- `tokens_json` 建议统一使用压缩字段或归一化 schema，避免 JSON 解析失败导致渲染阻塞。
- 长期建议补充数据版本管理（`PRAGMA user_version` 或独立迁移表）以支持增量升级。
