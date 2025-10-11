# EPUB集成实现文档

## 概述
本文档记录了为React + TypeScript阅读应用实现EPUB文件解析和书籍添加功能的完整过程。

## 功能特性
- 用户可以通过前端界面选择EPUB文件
- Electron后端解析EPUB文件并提取元数据、封面和章节内容
- 解析后的书籍数据自动添加到应用书架
- 支持EPUB标准的书籍信息展示

## 实现架构

### 技术栈
- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Electron + Node.js
- **EPUB解析**: epub (Node 端解析库)
- **进程间通信**: Electron IPC (主进程 ↔ 渲染进程)

### 架构流程
```
用户点击"添加书籍" → 前端触发文件选择 → Electron打开文件对话框 →
用户选择EPUB文件 → EPUB服务解析文件 → 返回书籍数据 →
前端更新书架状态 → 显示新书籍
```

## 文件结构和修改

### 新增文件

#### 1. `/electron/main/api/epub/epub.api.ts`
EPUB API处理器，负责注册IPC事件处理器
```typescript
export function setupEpubApiHandler() {
  const epubService = new EPUBService();
  ipcMain.handle('epub:select-file', async () => {
    // 文件选择对话框逻辑
  });
  ipcMain.handle('epub:parse-file', async (event, filePath) => {
    // EPUB文件解析逻辑
  });
}
```

#### 2. `/electron/main/api/epub/epubService.ts`
EPUB解析服务类，核心业务逻辑
```typescript
export class EPUBService {
  async parseEpubFile(filePath: string): Promise<EpubBookData> {
    // 1. 读取EPUB文件
    // 2. 解析元数据
    // 3. 提取封面图片
    // 4. 解析章节内容
    // 5. 返回结构化书籍数据
  }
}
```

#### 3. `/src/components/AddBookButton.tsx`
添加书籍按钮组件
```typescript
const AddBookButton: React.FC<AddBookButtonProps> = ({ onBookAdded }) => {
  const handleAddBook = async () => {
    const filePath = await window.api.epub.selectFile();
    if (filePath) {
      const bookData = await window.api.epub.parseFile(filePath);
      onBookAdded(bookData);
    }
  };
};
```

### 修改文件

#### 4. `/electron/preload.ts`
添加EPUB API到预加载脚本
```typescript
epub: {
  selectFile: (): Promise<string | null> =>
    ipcRenderer.invoke("epub:select-file"),
  parseFile: (filePath: string): Promise<EpubBookData> =>
    ipcRenderer.invoke("epub:parse-file", filePath),
}
```

#### 5. `/electron/main/main.ts`
注册EPUB API处理器
```typescript
import { setupEpubApiHandler } from "./api/epub/epub.api";
setupEpubApiHandler();
```

#### 6. `/src/types/types.ts`
扩展类型定义
```typescript
// 新增EPUB相关接口
export interface EpubMetadata { ... }
export interface EpubChapter { ... }
export interface EpubBookData { ... }

// 扩展Book接口
export interface Book {
  // ... 原有字段
  filePath?: string;
  metadata?: EpubMetadata;
}
```

#### 7. `/src/types/global.d.ts`
扩展Window接口类型
```typescript
declare global {
  interface Window {
    api: {
      // ... 原有API
      epub: {
        selectFile: () => Promise<string | null>;
        parseFile: (filePath: string) => Promise<EpubBookData>;
      };
    };
  }
}
```

#### 8. `/src/components/mainContent/Header.tsx`
集成AddBookButton组件
```typescript
import AddBookButton from '../AddBookButton';

// 在JSX中添加
{onBookAdded && <AddBookButton onBookAdded={onBookAdded} />}
```

#### 9. `/src/components/layout/MainContent.tsx`
传递onBookAdded回调
```typescript
interface MainContentProps {
  // ... 原有props
  onBookAdded?: (bookData: EpubBookData) => void;
}

// 传递给Header组件
<Header onBookAdded={onBookAdded} />
```

#### 10. `/src/components/layout/Layout.tsx`
传递onBookAdded回调到MainContent
```typescript
interface LayoutProps {
  // ... 原有props
  onBookAdded?: (bookData: EpubBookData) => void;
}

// 所有MainContent实例都传递onBookAdded
<MainContent onBookAdded={onBookAdded} />
```

#### 11. `/src/App.tsx`
添加书籍处理逻辑
```typescript
const [books, setBooks] = useState<Book[]>(mockBooks);

const handleBookAdded = (epubData: EpubBookData) => {
  const newBook: Book = {
    id: epubData.id,
    title: epubData.title,
    author: epubData.author,
    cover: epubData.cover,
    // ... 转换其他字段
  };
  setBooks(prevBooks => [...prevBooks, newBook]);
};

// 传递给Layout组件
<Layout onBookAdded={handleBookAdded} />
```

## 依赖包安装

### 新增依赖
```bash
npm install epub jszip file-type
```

### 依赖包说明
- **epub**: Node.js 环境下的EPUB解析核心库
- **jszip**: ZIP文件解压（EPUB基于ZIP格式）
- **file-type**: 文件类型检测和验证

## 数据流程

### 1. 文件选择阶段
```typescript
// 用户点击添加书籍按钮 → 触发文件选择
const filePath = await window.api.epub.selectFile();
```

### 2. 文件解析阶段
```typescript
// EPUB服务解析文件
const bookData = await window.api.epub.parseFile(filePath);
// 返回: EpubBookData { id, title, author, cover, chapters, metadata, ... }
```

### 3. 数据转换阶段
```typescript
// 前端将EpubBookData转换为Book对象
const newBook: Book = {
  id: epubData.id,
  title: epubData.title,
  author: epubData.author,
  // ... 字段映射
};
```

### 4. 状态更新阶段
```typescript
// 更新应用状态
setBooks(prevBooks => [...prevBooks, newBook]);
```

## 接口定义

### EpubBookData接口
```typescript
export interface EpubBookData {
  id: string;
  title: string;
  author: string;
  cover?: string; // base64编码的封面图片
  chapters: EpubChapter[];
  metadata: EpubMetadata;
  filePath: string;
  addedDate: Date;
  progress: number;
  status: 'not-started' | 'reading' | 'completed';
}
```

### EpubChapter接口
```typescript
export interface EpubChapter {
  id: string;
  title: string;
  content: string;
  href: string;
  order: number;
}
```

### EpubMetadata接口
```typescript
export interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  language: string;
  publisher?: string;
  identifier: string;
}
```

## 错误处理

### 前端错误处理
```typescript
try {
  const bookData = await window.api.epub.parseFile(filePath);
  onBookAdded(bookData);
} catch (error) {
  console.error('添加书籍失败:', error);
  alert('添加书籍失败，请检查文件格式是否正确');
}
```

### 后端错误处理
```typescript
// EPUB服务类中的错误处理
try {
  const book = await ePub.load(filePath);
  // ... 解析逻辑
} catch (error) {
  console.error('EPUB解析失败:', error);
  throw new Error('无法解析EPUB文件');
}
```

## 功能测试

### 测试步骤
1. 启动应用
2. 点击界面右上角的"添加书籍"按钮
3. 在文件选择对话框中选择EPUB文件
4. 等待文件解析完成
5. 验证书籍是否出现在书架中
6. 检查书籍封面、标题、作者等信息是否正确显示

### 测试用例
- ✅ 正常EPUB文件导入
- ✅ 非EPUB文件格式错误处理
- ✅ 文件选择取消处理
- ✅ 多本书籍导入
- ✅ 书籍信息正确显示

## 后续优化建议

### 1. 性能优化
- 大文件EPUB解析进度显示
- 封面图片压缩和缓存
- 章节内容懒加载

### 2. 用户体验
- 拖拽文件导入功能
- 批量导入支持
- 导入历史记录

### 3. 功能扩展
- EPUB元数据编辑
- 书籍分类管理
- 阅读进度同步

### 4. 错误处理增强
- 详细的错误信息提示
- 损坏EPUB文件修复尝试
- 网络资源加载失败处理

## 总结

本次实现成功集成了完整的EPUB文件解析和书籍添加功能，建立了前后端之间的通信桥梁，为用户提供了便捷的书籍导入体验。所有代码都遵循了现有的项目架构和TypeScript类型安全要求。
