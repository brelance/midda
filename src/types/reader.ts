import { Book, Chapter } from "./types";

export type ReadingMode = "single" | "double";
export type ScrollMode = "scroll" | "page";
export type ReaderViewMode = "reading" | "analysis";


export interface ReaderState {
  book: Book;
  currentChapterId: string;
  progress: number; // overall book progress percentage (0-100)
}

export interface ReaderChapterContext {
  chapters: Chapter[];
  currentIndex: number;
}

export interface ReaderNavigationCallbacks {
  onExitReader: () => void;
  onChapterChange: (chapterId: string) => void;
  onProgressChange: (progress: number) => void;
}

export interface ReaderToolbarVisibility {
  isHeaderVisible: boolean;
  isFooterVisible: boolean;
}

export interface ReaderContentData {
  chapterTitle: string;
  chapterContent: string;
}
