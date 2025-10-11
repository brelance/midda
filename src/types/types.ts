export interface SubtitleLineData {
  startTime: number;
  endTime: number;
  originalText: string;
  tokens: TokenData[];
}

export interface TokenData {
  word: string;
  pos: string;
  furigana?: string;
  romaji?: string;
}

export type CueNode = Node & {
  type: "cue";
  data: {
    start: number; // 开始时间 (毫秒)
    end: number; // 结束时间 (毫秒)
    text: string; // 字幕文本
    translation: string;
  };
};

export interface WordDetail {
  originalWord: string;
  chineseTranslation: string;
  pos: string;
  furigana?: string;
  romaji?: string;
  dictionaryForm?: string;
  explanation: string;
}

export interface GeminiNonStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GeminiChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GeminiChoice {
  index: number;
  message: GeminiMessage;
  finish_reason: string;
}

export interface GeminiMessage {
  content: string;
  role: string;
}

// 阅读器应用接口定义
export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  progress: number; // 阅读进度百分比 (0-100)
  status: 'not-started' | 'reading' | 'completed';
  description?: string;
  chapters?: Chapter[];
  currentChapterId?: string;
  addedDate: Date;
  lastReadDate?: Date;
  lastReadChapterId?: string;
  filePath?: string; // EPUB文件路径
  metadata?: EpubMetadata; // EPUB元数据
}

export interface Chapter {
  id: string;
  title: string;
  pageNumber: number;
  isRead: boolean;
  content?: string; // 章节内容
  href?: string; // 章节链接
  order?: number; // 章节顺序
}

// EPUB相关接口定义
export interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  language: string;
  publisher?: string;
  identifier: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  content: string;
  href: string;
  order: number;
}

export interface EpubBookData {
  id: string;
  title: string;
  author: string;
  cover?: string;
  chapters: EpubChapter[];
  metadata: EpubMetadata;
  filePath: string;
  addedDate: Date;
  progress: number;
  status: 'not-started' | 'reading' | 'completed';
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export type NavigationItem = 'bookshelf' | 'discover' | 'store' | 'profile';

export interface AppState {
  books: Book[];
  user: User;
  selectedBook: Book | null;
  activeNav: NavigationItem;
  searchQuery: string;
  sortBy: 'title' | 'author' | 'progress' | 'addedDate';
}
