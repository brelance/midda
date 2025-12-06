# Multilingual Sentence Analysis Plan

目标：让句子分析管线能够根据读者当前章节的语言，自动选择匹配的 Prompt 与分词策略，减少对单一日语场景的依赖。方案要求前端检测语言并把结果传递到 Electron 主进程，使 `electron/main/api/llm/word_detail/detail.api.ts` 能够根据语言切换 prompt。

## 设计约束与考虑

- **语言检测位置**：优先在渲染进程执行，以便在发起分析请求前就拥有语言信息，并避免 Electron 端读取完整章节文本。
- **检测粒度**：章节内可能混合多语言。检测策略应当基于用户即将分析的句子集合（例如当前章节的前若干句），并缓存结果，减少重复计算。
- **LLM Prompt 管理**：Electron 端需要维护语言到 Prompt 模板的映射，确保默认（未知语言）仍然可用。
- **扩展性**：未来可能引入更多语言或不同 LLM 供应商，方案需易于配置和测试。

## 实施步骤

1. **调研并选型语言检测方案**
   - 评估 `tinyld` 的可行性与包体积。
   - 确定检测 API：输入为句子数组或整段文本，输出最可能语言代码（ISO-639-1/BCP-47）。
   - 确定 fallback 行为：检测结果低置信度时回落到 `ja`（现有逻辑）或 `system-default`。

2. **在前端建立语言检测工具**
   - 在 `src/utils/lang/detectLanguage.ts`（新目录）实现检测函数 `detectLanguageForSentences(sentences: string[]): DetectedLanguageResult`。
   - 函数返回 { languageCode: string; confidence: number; sampleSize: number }，并提供缓存（Map<chapterId, result>）以避免重复计算。
   - 提供同步 & 异步版本，保证 `ReaderPage` 在准备分析前可以 await 语言结果。

3. **扩展 ReaderPage 状态流**
   - 在 `ReaderPage.tsx` 中新增 `analysisLanguage` state，默认 `auto`.
   - 在用户点击“开始分析”或“显示分析”之前，调用语言检测工具基于当前章节句子生成语言代码并更新 `analysisLanguage`.
   - 将 `analysisLanguage` 通过 `window.api.ai` 或现有分析请求 payload 传递到后端。若语言检测失败则写入 `undefined` 以使用后端默认 prompt。
   - 在 UI 中可选地显示“检测到的语言：xx”，并允许用户手动覆盖（可放入 Settings Modal 的 TTS 语言旁边，属于额外加分项）。

4. **定义 Renderer → Electron 的语言参数协议**
   - 更新 `IElectronAPI` 类型（`src/index.d.ts`）中与句子分析相关的方法（例如 `window.api.ai.sendGeminiRequest` 或专门的分析 API）以接受 `language?: string`.
   - 若分析请求目前通过自建队列（如 `queuedSendGeminiRequest`），需要扩展 `TtsSentencePayload` 或专门的 `SentenceAnalysisJob` payload，确保语言信息贯穿任务生命周期。
   - 审查任何缓存键（例如 `sentenceAnalysis` 数据库中 `sentenceHash`）是否需要包含语言维度，避免跨语言复用不兼容的 tokens。若需要，调整 `SentenceAnalysisContext` 结构。

5. **在 Electron 主进程配置 Prompt 映射**
   - 在 `electron/main/api/llm/word_detail/detail.api.ts` 中新增 `const languagePromptMap: Record<string, PromptTemplate>`，包含 `ja`, `en`, `zh`, `ko` 等常见语言。
   - 提供 `getPromptForLanguage(lang?: string): PromptTemplate` 方法；当语言未知时回退到日语 prompt 或通用 prompt。
   - 同时考虑不同语言的分词/注音字段：例如中文无需假名，英语需要词性说明等。Prompt 模版应描述所需输出结构，确保前端 `SentenceAnalyzer` 能兼容（必要时新增字段）。

6. **前后端串联测试**
   - 在开发环境构造多语言章节（或 hardcode 几个字符串），确保自动检测出正确语言，并在 Electron log 中看到 prompt 切换。
   - 模拟语言检测失败/低置信度，验证 fallback 行为。
   - 如果数据库缓存依赖语言键，编写迁移脚本或在读取时增加语言过滤，防止旧记录影响新语言。

7. **文档与后续工作**
   - 在 `design_spec_usage.md` 或新的 `README` 小节记录语言检测算法、可支持语言列表以及如何扩展 prompt。
   - 规划后续优化（如允许用户手动选择语言、在 Settings Modal 中显示检测结果、为每种语言提供不同的 UI 组件等）。
   - 若未来要支持服务端语言检测或更复杂的 NER pipeline，可在本计划底部加入 TODO/风险提示。

## 风险与缓解

- **检测误判**：在混合语言或短句场景中可能被误判。缓解措施：允许用户手动覆盖语言，或设定最小样本量阈值。
- **LLM 输出格式差异**：不同语言 prompt 可能产生不同 token 结构。需要在 `SentenceAnalyzer` 中保持 schema 向后兼容，或根据语言选择对应的渲染器。
- **性能影响**：语言检测可能对长章节造成延迟。通过抽样（仅取前 N 句）与缓存减轻。

以上计划完成后，即可实现从自动语言检测到 Electron Prompt 切换的多语言句子分析支持。

