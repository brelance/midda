<div align="center">

# Midda

**让你想读的故事，成为你学会的语言。**

面向语言学习的 AI 桌面阅读器 · 原文精读 · 漫画 OCR · 生词复习 · 角色对话 · 阅读社区

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?logo=springboot&logoColor=white)

[功能亮点](#功能亮点) · [开始使用](#开始使用) · [服务配置](#服务配置) · [技术栈](#技术栈) · [参与开发](#参与开发)

</div>

🎬 **26 秒了解 Midda**

https://github.com/user-attachments/assets/9073fee5-4a62-4482-81ed-f6f492ba465c

读原版小说时，一个生词让你离开故事；看日语漫画时，一句台词连复制查词都做不到。Midda 把阅读与理解放在同一个窗口：打开喜欢的书，遇到不懂的地方就地查阅，再把读过的词带进下一次复习。

目前以**日语精读**为核心，支持 EPUB、PDF、CBZ、CBR，以及装有图片的 ZIP 漫画包。项目正在持续开发，建议优先在 macOS 上体验；Windows / Linux 的原生 OCR 尚未实现。

## 功能亮点

### 📖 一本书，两种节奏

想追剧情，就专心阅读；想弄懂一句话，就切到精读。EPUB 支持目录导航、滚动与分页、单页与双页，以及字体、字号、行距和主题调整，阅读进度自动保存。

精读面板把原文和词句分析并排呈现。日语分词带有假名、词性与辞书形，点击单词即可查看释义，需要时再请求 AI 解释它在当前语境中的含义与活用。

### 💬 漫画里的台词，也能拿来学

PDF 和漫画阅读器提供三种模式，按需要切换：

| 模式 | 适合什么时候用 |
| --- | --- |
| **浏览** | 专心看原始页面，使用缩放、单页或连续滚动阅读 |
| **文字** | 通过 OCR 在页面上叠加可选择的文字，方便提取台词 |
| **精读** | 对照原始画面与识别文本，继续分词、查词和朗读 |

OCR 可选 macOS 本地 Vision 或 PaddleOCR-VL 云端服务。漫画中的图片文字，也能接入与电子书相同的学习流程。

### 🔎 查到词义，也看懂语境

本地 **JMdict** 日语词典提供词条、英文释义与例句；AI 补充当前句子里的中文解释。遇到「食べた」这样的活用形式，可以结合辞书形「食べる」查阅，不必只靠表面词形猜意思。

本地词典需要单独导入；AI 分词与解释需要配置模型服务。当前也有中、英、韩文分词提示词，日语的词典与精读配套更完整。

### 🧠 让查过的词，留在记忆里

在精读中点击单词，会自动将它收集到生词本，并保留来源书籍与原句。复习时重新遇见它出现过的语境，再按掌握程度评分，由 **SM-2 间隔重复算法**安排下次复习。

### 🎧 读一句，也听一句

支持单词与句子朗读、连续播放、语速调整，以及系统语音和 Edge TTS 两种引擎。日语读音可以直接听，不必离开阅读窗口。

### 🎭 和故事里的人聊一聊

在 EPUB 中分析当前章节的角色，选择人物并展开对话。把刚读过的内容变成交流的话题，在故事的上下文中练习表达。

## 开始使用

### 从源码启动

推荐使用 **Node.js 22 LTS（22.13 或更新的 22.x 版本）** 与 npm。安装依赖涉及 `better-sqlite3` 等原生模块；macOS 本地 OCR 还需要 Xcode Command Line Tools 提供的 `swift` / `swiftc`。

```bash
git clone https://github.com/brelance/midda.git
cd midda
npm install
npm run dev
```

`npm run dev` 会启动 Vite 和 Electron 桌面窗口。基础书籍导入与阅读无需配置 AI 或登录账号；精读分析、云端 OCR 等能力按需启用。

本文描述当前 `feat/iamge_reading_panel` 分支的功能。若默认分支尚未包含这些功能，可在安装依赖前运行 `git switch feat/iamge_reading_panel`。

### 第一次阅读

1. **导入一本书**：从书架添加 EPUB、PDF 或漫画文件。
2. **先读起来**：调整字号或页面缩放，从喜欢的章节开始。
3. **遇到难点再精读**：EPUB 使用精读布局；漫画 / PDF 在设置中切换到文字或精读模式，并选择 OCR 引擎。
4. **点击生词**：查释义、听发音，或请求 AI 解释当前语境。
5. **回到生词本**：带着书中的原句完成一次复习。

## 服务配置

在项目根目录创建 `.env`，只填写需要启用的服务，然后重启开发进程。以下变量名以当前代码实现为准。

### AI 分词、词义解释与角色对话

支持兼容 Chat Completions 接口的模型服务。将地址、密钥和模型名替换为你的服务配置：

```dotenv
LLM_API_KEY=your-api-key
LLM_CHAT_COMPLETIONS_URL=https://your-provider.example/v1/chat/completions
LLM_MODEL=your-model-name

# 服务不支持 response_format 时设为 false
LLM_SUPPORTS_RESPONSE_FORMAT=true
```

旧变量 `API_KEY`、`API_URL`、`MODEL_NAME` 仍兼容，推荐使用上面的 `LLM_*` 命名。模型需要能按提示返回 JSON；配置错误通常会在首次调用 AI 功能时显示。

### 漫画 / PDF OCR

| 引擎 | 配置与运行条件 |
| --- | --- |
| **macOS Vision** | 本地识别，无需 API 密钥；开发环境需要 Swift 工具链 |
| **PaddleOCR-VL 1.5** | 云端识别，需要服务令牌与网络连接 |

```dotenv
PADDLE_OCR_URL=https://paddleocr.aistudio-app.com
PADDLE_OCR_TOKEN=your-paddleocr-token
```

当前 PaddleOCR 接入使用官方异步任务接口 `/api/v2/ocr/jobs`。自定义地址也需要兼容这一协议，不能直接替换为普通 vLLM 推理地址。

### 本地日语词典

导入脚本会下载 [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) 的常用日英词典与例句，生成 `resources/jmdict.db`。需要网络、`curl` 和 `unzip`。

由于导入脚本运行在 Node.js 中，而应用运行在 Electron 中，需要在两个运行时之间重建 SQLite 原生模块。先退出开发进程，再执行：

```bash
npm rebuild better-sqlite3
npm run import-jmdict
npm run rebuild-native
npm run dev
```

完成导入后，本地词典查询无需联网；分词与 AI 解释仍使用配置的模型服务。重新导入会重建词典数据库，不会删除应用的生词本。

### 朗读与账号（可选）

朗读可在设置中选择系统语音或 Edge TTS。系统语音取决于操作系统安装的语音资源；Edge TTS 需要联网，Linux 播放还需要可用的播放器，例如 `mpv` 或 `ffplay`。

账号与阅读社区现已统一使用本仓库的 Java JWT 后端。账号页和社区共用登录状态；旧 Supabase OAuth 会话需要重新登录，本地书库保持不变。

### 阅读社区与 Java 后端

侧栏「阅读社区」支持阅读分享、分页、详情、点赞收藏、我的发布及 Markdown 心得发布。未配置后端时展示明确标识的演示内容；配置后连接真实接口，接口失败会显示错误。话题与搜索筛选已加载的分享。

后端位于 [`midda-backend/`](midda-backend/README.md)，需要 **JDK 21**；Maven Wrapper 会下载 Maven，无需单独安装。先启动 Docker，然后在项目根目录执行：

```bash
docker compose -f midda-backend/compose.yaml up -d --wait
sh midda-backend/scripts/generate-keys.sh
npm run midda-backend
```

在根目录 `.env` 配置并重启桌面应用：

```dotenv
MIDDA_API_URL=http://localhost:8080
```

后端地址不包含 `/api/v1`。Java 服务的配置、账号注册方式、OSS 发布配置及完整启动说明见 [后端 README](midda-backend/README.md)。Access / Refresh Token 仅由 Electron 主进程管理，系统支持时加密持久化；登录不会自动上传或同步本地书籍。

## 数据存在哪里

书籍副本保存在 Electron 用户数据目录下的 `library/`，书架、阅读进度、生词与复习记录保存在 `language-data.db`。本地词典 `jmdict.db` 是独立的资源文件。

AI 功能会向所配置的模型服务发送待分析的文本或对话；PaddleOCR 会上传待识别的页面图片，Edge TTS 会发送待朗读的文本。macOS Vision 在本地完成识别。

## 技术栈

Midda 由 Electron 桌面阅读器和 `midda-backend` Java 社区服务组成。本地阅读与学习数据存储在 SQLite，社区账号和帖子存储在后端 MySQL。

| 模块 | 技术与用途 |
| --- | --- |
| 桌面与界面 | Electron 41、React 18、TypeScript、Vite 5、Tailwind CSS 4；Zustand 管理界面状态 |
| 本地阅读与数据 | better-sqlite3 / SQLite、PDF.js、EPUB；JMdict 本地日语词典 |
| OCR、朗读与 AI | macOS Vision / Swift、PaddleOCR-VL、系统语音、Edge TTS、兼容 Chat Completions 的模型接口 |
| Java 后端 | Java 21、Spring Boot 3.2、Spring Web、MyBatis、MySQL 8.4 |
| 账号认证 | Spring Security、RSA 签名 JWT、Redis 刷新令牌管理；Electron IPC 与 safeStorage 管理客户端会话 |
| 缓存与异步处理 | Redis 7.4、Redisson、Caffeine、Kafka 4.1；Canal 驱动 Outbox 事件流 |
| 社区内容与检索 | 阿里云 OSS 正文直传、Elasticsearch 9.2 全文与向量检索、Spring AI 1.0 / RAG |
| 构建与本地服务 | npm、electron-builder、Maven Wrapper、Docker Compose |

OSS 发布、AI / RAG、Canal 和 Elasticsearch IK 分词需要额外配置。当前社区界面的搜索筛选已加载内容；后端全文搜索、关注和 RAG API 已迁入，尚未接入社区 UI。配置细节见 [后端 README](midda-backend/README.md)。

## 参与开发

```text
src/
├── pages/                书架、阅读器、生词本、账号与阅读社区
├── components/reader/    精读面板、OCR 文字层、目录与阅读设置
├── stores/               Zustand 状态管理
├── services/             请求队列、词典与角色对话服务
└── utils/                SM-2 算法、语言识别与阅读工具
electron/
├── main/api/             书籍、数据库、LLM、OCR、TTS 与认证
└── preload.ts            渲染进程与主进程之间的 API 桥接
scripts/
└── import-jmdict.ts       本地词典导入
midda-backend/            Java 21 社区后端、数据库结构及本地服务配置
```

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动桌面开发环境 |
| `npm run midda-backend` | 启动 Java 社区后端 |
| `npm run midda-backend:test` | 运行 Java 测试 |
| `npm run midda-backend:build` | 测试并打包 Java 后端 |
| `npm run test:community` | 验证社区与 JWT 客户端 |
| `npm run lint` | 执行 ESLint 检查 |
| `npm run import-jmdict` | 下载并生成本地日语词典 |
| `npm run rebuild-native` | 为 Electron 重建原生依赖 |
| `npm run build` | 类型检查、前端与主进程构建、应用打包 |

打包产物输出到 `release/<version>/`。构建前应先生成本地词典；macOS 构建会自动编译 Vision OCR 二进制。配置中包含 DMG、Windows NSIS 和 Linux AppImage 目标，但当前 OCR 资源打包仍依赖 macOS 二进制，Windows / Linux 打包需要先调整 `electron-builder.json5` 中的对应资源配置。

欢迎通过 [Issues](https://github.com/brelance/midda/issues) 分享阅读体验、反馈问题，或提交 Pull Request。反馈导入、OCR 或精读问题时，附上操作系统、文件格式、复现步骤和可公开的最小样本，会更便于定位。

感谢 [JMdict / EDRDG](https://www.edrdg.org/)、[jmdict-simplified](https://github.com/scriptin/jmdict-simplified)、[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 及项目依赖的开源工具。词典与例句数据的使用和分发需遵循各自来源的许可。
