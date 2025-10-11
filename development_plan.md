# Reader3 页面实现计划

## 1. 目标与范围
- 在现有 Electron + React + Tailwind 项目中复刻 `backup/reader3.html` 的阅读体验，保持昭和复古粗野主义视觉风格与交互（顶部/底部工具栏悬浮、内容滚动、阅读进度控制）。
- 与当前书架界面（`@/components/layout/Layout.tsx`）共享 `Book` / `Chapter` 类型数据，支持从选中书籍进入阅读器、返回书架的流转。
- 预留后续 EPUB 集成（`epub_integration_plan.md`）所需的章节导航、进度更新、阅读设置入口。

## 2. 组件拆分与职责
- `@/pages/ReaderPage/ReaderPage.tsx`：阅读页面容器，负责加载书籍/章节数据、协调头尾工具栏显隐、处理章节跳转与进度回写。
- `@/components/reader/ReaderLayout.tsx`：包裹 Header / Content / Footer 的布局组件，处理全屏高度、背景与响应式断点。
- `@/components/reader/ReaderHeader.tsx`：顶部工具栏；包含返回书架、目录按钮、搜索/设置入口与当前书籍信息展示。按钮复用 `@/components/ui/BrutalistButton`.
- `@/components/reader/ReaderBookInfo.tsx`：在 Header 中展示书名与章节名称，负责多行截断与响应式隐藏。
- `@/components/reader/ReaderContent.tsx`：渲染章节正文，处理滚动容器、字体/行距设置、后续支持动态注入的高亮等。
- `@/components/reader/ReaderFooter.tsx`：底部工具栏；包含上一章/下一章按钮与进度条区域。进度条复用 `@/components/ui/ProgressBar`.
- `@/components/reader/ReaderProgress.tsx`：包装进度百分比显示与 `ProgressBar`，抽离样式逻辑，便于未来扩展书签或页码。
- `@/hooks/useReaderToolbarVisibility.ts`：封装顶部/底部工具栏显隐逻辑，监听鼠标或触摸事件，将状态暴露给 `ReaderPage`.
- `@/hooks/useReaderShortcuts.ts`（可选）: 处理键盘快捷键（方向键翻页、Esc 返回等），与 Header/ Footer 回调协同。

## 3. 数据与状态流设计
- **输入数据**：`ReaderPage` 接收 `bookId` 与可选 `chapterId`（来自路由参数或父组件）；通过共享状态（未来可迁移至 Zustand/Context）拉取 `Book` 对象及章节列表。
- **本地状态**：
  - `currentChapterIndex` / `currentChapter`：驱动正文展示与上下章按钮状态。
  - `isHeaderVisible` / `isFooterVisible`：由 `useReaderToolbarVisibility` 控制，支持鼠标移动与触摸唤出。
  - `readingProgress`：根据章节阅读进度或滚动百分比计算，变更时回调父级以同步到 `Book.progress`.
  - `isTocOpen`、`isSettingsOpen`（预留）：触发弹层或侧滑面板，可复用已有 `DraggablePopup` 组件。
- **向上回调**：`onExitReader` 返回书架、`onProgressChange` 写入阅读进度、`onChapterChange` 更新最近阅读章节。保持与 `Layout`/`App` 现有状态管理兼容。
- **副作用**：监听窗口尺寸调整处理移动端展示；滚动侦听用于进度计算与工具栏显隐的阈值控制。

## 4. 目录结构规划
```
@/src
├─ pages/
│  └─ ReaderPage/
│     ├─ ReaderPage.tsx
│     ├─ readerPage.module.css (如需拆分 Tailwind 无法覆盖的样式)
│     └─ index.ts
├─ components/
│  └─ reader/
│     ├─ ReaderLayout.tsx
│     ├─ ReaderHeader.tsx
│     ├─ ReaderBookInfo.tsx
│     ├─ ReaderContent.tsx
│     ├─ ReaderFooter.tsx
│     └─ ReaderProgress.tsx
├─ hooks/
│  ├─ useReaderToolbarVisibility.ts
│  └─ useReaderShortcuts.ts (可选)
├─ types/
│  └─ reader.ts（补充阅读器专用类型，如 ReaderState、ReaderControls）
└─ utils/
   └─ reader/
      ├─ chapterUtils.ts（章节排序、索引查找）
      └─ progressUtils.ts（滚动/章节进度计算）
```

## 5. 实现步骤
- Step 1：梳理 `Book` / `Chapter` 现有数据结构，补充阅读页需要的字段（当前章节、章节内容、进度）并在 `@/types/types.ts` 或新增 `reader.ts` 中定义辅助接口。
- Step 2：在 `pages/ReaderPage` 中搭建基础框架，集成 `ReaderLayout`、预置静态章节数据，确保 Tailwind 样式还原原型页面（工具栏固定、正文滚动）。
- Step 3：实现 `ReaderHeader` 与 `ReaderFooter`，使用 `BrutalistButton`、`ProgressBar` 等现有组件复刻交互与视觉；补齐 SVG 图标可通过 `src/assets` 引入或复用现有图标方案。
- Step 4：编写 `ReaderContent` 文本区域与排版样式（字体、字号、行距、滚动隐藏滚动条），验证不同屏幕尺寸的响应式表现。
- Step 5：开发 `useReaderToolbarVisibility`，实现鼠标/触摸进入上下 100px 区域时显示工具栏、离开时隐藏；将状态传递给 Header/Footer 控制 `translateY` 动效。
- Step 6：补充章节跳转与进度计算逻辑（`ReaderProgress` + `progressUtils`），上一章/下一章按钮根据索引禁用，并通过回调更新父级进度。
- Step 7：在 `App.tsx` 中接入阅读页入口：可引入 `react-router-dom` 创建 `/read/:bookId` 路由，或在现有 `Layout` 中添加 `ReaderPage` 模式切换；实现“返回书架”调用 `onExitReader`.
- Step 8：编写基础单元测试或组件故事（如使用 Storybook）验证核心交互；在 Electron 环境下运行 `yarn dev` 进行人工验收。
- Step 9：文档与后续 TODO 更新（例如阅读设置弹层、章节目录抽屉、与 EPUB 解析服务联动）。

## 6. 复用与后续考虑
- 直接复用：`@/components/ui/BrutalistButton.tsx`、`@/components/ui/ProgressBar.tsx`、`@/components/DraggablePopup.tsx`（用于目录/设置弹窗）以及全局 Tailwind 主题变量确保视觉一致。
- 样式保持使用 Tailwind + 自定义类（参考 `reader3.html` 中的 border/shadow/transition），仅在必要时通过 CSS 模块增强。
- 未来接入 EPUB：利用 `@/services` 下的解析/请求工具，将章节 HTML 注入 `ReaderContent`；在 `reader.ts` 中扩展 `ReaderState` 以兼容异步加载状态与错误处理。
- 性能与无障碍：关注长章节的虚拟滚动潜在需求；为主要按钮添加 `aria-label`，保证键盘可访问性。
