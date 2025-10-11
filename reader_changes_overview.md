# Reader Page Integration — Key Code Changes

## 1. 阅读器页面骨架

- `src/pages/ReaderPage/ReaderPage.tsx`: 新增阅读页容器组件，负责选择章节、滚动进度计算、工具栏显隐与键盘快捷键，内置占位章节内容以便后续对接 EPUB。
- `src/components/reader/ReaderLayout.tsx`, `ReaderHeader.tsx`, `ReaderFooter.tsx`, `ReaderContent.tsx`, `ReaderProgress.tsx`, `ReaderBookInfo.tsx`: 复刻 `reader3.html` 的布局，将顶部/底部工具栏与正文拆分成可复用模块，并与现有 `BrutalistButton`、`ProgressBar` 样式保持一致。
- `src/assets/style.css`: 为 `.reading-content` 增补字体/权重配置，确保正文排版与原型一致。

## 2. 状态管理与交互逻辑

- `src/hooks/useReaderToolbarVisibility.ts`: 提供工具栏显隐的封装逻辑，监听鼠标/触摸位置并在闲置后自动隐藏。
- `src/hooks/useReaderShortcuts.ts`: 捕获方向键、PageUp/Down、Esc、T 等快捷键，实现章节跳转与退出书架。
- `src/utils/reader/chapterUtils.ts`, `progressUtils.ts`: 封装章节索引与滚动进度推导，支撑阅读页的进度同步。

## 3. 应用集成

- `src/App.tsx`: 引入 `ReaderPage`，在选择“开始阅读”后进入阅读模式，并将章节/进度回写到选中书籍；扩展 mock 数据以包含章节内容。
- `src/components/layout/Layout.tsx`, `MainContent.tsx`, `src/components/mainContent/Header.tsx`: 给“书架”界面添加 `onEnterReader` 回调与“开始阅读”按钮，确保桌面端可以直接切换到阅读器。

## 4. 类型与数据结构

- `src/types/types.ts`: 为 `Book` 增加 `currentChapterId`、`lastReadChapterId` 字段，便于持久化阅读位置。
- `src/types/reader.ts`: 定义阅读器专用的状态/回调接口，方便后续在多处消费阅读器数据。
