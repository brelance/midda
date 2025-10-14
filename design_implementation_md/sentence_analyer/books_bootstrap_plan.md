# 启动时恢复书籍数据计划

## 目标
应用重启后，自动从数据库恢复 `books` 表中已有的书籍信息（及必要的章节/进度数据），替换当前仍依赖的内存 mock 数据，实现真正的持久化书架体验。

## 现状评估
- 前端 `App.tsx` 初始化时使用 `mockBooks` 作为默认状态，未读取数据库。
- Electron preload 暴露了 `db.books.getAll`、`db.chapters.getByBook` 等接口，可直接调用。
- Redux/状态管理仅在内存中维护书籍和阅读状态，缺乏“持久化 → 内存” 的同步逻辑。
- 需要在 Reader 流程中保证章节、阅读进度也能按需恢复。

## 实施步骤
1. **移除 mock 初始化**
   - 将 `App.tsx` 的 `useState(mockBooks)` 改为默认空数组。
   - 在 `useEffect` 中读取数据库，完成后更新 state。
2. **加载书籍列表**
   - 调用 `window.api.db.books.getAll()` 获取书籍记录。
   - 将 `LibraryBookRecord` 转换为前端 `Book` 类型（处理日期、可选字段）。
3. **补充章节与进度**
   - 对于进入阅读器后的书籍，在需要时调用 `db.chapters.getByBook` 拉取章节内容。
   - 拉取 `readingPositions.get` 填充进度，并同步 `Book.progress`。
4. **错误处理与空态**
   - 加载失败时提供用户提示，同时保留重试机制。
   - 数据库为空时正确显示空书架。
5. **测试与回归**
   - 导入多本书 → 重启应用 → 验证书籍与目录恢复。
   - 确保句子分析、阅读进度等功能仍正常。
