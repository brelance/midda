# Sentence Analyzer 迁移计划

## 背景
- 现有 `SentenceAnalyzer` 组件从字幕项目迁移到 EPUB 阅读器，需要抛弃基于视频字幕的依赖。
- 新环境以书籍和章节为核心实体，因此需要重构类型定义和组件接口以匹配新的语义。

## 已完成
- 更新 `SentenceAnalyzer` 属性签名，改为接收 `text` 与 `bookId`，移除字幕节点依赖。
- 调整 `AnalysisLine` 以传递新的属性结构，并提供缺省的 token 列表。
- 在 `src/types/types.ts` 中新增 `SentenceAnalysisRecord`，并保留旧的 `SubtitleLineData` 供遗留模块过渡。

## 下一步
- 设计与实现用于电子书语句分析结果的持久化 API（主进程与 `window.api` 类型）。
- 为句子分析添加最小化的单元测试或数据校验逻辑，确认 token 结构在新上下文下的健壮性。
- 将阅读器 UI 中的句子渲染与分析入口接入 `AnalysisLine`/`SentenceAnalyzer` 新接口，完成端到端联调。
