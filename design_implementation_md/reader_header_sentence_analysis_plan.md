# Reader Header Analysis Mode Plan

目标：在阅读器头部增加模式切换按钮，使用户可以进入新的分析模式。在分析模式下显示新的 `ReaderHeader` 变体和 `ReaderSentenceAnalysisPanel` 作为主内容，只有在分析模式头部触发语法分析按钮时才开始句子分析流程。

## 实施步骤

1. **梳理现有状态流**
   - 研究 `ReaderPage.tsx` 中 `isSentenceAnalysisActive`、`sentenceItems` 以及相关副作用，记录它们目前如何驱动头部按钮与内容区域切换。
   - 盘点 `ReaderHeader.tsx` 的 props 与交互，确认与句子分析相关的回调/状态。

2. **设计模式切换状态**
   - 在 ReaderPage 中引入明确的阅读模式枚举（例如 `viewMode: "reading" | "analysis"`），用于决定主内容组件与头部变体。
   - 保留或新增独立的“分析运行状态”（例如 `isSentenceAnalysisRunning`），用于控制句子分析流程是否启动。

3. **更新 ReaderLayout 的头部与主体切换逻辑**
   - 根据 `viewMode` 渲染默认头部或新的分析模式头部组件。
   - 在 `viewMode === "analysis"` 时将主体切换为 `ReaderSentenceAnalysisPanel`，但分析状态默认为未启动。

4. **扩展 ReaderHeader**
   - 为现有 `ReaderHeader` 增加模式切换按钮（例如“分析模式”/“阅读模式”），点击后通过 props 通知 `ReaderPage` 切换 `viewMode`。
   - 为分析模式创建新的头部布局：可以在 `ReaderHeader` 内根据 props 渲染不同分支，或拆分为独立组件以保持清晰度。

5. **迁移语法分析按钮**
   - 将当前头部中的语法分析按钮移动至分析模式头部，只在分析模式下可见。
   - 调整回调，使按钮触发新的 `startSentenceAnalysis` 方法，启动句子分析所需的状态更新与副作用。

6. **重构句子分析触发流程**
   - 进入分析模式时不要自动调用 `handleToggleSentenceAnalysis`；仅在 `startSentenceAnalysis` 触发时将 `isSentenceAnalysisRunning` 置为 true 并开始处理队列。
   - 确认退出分析模式或显式停止时，重置 `sentenceItemsRef`、`processingRef` 以及滚动位置等。

7. **同步状态与副作用**
   - 更新 `useEffect` 钩子，确保它们依赖新的 `isSentenceAnalysisRunning` 而非模式状态，以避免在进入分析模式时立即启动分析。
   - 审查键盘快捷键、滚动监听、章节切换、`showToolbarsTemporarily` 等逻辑，确保在两种模式之间行为一致或按需调整。

8. **类型、测试与文档更新**
   - 调整 `ReaderHeaderProps`、`ReadingMode` 相关类型，添加新的枚举或回调定义。
   - 更新现有测试或添加新的单元测试/集成测试覆盖模式切换与分析启动顺序。
   - 在项目文档或 README 中补充模式切换与分析流程的使用说明（如适用）。

