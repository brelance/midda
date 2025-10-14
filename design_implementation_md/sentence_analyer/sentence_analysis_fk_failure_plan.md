# 句子分析外键异常——排查与修复方案

## 问题诊断

- **报错信息**：`SqliteError: FOREIGN KEY constraint failed`，在执行 `ipcRenderer.invoke("db:sentenceAnalysis:upsert", payload)` 时触发。
- **表结构要点**：
  - `sentence_analysis_records.book_id` 定义了 `FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE)`。
  - 阅读器在句子分析前尚未把书籍写入 `books` 表，导致外键缺失。
- **执行流程**：
  1. 阅读器生成待分析的句子；
  2. 调用 `SentenceAnalysisRepository.upsert` 并传入 `{ bookId, ... }`；
  3. 由于 `books` 表中缺少对应记录，SQLite 在插入时因外键约束失败而报错。
- **根因归纳**：持久层假设书籍目录已写入 SQLite，而阅读流程直接使用尚未持久化的书籍 ID，违反了外键约束前提。

## 修复思路

1. **保证书籍在分析前已写入数据库**
   - 在 `AddBookButton` 成功导入 EPUB 时，立刻调用 `db:books:upsert`（以及 `db:chapters:bulkUpsert`）将资料写入 `books`/`chapters` 表，避免后续分析阶段出现缺失。
   - 进入阅读器时仅需校验数据库中是否已有该书；若缺失（例如旧版本遗留数据），再执行一次补写并为缺省字段（如 `filePath`）提供占位值。
2. **为句子分析 upsert 增加前置校验**
   - 在 `SentenceAnalysisRepository.upsert` 内部或其调用方，检测若无匹配书籍记录则抛出更清晰的领域错误，便于未来诊断。
3. **兼顾开发场景**
   - 对历史遗留数据，可在应用启动时一次性写入数据库，或在禁用持久化时跳过分析结果缓存。

## 任务拆解

1. 在 `AddBookButton` 的提交链路中串联持久化逻辑，确保新导入书籍与章节立即落库。
2. 为历史书籍编写一次性回填/校验脚本（或在进入阅读器时触发补写）。
3. 更新 `SentenceAnalysisRepository.upsert`（或其外围调用）以在缺失书籍记录时提前报错并提示具体原因。
4. 端到端验证：
   - 进入阅读器确认不再报外键错误；
   - 触发句子分析，确保 tokens 正常写入缓存；
   - 分别使用导入书籍（具有真实 `filePath`）

## 风险与缓解

- **风险**：占位字段（如虚拟 `filePath`）可能影响后续同步或文件检查。
  - _缓解_：使用显式的哨兵值，并在生产/开发模式中区分处理。
- **风险**：重复 upsert 章节可能触发唯一约束。
  - _缓解_：继续使用 UPSERT 语义，并确保章节 ID 保持稳定。
- **风险**：阅读器初始化新增 IPC 调用可能影响性能。
  - _缓解_：仅在书籍 ID 变化时调用，并可并行执行书籍与章节持久化请求。
