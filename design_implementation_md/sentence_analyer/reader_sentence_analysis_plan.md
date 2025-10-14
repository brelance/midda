# EPUB 阅读器句子分析集成计划

## 目标

- 在 Reader 页顶部工具栏新增“句子分析”按钮（位于单/双页切换按钮左侧），触发后对当前章节文本执行句子级别的分析流程。
- 复用 `SentenceAnalyzer` 组件与数据库缓存能力，让每个句子在 UI 中可展示分词、词性、释义等信息。

## 实施步骤

### 1. UI 与交互层

- **ReaderHeader.tsx**：增加新按钮及 `onClick` 回调属性，确保在移动/桌面端显示一致，提供合适的图标与 Tooltip。
- **ReaderPage**：
  - 维护 `isSentenceAnalysisActive` 状态，用于驱动内容区切换到分析视图。
  - 按钮点击时切换状态，并触发章节文本解析（见后续步骤）。
  - 传递回调到 `ReaderHeader`，与切换按钮保持协同（例如点击分析后临时显示工具栏）。

### 2. 章节内容分句

- 提取当前章节 HTML，将其转换为纯文本并按句号/标点（兼容日文句读符）拆分；保留必要的上下文 ID（chapterId、段落索引、句子索引）。
- 构建句子数组（例如 `SentenceForAnalysis { text, chapterId, paragraphId, sentenceId }`），供后续组件渲染。
- 评估在 `ReaderPage` 还是独立 hook 中完成：推荐抽离到 `useSentenceAnalysis` 自定义 hook，负责分句、缓存查询、触发分析任务。

### 3. 数据缓存与分析触发

- 对每个句子优先调用 `window.api.db.sentenceAnalysis.getBySentence`，命中后直接使用缓存 tokens。
- 未命中的句子：
  - 调用 `window.api.ai.sendGeminiRequest` 进行解析，并将结果通过 `sentenceAnalysis.upsert` 写入数据库。
  - 或在未来交由 `sentenceAnalysisJobs.enqueue` 异步处理（此阶段可先同步实现）。
- 注意批量调用节奏，避免在长章节中阻塞 UI，可考虑逐句 await 或并发限制。

### 4. 分析视图渲染

- `ReaderContent` 保持原样，新增分析模式容器，例如 `ReaderSentenceAnalysisPanel`。
- 面板中迭代句子数组：
  - 若已有 tokens，则渲染 `SentenceAnalyzer`，传入 `text`、`bookId`、`chapterId`、`analyzedTokens`。
  - 若解析中，显示 loading 状态；若失败，提示重试按钮。
- 支持在分析模式下仍可滚动、切换章节；章节变化时清空状态并重新分句。

### 5. 状态同步与持久化

- 在按钮激活时，可选将 `user_preferences` 中记录“上次是否打开句子分析”以供下次恢复。
- 每次滚动时继续更新 `chapter_reading_positions`，确保分析模式不影响阅读进度记录。

### 6. 错误与性能处理

- 加入节流 / 并发控制，避免对 Gemini API 造成瞬时过载。
- 捕获 API 错误后日志输出，并提供 UI 反馈（例如 toast / 行内提示）。
- 大章节时考虑分页加载句子或懒加载（可在后续迭代）。

## 验收标准

- Reader Header 中新增按钮显示正确，点击可切换分析模式。
- 当前章节所有句子可逐条展示，已解析句子复用缓存，未解析句子触发请求后自动填充。
- 切换章节、离开阅读器再返回，仍能访问已存缓存；其他阅读功能（翻章、切换视图、滚动进度）正常。
