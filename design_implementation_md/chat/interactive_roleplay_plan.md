# 交互式角色扮演（Chat）实现计划

## 目标
在阅读器中为当前章节提供角色扮演聊天能力。当用户点击 ReaderHeader 的“聊天”按钮时：
1) 后台调用 LLM 使用 `electron/main/api/llm/prompts/interactive_roleplay/analyze.md` 对当前章节进行角色分析并返回 JSON；
2) 解析分析结果，填充 `electron/main/api/llm/prompts/interactive_roleplay/chat.md` 的变量；
3) 将用户在前端侧边栏的消息与角色扮演对话上下文交给 LLM，实时返回消息供前端显示。

## 现状概览
- 前端：聊天侧栏 UI 已接入角色列表与消息输入/展示，使用 `sendMessage` IPC 发送并显示回复，按章节+角色维护对话历史。
- 类型和服务：`src/types/roleplay.ts` 定义分析/聊天结构；`src/services/interactiveRoleplay.ts` 调用 `interactiveRoleplay.analyzeChapter`、`interactiveRoleplay.sendMessage`。
- Electron preload：暴露 `interactiveRoleplay.analyzeChapter`、`interactiveRoleplay.sendMessage` IPC。
- 主进程：实现 `interactive-roleplay:analyze`（章节截断+模板加载+角色解析）与 `interactive-roleplay:sendMessage`（基于 chat prompt 的非流式回复，截取最近历史）。
- LLM 提示：分析 prompt 与聊天 prompt 已存在对应 md 文件。

## 待解决的核心问题
1) 状态持久化与缓存策略：按章节缓存角色分析结果（后端可选）、聊天历史的存储/回放/持久化策略待定。
2) 错误处理与 UI 回退：LLM 超时/解析失败的友好提示、重试与降级方案可再完善（当前仅简单提示）。
3) 流式/性能优化：需要时可加流式输出、章节摘要、节流与限流。

## 详细计划
### A. 章节角色分析 IPC（Backend） — 已完成
1. `interactive-roleplay:analyze` 已实现：验证入参、对超长章节按阈值截断、读取 analyze prompt、调用 LLM。
2. 解析响应：去掉 markdown 包裹，标准化 characters 列表，若为空抛出错误。
3. 前端已接 IPC；可后续再补内存缓存/节流。

### B. 角色扮演聊天消息链路 — 已完成（基础版）
1. IPC：`interactive-roleplay:sendMessage` 已实现（使用 chat prompt，支持历史消息入参，返回非流式回复）；`startSession` 仍可选。
2. Prompt 组装：使用 `interactive_roleplay/chat.md`，填充角色信息、章节上下文、语言/水平。
3. 前端：ReaderChatSidebar 已支持消息列表、输入框、按章节/角色的会话历史、发送加载态和错误提示，并调用 sendMessage。
4. 后续优化：
   - 如果需要流式输出，复用现有 on*/subscribe 模式。
   - 可选会话缓存（内存/DB）、章节摘要与限流。

### C. 前端集成补全 — 已完成（基础版）
1. 调用 analyze IPC：`interactiveRoleplay.analyzeChapter` 已接入，失败时可重试。
2. 聊天消息 UI：ReaderChatSidebar 具备消息列表、输入框、加载/禁用状态。
3. 会话管理：按章节+角色维度维护历史，切换角色/章节会重置。
4. 状态同步：角色选择、初始化/错误提示、输入可用性已覆盖。

### D. 测试与验证
1. 单元/集成：
   - 解析函数（normalize characters）、prompt builder（占位符替换）。
   - IPC handler 输入验证与 JSON 解析错误分支。
2. 手动测试用例：
   - 长章节/空章节；无角色返回；切换章节/角色；网络错误/LLM 超时。

## 依赖与风险
- LLM 配额与速率限制：需要节流与重试策略。
- token 上限：长章节需摘要或截断。
- UI 流式回调：若无现成流式封装，先实现非流式 MVP。

## 里程碑
1) MVP：完成 analyze IPC + 非流式聊天发送/接收 + 基础 UI（输入框/消息列表/角色切换）。✅
2) 增强：流式输出、缓存、摘要、会话持久化（可写入本地 DB）。
