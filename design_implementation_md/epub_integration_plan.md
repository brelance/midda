# EPUB 文件读取与集成设计方案

## 概述

设计 Electron 后端功能，使用 Node 端的 epub 库读取 EPUB 文件，解析封面信息，并与前端 React 应用集成，实现用户添加书籍功能。

## 技术栈

- **前端**: React + TypeScript
- **后端**: Electron + Node.js
- **EPUB 解析**: epub
- **通信**: IPC (Inter-Process Communication)

## 系统架构设计

### 1. 前端组件设计

#### 1.1 添加书籍按钮组件

```typescript
// src/components/AddBookButton.tsx
interface AddBookButtonProps {
  onBookAdded: (bookData: EpubBookData) => void;
}

interface EpubBookData {
  id: string;
  title: string;
  author: string;
  cover: string; // base64编码的封面图片
  chapters: Chapter[];
  metadata: EpubMetadata;
}
```

#### 1.2 书籍导入流程组件

- 显示添加书籍按钮
- 处理 Electron 返回的 EPUB 数据
- 验证和格式化数据
- 更新应用状态

### 2. Electron 后端设计

#### 2.1 主进程文件结构

基于现有的 `/electron` 目录结构：

```
electron/
├── main/
│   ├── main.ts            # Electron主进程
│   ├── main_b.ts         # 备用主进程
│   ├── api/
│   │   ├── db/           # 数据库相关API
│   │   └── llm/          # LLM相关API
│   └── utils/
│       └── proxy.ts      # 代理工具
├── preload.ts            # 预加载脚本
├── electron-env.d.ts      # Electron环境类型定义
└── 新增文件：
├── main/api/
│   └── epub/             # EPUB相关API
│       ├── epub.api.ts    # EPUB API处理器
│       └── epubService.ts # EPUB文件处理服务
└── main/utils/
    └── epubParser.ts     # EPUB解析工具
```

#### 2.2 IPC 通信接口设计

基于现有的 preload.ts API 结构：

```typescript
// 在现有api对象中添加epub模块
const api = {
  // 现有API保持不变...

  epub: {
    selectFile: () => ipcRenderer.invoke("epub:select-file"),
    parseFile: (filePath: string) =>
      ipcRenderer.invoke("epub:parse-file", filePath),
    getCover: (filePath: string) =>
      ipcRenderer.invoke("epub:get-cover", filePath),
  },
};
```

#### 2.3 主进程集成设计

```typescript
// 在main.ts中添加EPUB处理器
import { setupEpubApiHandler } from "./api/epub/epub.api";

app.whenReady().then(() => {
  // 现有代码保持不变...

  registerDbHandlers();
  setupTokensApiHandler();
  setupWordDetailApiHandler();
  setupWordDictApiHandler();

  // 新增EPUB处理器
  setupEpubApiHandler();

  createWindow();
});
```

### 3. EPUB 处理服务设计

#### 3.1 EPUBService 类

```typescript
class EPUBService {
  async selectEpubFile(): Promise<string>;
  async parseEpubFile(filePath: string): Promise<EpubBookData>;
  async extractCover(epub: any): Promise<string>;
  async extractMetadata(epub: any): Promise<EpubMetadata>;
  async extractChapters(epub: any): Promise<Chapter[]>;
}
```

#### 3.2 数据结构定义

```typescript
interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  language: string;
  publisher?: string;
  identifier: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  href: string;
  order: number;
}
```

## 详细实现步骤

### 阶段 1: 环境准备和依赖安装

1. **安装必要的依赖包**

   ```bash
   yarn add epub jszip file-type
   # epub 包未提供官方类型定义，如需静态类型可在项目内编写声明文件
   ```

2. **配置 Electron 构建和 TypeScript(项目已配置完成，跳过这步骤)**
   - 更新`tsconfig.json`支持 Electron 相关类型
   - 配置 Vite 构建适配 Electron

### 阶段 2: Electron 后端开发

1. **创建预加载脚本** (`src-electron/preload.ts`)

   - 暴露安全的 API 给渲染进程
   - 定义 IPC 通信接口

2. **实现 EPUB 服务** (`src-electron/services/epubService.ts`)

   - 集成 epub 库
   - 实现文件选择和解析逻辑
   - 封面提取和 base64 编码

3. **更新主进程** (`src-electron/main.ts`)
   - 注册 IPC 处理器
   - 设置窗口管理和安全策略

### 阶段 3: 前端集成开发

1. **创建添加书籍组件** (`src/components/AddBookButton.tsx`)

   - 实现文件选择触发
   - 处理 EPUB 数据接收
   - 显示加载状态和错误处理

2. **更新应用状态管理** (`src/App.tsx`)

   - 集成新的书籍添加功能
   - 更新 Book 类型定义
   - 添加 EPUB 数据处理逻辑

3. **更新书籍显示组件**
   - 支持 EPUB 封面显示
   - 处理 base64 图片渲染
   - 更新网格布局适配新数据

### 阶段 4: 错误处理和用户体验优化

1. **错误处理机制**

   - EPUB 文件格式验证
   - 文件损坏处理
   - 用户友好的错误提示

2. **用户体验优化**
   - 加载状态指示器
   - 进度条显示
   - 成功添加的反馈动画

### 阶段 5: 数据持久化

1. **本地存储设计**

   - EPUB 元数据缓存
   - 封面图片本地存储
   - 阅读进度跟踪

2. **数据管理优化**
   - 防止重复添加
   - 书籍信息更新机制
   - 存储空间管理

## 具体代码实现要点

### 1. 预加载脚本关键代码

基于现有的 `/electron/preload.ts` 结构：

```typescript
// electron/preload.ts - 在现有api对象中添加epub模块
const api = {
  // 现有API保持不变：ai, wordDetail, db...

  // 新增EPUB模块
  epub: {
    selectFile: (): Promise<string> => ipcRenderer.invoke("epub:select-file"),
    parseFile: (filePath: string): Promise<EpubBookData> =>
      ipcRenderer.invoke("epub:parse-file", filePath),
    getCover: (filePath: string): Promise<string> =>
      ipcRenderer.invoke("epub:get-cover", filePath),

    // 监听器（如果需要异步通知）
    onParseProgress: (callback: (progress: any) => void) =>
      ipcRenderer.on("epub:parse-progress", (_, progress) =>
        callback(progress)
      ),

    cleanupEpubListeners: () => {
      ipcRenderer.removeAllListeners("epub:parse-progress");
    },
  },
};

// 前端调用方式：window.api.epub.selectFile()
```

### 2. EPUB 服务核心逻辑

基于现有的 API 结构模式：

```typescript
// electron/main/api/epub/epub.api.ts
import { ipcMain, dialog } from "electron";
import { EPUBService } from "./epubService";

export function setupEpubApiHandler() {
  const epubService = new EPUBService();

  ipcMain.handle("epub:select-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "EPUB Files", extensions: ["epub"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("epub:parse-file", async (_, filePath: string) => {
    try {
      return await epubService.parseEpubFile(filePath);
    } catch (error) {
      console.error("EPUB解析失败:", error);
      throw error;
    }
  });

  ipcMain.handle("epub:get-cover", async (_, filePath: string) => {
    try {
      return await epubService.extractCover(filePath);
    } catch (error) {
      console.error("封面提取失败:", error);
      throw error;
    }
  });
}

// electron/main/api/epub/epubService.ts
import EPub from "epub";
import { promises as fs } from "fs";
import path from "path";

export class EPUBService {
  async parseEpubFile(filePath: string): Promise<EpubBookData> {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);

      epub.on("end", async () => {
        try {
          const metadata = await this.extractMetadata(epub);
          const cover = await this.extractCover(epub);
          const chapters = await this.extractChapters(epub);

          resolve({
            id: this.generateId(filePath),
            title: metadata.title,
            author: metadata.creator,
            cover,
            chapters,
            metadata,
            filePath, // 保存原始文件路径
            addedDate: new Date(),
          });
        } catch (error) {
          reject(error);
        }
      });

      epub.on("error", reject);
      epub.parse();
    });
  }

  private generateId(filePath: string): string {
    return Buffer.from(filePath + Date.now())
      .toString("base64")
      .slice(0, 16);
  }
}
```

### 3. 前端集成关键代码

基于现有的 API 调用方式：

```typescript
// src/components/AddBookButton.tsx
const AddBookButton: React.FC<AddBookButtonProps> = ({ onBookAdded }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddBook = async () => {
    try {
      setIsLoading(true);

      // 1. 选择EPUB文件
      const filePath = await window.api.epub.selectFile();
      if (!filePath) {
        return; // 用户取消选择
      }

      // 2. 解析EPUB文件
      const bookData = await window.api.epub.parseFile(filePath);

      // 3. 调用父组件回调
      onBookAdded(bookData);
    } catch (error) {
      console.error("添加书籍失败:", error);
      // 显示用户友好的错误提示
      alert("添加书籍失败，请检查文件格式是否正确");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddBook}
      disabled={isLoading}
      className="brutalist-button"
    >
      {isLoading ? "正在添加..." : "添加书籍"}
    </button>
  );
};

// 更新类型定义以匹配现有结构
// src/types/types.ts
export interface EpubBookData extends Book {
  filePath: string; // EPUB文件路径
  metadata: EpubMetadata;
  chapters: Chapter[];
}

export interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  language: string;
  publisher?: string;
  identifier: string;
}
```

```

## 测试计划

### 1. 单元测试
- EPUB解析功能测试
- IPC通信测试
- 数据格式验证测试

### 2. 集成测试
- 前后端数据流测试
- 用户体验流程测试
- 错误场景测试

### 3. 性能测试
- 大文件解析性能
- 内存使用优化
- 启动时间测试

## 部署和发布

### 1. 构建配置
- Electron打包配置
- 跨平台兼容性
- 代码签名和公证

### 2. 发布策略
- 自动更新机制
- 版本管理
- 用户数据迁移

## 后续扩展功能

### 1. 高级EPUB功能
- 书签管理
- 笔记系统
- 搜索功能

### 2. 多格式支持
- PDF支持
- TXT支持
- MOBI支持

### 3. 云同步功能
- 阅读进度同步
- 设置同步
- 多设备支持
```
