# 分析模式 TTS 朗读设计方案

## 目标与范围
- 在阅读器分析模式下为句子分析面板提供逐句 TTS 朗读功能。
- 朗读控制只在 `viewMode === "analysis"` 时启用，离开分析模式或没有可朗读句子时禁用。
- 朗读队列来源于 `ReaderSentenceAnalysisPanel` 提供的句子数据，后端由 Electron 负责驱动系统 TTS。

## 现状与挑战
- 现有头部按钮仅维护本地播放状态，没有真实的朗读逻辑。
- Electron 主进程尚未暴露任何 TTS 能力，也未与前端建立 IPC 协议。
- 句子数据在 `ReaderPage` 中管理，需要梳理播放状态、队列位置与按钮交互的同步。

## Electron 后端设计

### 模块与职责
- 新增 `electron/main/api/tts` 目录，封装 `TtsController`：
  - 维护当前朗读队列、索引与状态（`idle`/`playing`/`paused`）。
  - 通过 `say`（或同类跨平台 TTS 库）调用系统语音输出。
  - 处理开始、暂停、恢复、停止与跳转指定句子的请求。
- 若 `say` 库尚未安装，需要在 `package.json` 中声明依赖并考虑离线可用的替代方案。

### IPC 协议
- `ipcMain.handle("tts:start", { sentences, startIndex?, voice?, rate? })`：启动队列播放。
- `ipcMain.handle("tts:pause")` / `"tts:resume"` / `"tts:stop"`：对应控制操作。
- `ipcMain.handle("tts:jump-to", { index })`：跳转到指定句子并开始播放。
- `BrowserWindow.webContents.send("tts:state", payload)`：向渲染进程推送状态变化，包含 `state`, `currentIndex`, `error?`。
- 关闭窗口或切换模式时需要主动调用 `stop`，同时在 `app.on("before-quit")` 中清理资源。

### 衔接 preload
- 在 `electron/preload.ts` 中新增 `api.tts` 暴露：
  ```ts
  tts: {
    start(queue, options),
    pause(),
    resume(),
    stop(),
    jumpTo(index),
    onStateChange(cb),
    cleanup()
  }
  ```
- 更新 `electron-env.d.ts` / 相关类型定义，确保前端具备类型提示。

## React 前端设计

### 状态流调整
- 在 `ReaderPage` 中新增 `analysisPlayback` 状态：
  ```ts
  { status: "idle" | "playing" | "paused", currentSentenceId?: string }
  ```
- `ReaderHeader` 改为纯展示组件，播放按钮通过 props 接收 `onToggleAnalysisPlayback`、`analysisPlaybackStatus` 等信息，去除内部 `useState`。
- 在切换到阅读模式、章节切换或退出阅读器时调用 `api.tts.stop()` 并重置状态。

### 队列构建与同步
- 点击播放：
  1. 仅在 `viewMode === "analysis"` 且存在 `sentenceItems` 时继续。
  2. 构建 `[{ id, text }]` 队列调用 `api.tts.start(queue)`。
  3. 设置本地 `status` 为 `playing`。
- 暂停/继续直接调用 `pause`/`resume` 并同步状态。
- 用户点击句子时：
  1. 在 `ReaderSentenceAnalysisPanel` 中通过新回调 `onSentenceSelect(sentenceId)` 通知 `ReaderPage`。
  2. `ReaderPage` 查找句子索引，先更新本地 `currentSentenceId`，再调用 `api.tts.jumpTo(index)`。
  3. 若当前状态为 `idle`/`paused`，调用 `api.tts.start` 或 `api.tts.resume` 以从选择处开始播放。
- 监听 `tts:state` 事件，驱动：
  - 当前句子高亮（可在 `ReaderSentenceAnalysisPanel` 中通过传入 `activeSentenceId` 实现）。
  - 错误提示与自动重试/停止逻辑。

### UI 与无障碍
- 仅在分析模式显示播放按钮；若无句子或句子仍在加载，按钮 `disabled`。
- 在播放时可考虑自动滚动至当前句子（后续增强，当前计划作为可选项）。
- 提供简易语音设置入口（速率/声音）留待后续扩展，不在本次实现范围内。
- 句子列表行支持点击触发 TTS 跳转，需在视觉上提供激活反馈（例如 hover/active 样式）。

## 实施步骤
1. **依赖与目录**：引入 `say`（或确认现有语音库），创建 `electron/main/api/tts` 目录与控制器。
2. **主进程逻辑**：实现 `TtsController`，注册 IPC 处理函数，并在窗口关闭/应用退出时确保 `stop`。
3. **Preload 暴露**：扩展 `api.tts` 接口，同时更新 TypeScript 类型声明。
4. **ReaderPage 状态管理**：引入播放状态、`useEffect` 监听 `tts:state`，在生命周期边界停止播放，并实现 `onSentenceSelect` 调用 `api.tts.jumpTo`。
5. **ReaderHeader/ReaderSentenceAnalysisPanel**：改造 props，以当前播放状态渲染按钮状态、支持句子点击跳转与高亮。
6. **集成测试**：手动验证分析模式下的播放/暂停/停止；点击句子是否正确从目标句开始朗读；切换章节与模式时是否正确清理；处理无句子/错误分支。

## 验收标准
- 在分析模式下点击播放按钮，能够逐句朗读当前章节的分析句子。
- 播放、暂停、继续、停止状态在头部按钮上实时反馈。
- 离开分析模式、切换章节或关闭阅读器时不再播放语音。
- 前端与 Electron 之间的 IPC 调用全部封装于 `api.tts`，无直接 `ipcRenderer` 调用。

## 风险与缓解
- **跨平台语音支持差异**：`say` 在不同平台表现不一致；实现时提供默认语音配置并在出错时回退到暂停状态，提示用户。
- **长文本朗读性能**：如果句子过长可能阻塞；必要时在发送队列前截断或基于标点拆分。
- **状态漂移**：确保所有入口（模式切换、组件卸载）都调用 `stop`，防止后台残留朗读。
