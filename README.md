<div align="center">

# Midda

**让你想读的故事，成为你学会的语言。**

面向语言学习的 AI 桌面阅读器 · 原文精读 · 漫画 OCR · 生词复习 · 角色对话

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

[功能亮点](#功能亮点) · [开始使用](#开始使用) · [服务配置](#服务配置) · [参与开发](#参与开发)

</div>

🎬 **26 秒了解 Midda**

https://github.com/user-attachments/assets/741c237c-b729-478e-8741-dab550248485

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

账号功能通过 Supabase 接入 Google / Apple OAuth：

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

需要在 Supabase 中启用相应提供方，并允许回调地址 `midda://auth-callback`。这两个变量由 Vite 在构建时注入，修改后需要重启开发进程或重新打包。当前阅读与学习数据保存在本地，账号登录不代表已实现跨设备同步。

## 数据存在哪里

书籍副本保存在 Electron 用户数据目录下的 `library/`，书架、阅读进度、生词与复习记录保存在 `language-data.db`。本地词典 `jmdict.db` 是独立的资源文件。

AI 功能会向所配置的模型服务发送待分析的文本或对话；PaddleOCR 会上传待识别的页面图片，Edge TTS 会发送待朗读的文本。macOS Vision 在本地完成识别。

## 参与开发

Midda 使用 **Electron + React + TypeScript + Vite**，通过 Zustand 管理界面状态、SQLite 持久化阅读与学习数据，使用 PDF.js 渲染 PDF。

```text
src/
├── pages/                书架、EPUB 阅读器、图片阅读器、生词本与账号
├── components/reader/    精读面板、OCR 文字层、目录与阅读设置
├── stores/               Zustand 状态管理
├── services/             请求队列、词典与角色对话服务
└── utils/                SM-2 算法、语言识别与阅读工具
electron/
├── main/api/             书籍、数据库、LLM、OCR、TTS 与认证
└── preload.ts            渲染进程与主进程之间的 API 桥接
scripts/
└── import-jmdict.ts       本地词典导入
```

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动桌面开发环境 |
| `npm run lint` | 执行 ESLint 检查 |
| `npm run import-jmdict` | 下载并生成本地日语词典 |
| `npm run rebuild-native` | 为 Electron 重建原生依赖 |
| `npm run build` | 类型检查、前端与主进程构建、应用打包 |

打包产物输出到 `release/<version>/`。构建前应先生成本地词典；macOS 构建会自动编译 Vision OCR 二进制。配置中包含 DMG、Windows NSIS 和 Linux AppImage 目标，但当前 OCR 资源打包仍依赖 macOS 二进制，Windows / Linux 打包需要先调整 `electron-builder.json5` 中的对应资源配置。

欢迎通过 [Issues](https://github.com/brelance/midda/issues) 分享阅读体验、反馈问题，或提交 Pull Request。反馈导入、OCR 或精读问题时，附上操作系统、文件格式、复现步骤和可公开的最小样本，会更便于定位。

感谢 [JMdict / EDRDG](https://www.edrdg.org/)、[jmdict-simplified](https://github.com/scriptin/jmdict-simplified)、[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 及项目依赖的开源工具。词典与例句数据的使用和分发需遵循各自来源的许可。
