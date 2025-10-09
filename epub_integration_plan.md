# EPUB文件读取与集成设计方案

## 概述
设计Electron后端功能，使用epub.js库读取EPUB文件，解析封面信息，并与前端React应用集成，实现用户添加书籍功能。

## 技术栈
- **前端**: React + TypeScript
- **后端**: Electron + Node.js
- **EPUB解析**: epub.js
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
- 处理Electron返回的EPUB数据
- 验证和格式化数据
- 更新应用状态

### 2. Electron后端设计

#### 2.1 主进程文件结构
```
src-electron/
├── main.ts                 # Electron主进程
├── preload.ts             # 预加载脚本
├── services/
│   ├── epubService.ts     # EPUB文件处理服务
│   └── fileService.ts     # 文件操作服务
└── utils/
    └── epubParser.ts      # EPUB解析工具
```

#### 2.2 IPC通信接口设计
```typescript
// IPC通道定义
interface IPCChannels {
  'epub:select-file': () => Promise<string>; // 选择EPUB文件
  'epub:parse-file': (filePath: string) => Promise<EpubBookData>; // 解析EPUB
  'epub:get-cover': (filePath: string) => Promise<string>; // 获取封面
}
```

### 3. EPUB处理服务设计

#### 3.1 EPUBService类
```typescript
class EPUBService {
  async selectEpubFile(): Promise<string>
  async parseEpubFile(filePath: string): Promise<EpubBookData>
  async extractCover(epub: any): Promise<string>
  async extractMetadata(epub: any): Promise<EpubMetadata>
  async extractChapters(epub: any): Promise<Chapter[]>
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

### 阶段1: 环境准备和依赖安装
1. **安装必要的依赖包**
   ```bash
   npm install epub.js jszip file-type
   npm install -D @types/epub.js
   ```

2. **配置Electron构建和TypeScript**
   - 更新`tsconfig.json`支持Electron相关类型
   - 配置Vite构建适配Electron

### 阶段2: Electron后端开发
1. **创建预加载脚本** (`src-electron/preload.ts`)
   - 暴露安全的API给渲染进程
   - 定义IPC通信接口

2. **实现EPUB服务** (`src-electron/services/epubService.ts`)
   - 集成epub.js库
   - 实现文件选择和解析逻辑
   - 封面提取和base64编码

3. **更新主进程** (`src-electron/main.ts`)
   - 注册IPC处理器
   - 设置窗口管理和安全策略

### 阶段3: 前端集成开发
1. **创建添加书籍组件** (`src/components/AddBookButton.tsx`)
   - 实现文件选择触发
   - 处理EPUB数据接收
   - 显示加载状态和错误处理

2. **更新应用状态管理** (`src/App.tsx`)
   - 集成新的书籍添加功能
   - 更新Book类型定义
   - 添加EPUB数据处理逻辑

3. **更新书籍显示组件**
   - 支持EPUB封面显示
   - 处理base64图片渲染
   - 更新网格布局适配新数据

### 阶段4: 错误处理和用户体验优化
1. **错误处理机制**
   - EPUB文件格式验证
   - 文件损坏处理
   - 用户友好的错误提示

2. **用户体验优化**
   - 加载状态指示器
   - 进度条显示
   - 成功添加的反馈动画

### 阶段5: 数据持久化
1. **本地存储设计**
   - EPUB元数据缓存
   - 封面图片本地存储
   - 阅读进度跟踪

2. **数据管理优化**
   - 防止重复添加
   - 书籍信息更新机制
   - 存储空间管理

## 具体代码实现要点

### 1. 预加载脚本关键代码
```typescript
// src-electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectEpubFile: () => ipcRenderer.invoke('epub:select-file'),
  parseEpubFile: (filePath: string) => ipcRenderer.invoke('epub:parse-file', filePath),
  onEpubProcessed: (callback: (data: EpubBookData) => void) => {
    ipcRenderer.on('epub:processed', (_, data) => callback(data));
  }
});
```

### 2. EPUB服务核心逻辑
```typescript
// src-electron/services/epubService.ts
import EPub from 'epub';
import JSZip from 'jszip';

export class EPUBService {
  async parseEpubFile(filePath: string): Promise<EpubBookData> {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);

      epub.on('end', async () => {
        try {
          const metadata = await this.extractMetadata(epub);
          const cover = await this.extractCover(epub);
          const chapters = await this.extractChapters(epub);

          resolve({
            id: this.generateId(),
            title: metadata.title,
            author: metadata.creator,
            cover,
            chapters,
            metadata
          });
        } catch (error) {
          reject(error);
        }
      });

      epub.on('error', reject);
      epub.parse();
    });
  }
}
```

### 3. 前端集成关键代码
```typescript
// src/components/AddBookButton.tsx
const AddBookButton: React.FC<AddBookButtonProps> = ({ onBookAdded }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddBook = async () => {
    try {
      setIsLoading(true);

      // 通过Electron API选择和解析EPUB
      const bookData = await window.electronAPI.parseEpubFile();

      // 调用父组件回调
      onBookAdded(bookData);
    } catch (error) {
      console.error('添加书籍失败:', error);
      // 显示错误提示
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
      {isLoading ? '正在添加...' : '添加书籍'}
    </button>
  );
};
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