import { Book, Chapter } from "./types";

export type ReadingMode = "single" | "double";
export type ScrollMode = "scroll" | "page";
export type ReaderViewMode = "reading" | "analysis";
export type ReaderTheme = "light" | "warm" | "green" | "dark";

export interface ReaderThemeColors {
  bg: string;
  text: string;
  card: string;
}

export const READER_THEME_MAP: Record<ReaderTheme, ReaderThemeColors> = {
  light: { bg: "#fdfdfd", text: "#1d1d1f", card: "#fdfdfd" },
  warm:  { bg: "#faf5e4", text: "#3d2b1f", card: "#f5eed8" },
  green: { bg: "#e8f5e9", text: "#1b3a1d", card: "#d4edda" },
  dark:  { bg: "#1c1c1e", text: "#e5e5e7", card: "#2c2c2e" },
};


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
