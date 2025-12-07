# 交互式角色扮演（Chat）实现计划

## 目标
在阅读器中为当前章节提供角色扮演聊天能力。当用户点击 ReaderHeader 的“聊天”按钮时：
1) 后台调用 LLM 使用 `electron/main/api/llm/prompts/interactive_roleplay/analyze.md` 对当前章节进行角色分析并返回 JSON；
2) 解析分析结果，填充 `electron/main/api/llm/prompts/interactive_roleplay/chat.md` 的变量；
3) 将用户在前端侧边栏的消息与角色扮演对话上下文交给 LLM，实时返回消息供前端显示。

## 现状概览
- 前端：已有聊天侧栏 UI（ReaderChatSidebar），点击聊天按钮可触发初始化调用并展示角色列表。
- 类型和服务：`src/types/roleplay.ts` 定义角色分析结果结构；`src/services/interactiveRoleplay.ts` 调用真实 `interactiveRoleplay.analyzeChapter` 并解析角色列表。
- Electron preload：已暴露 `interactiveRoleplay.analyzeChapter` IPC。
- 主进程：已实现 `interactive-roleplay:analyze`，支持章节内容可选截断、读取 analyze prompt，并返回标准化角色列表。
- LLM 提示：分析 prompt 与聊天 prompt 已存在对应 md 文件。

## 待解决的核心问题
1) 聊天消息链路未接：角色扮演聊天的 prompt 注入与消息传递尚未实现（包括角色选择、章节上下文与用户输入）。
2) 状态持久化与缓存策略：按章节缓存角色分析结果，避免重复调用；聊天历史的存储/回放策略待定。
3) 错误处理与 UI 回退：LLM 超时/解析失败时的用户提示、重试与降级方案未完备。

## 详细计划
### A. 章节角色分析 IPC（Backend） — 已完成
1. `interactive-roleplay:analyze` 已实现：验证入参、对超长章节按阈值截断、读取 analyze prompt、调用 LLM。
2. 解析响应：去掉 markdown 包裹，标准化 characters 列表，若为空抛出错误。
3. 前端已接 IPC；可后续再补内存缓存/节流。

### B. 角色扮演聊天消息链路
1. 定义 IPC：
   - `interactive-roleplay:startSession`（可选，用于预热与上下文构造）。
   - `interactive-roleplay:sendMessage`：入参包含 `characterProfile`（从分析结果选择）、`chapterContentOrSummary`、`bookTitle`、`currentChapterTitle`、`targetLanguage`、`userProficiencyLevel`、历史对话（如需要）。
2. Prompt 组装：
   - 使用 `interactive_roleplay/chat.md`，填充角色信息与上下文。
   - 保持“只知道当前章节”约束，必要时对章节内容做摘要以节约 token。
3. 流式/非流式返回：
   - 若已有流式基础设施（类似 Gemini tokens），复用 on*/subscribe 模式；否则先实现非流式响应，后续再加流式。
4. 会话管理：
   - 生成 sessionId，缓存最近 N 条对话，支持角色切换重新开局。
   - 清理：窗口关闭或章节变更时清除 session。

### C. 前端集成补全
1. 调用 analyze IPC：`interactiveRoleplay.analyzeChapter` 已就绪；确保失败时 UI 展示错误并可重试（已有）。
2. 聊天消息 UI：
   - 为 ReaderChatSidebar 增加消息列表与输入框；在角色选择下方显示对话；发送时禁用按钮并显示 loading。
3. 会话管理：
   - 按章节+角色创建 session，切换角色新建会话；章节切换清理现有会话。
4. 状态同步：
   - 展示当前角色名、提示 loading/错误；若分析未完成禁用输入。

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
1) MVP：完成 analyze IPC + 非流式聊天发送/接收 + 基础 UI（输入框/消息列表/角色切换）。
2) 增强：流式输出、缓存、摘要、会话持久化（可写入本地 DB）。
