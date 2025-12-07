# 交互式角色扮演（Chat）实现计划

## 目标
在阅读器中为当前章节提供角色扮演聊天能力。当用户点击 ReaderHeader 的“聊天”按钮时：
1) 后台调用 LLM 使用 `electron/main/api/llm/prompts/interactive_roleplay/analyze.md` 对当前章节进行角色分析并返回 JSON；
2) 解析分析结果，填充 `electron/main/api/llm/prompts/interactive_roleplay/chat.md` 的变量；
3) 将用户在前端侧边栏的消息与角色扮演对话上下文交给 LLM，实时返回消息供前端显示。

## 现状概览
- 前端：已有聊天侧栏 UI（ReaderChatSidebar），点击聊天按钮可触发初始化调用并展示角色列表（基于前端 mock/空实现）。
- 类型和服务：`src/types/roleplay.ts` 定义了角色分析结果结构；`src/services/interactiveRoleplay.ts` 负责调用 `window.api.interactiveRoleplay.analyzeChapter` 并解析角色列表。
- Electron preload：已暴露 `interactiveRoleplay.analyzeChapter` IPC 调用，但主进程未实现具体 handler。
- LLM 提示：分析 prompt 与聊天 prompt 已存在对应 md 文件。

## 待解决的核心问题
1) 主进程缺少 IPC handler：需要实现 `interactive-roleplay:analyze`，调用 LLM 执行章节分析，返回 JSON（characters 数组）。
2) 聊天消息链路未接：角色扮演聊天的 prompt 注入与消息传递尚未实现（包括角色选择、章节上下文与用户输入）。
3) 状态持久化与缓存策略：按章节缓存角色分析结果，避免重复调用；聊天历史的存储/回放策略待定。
4) 错误处理与 UI 回退：LLM 超时/解析失败时的用户提示、重试与降级方案未完备。

## 详细计划
### A. 章节角色分析 IPC（Backend）
1. 新增 main 侧 handler：
   - 路由：`interactive-roleplay:analyze`。
   - 入参：`{ bookId, bookTitle, chapterId, chapterTitle, bookContent }`。
   - 验证：空字符串/超长文本截断（防止 token 过长）。
2. Prompt 构造：
   - 使用 `interactive_roleplay/analyze.md` 填入 `{book_content}`。
   - 指定模型、温度、最大输出（确保 JSON 可控）。
3. 调用 LLM（复用现有 fetch/模型配置或封装一个 shared llm client）。
4. 解析响应：
   - 去除 markdown 包裹。
   - `JSON.parse` characters 数组；必要时容错（字符串化 catchphrases 等）。
   - 若无有效角色，抛出可读错误。
5. 缓存/节流（可选的 MVP）：内存按 `bookId+chapterId` 缓存最近一次结果，前端已有缓存但后端可再加一层以减压。
6. 错误路径：记录日志，返回结构化错误信息给 renderer。

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
