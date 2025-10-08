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
  addedDate: Date;
  lastReadDate?: Date;
}

export interface Chapter {
  id: string;
  title: string;
  pageNumber: number;
  isRead: boolean;
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
