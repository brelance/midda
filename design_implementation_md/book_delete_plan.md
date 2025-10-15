# 图书删除功能任务分解

## 目标
- 为书架书籍卡片提供悬浮删除入口，支持一键移除书籍。
- 删除操作需同步清理数据库记录与本地 EPUB 备份文件，保持数据一致性。

## 实现步骤
1. **分析现有数据流**：确认 `BookItem → BookGrid → MainContent → Layout → App` 的层级关系以及 `window.api` 提供的数据库/文件接口。
2. **补充 UI 交互**：在 `BookItem` 上新增悬浮删除按钮，确保点击不会触发选中/进入阅读事件，移动端可通过 `focus` 展示。
3. **扩展 IPC 能力**：在 `electron/preload.ts` 和 `electron/main/api/epub/epub.api.ts` 中暴露 `epub:remove-from-library`，以便渲染进程清理 EPUB 副本。
4. **实现删除逻辑**：在 `App.tsx` 中编写 `handleDeleteBook`，顺序调用 `db.books.delete`、`db.chapters.deleteByBook` 与 `epub.removeFromLibrary`，并同步更新本地状态（含选中/阅读中的书籍）。
5. **向下传递回调**：将删除回调经由 `Layout`、`MainContent`、`BookGrid` 传递到 `BookItem`，完成前后端联动。
6. **验证与回归**：手动导入书籍后执行删除，观察 UI 状态与数据库/本地文件是否同步清理；运行 ESLint/TypeScript 检查（若脚本失效需调整命令）。

## 验证建议
- [ ] 导入一本全新书籍后执行删除，确认卡片消失、详情面板关闭。
- [ ] 检查数据库（`language-data.db`）中 `books` 与 `chapters` 表是否已无该书记录。
- [ ] 检查 `userData/library/epub/<bookId>.epub` 是否被移除。
- [ ] 重新打开应用或刷新页面，确认已删除书籍不会重新出现。

## 后续可选优化
- 删除前弹出确认提示，避免误操作。
- 根据删除结果给出 Toast/通知，替代 `alert`。
- 批量删除或拖拽到回收站等高级交互。
