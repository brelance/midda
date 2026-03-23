export interface TokenData {
  word: string;
  pos: string;
  furigana?: string;
  romaji?: string;
  baseForm?: string;
}

export interface SentenceAnalysisRecord {
  id: number;
  bookId: string;
  text: string;
  tokens: TokenData[];
  chapterId?: string;
  paragraphId?: string;
  sentenceId?: string;
  sentenceHash: string;
  createdAt: string;
  updatedAt: string;
}

// TODO: 迁移旧的视频字幕类型到新的电子书语句分析结构后移除
export interface SubtitleLineData {
  startTime: number;
  endTime: number;
  originalText: string;
  tokens: TokenData[];
}

export interface WordDetail {
  originalWord: string;
  chineseTranslation: string;
  pos: string;
  furigana?: string;
  romaji?: string;
  dictionaryForm?: string;
  explanation: string;
}

export interface ChatCompletionsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionsChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionsChoice {
  index: number;
  message: ChatCompletionsMessage;
  finish_reason: string;
}

export interface ChatCompletionsMessage {
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
  cssContent?: string; // EPUB 样式
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
  sourcePath?: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  content: string;
  href: string;
  order: number;
  cssContent?: string;
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
  provider?: string;
  isGuest?: boolean;
}

export type NavigationItem =
  | 'bookshelf'
  | 'discover'
  | 'store'
  | 'profile'
  | 'vocabulary'
  | `collection:${string}`;

export function isCollectionNav(nav: NavigationItem): nav is `collection:${string}` {
  return nav.startsWith('collection:');
}

export function getCollectionId(nav: `collection:${string}`): string {
  return nav.slice('collection:'.length);
}

export interface AppState {
  books: Book[];
  user: User;
  selectedBook: Book | null;
  activeNav: NavigationItem;
  searchQuery: string;
  sortBy: 'title' | 'author' | 'progress' | 'addedDate';
}
