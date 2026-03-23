import { TokenData, SentenceAnalysisRecord } from "./types";

export type LibraryReadingStatus = "not-started" | "reading" | "completed";

export interface LibraryBookRecord {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverPath?: string;
  filePath: string;
  sourcePath?: string;
  status: LibraryReadingStatus;
  progress: number;
  currentChapterId?: string;
  lastReadChapterId?: string;
  metadataLanguage?: string;
  metadataPublisher?: string;
  metadataIdentifier?: string;
  addedAt: string;
  updatedAt: string;
}

export interface LibraryBookUpsertPayload {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverPath?: string;
  filePath: string;
  sourcePath?: string;
  status?: LibraryReadingStatus;
  progress?: number;
  currentChapterId?: string;
  lastReadChapterId?: string;
  metadataLanguage?: string;
  metadataPublisher?: string;
  metadataIdentifier?: string;
}

export interface LibraryChapterRecord {
  bookId: string;
  chapterId: string;
  title?: string;
  href?: string;
  orderIndex: number;
  contentHtml?: string;
  cssContent?: string;
  isRead: boolean;
  wordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryChapterUpsertPayload {
  bookId: string;
  chapterId: string;
  title?: string;
  href?: string;
  orderIndex: number;
  contentHtml?: string;
  cssContent?: string;
  isRead?: boolean;
  wordCount?: number;
}

export interface ChapterReadingPositionRecord {
  bookId: string;
  chapterId: string;
  scrollProgress: number;
  scrollOffset?: number;
  viewportHeight?: number;
  updatedAt: string;
}

export interface ChapterReadingPositionUpsertPayload {
  bookId: string;
  chapterId: string;
  scrollProgress: number;
  scrollOffset?: number;
  viewportHeight?: number;
}

export interface SentenceAnalysisUpsertPayload {
  bookId: string;
  text: string;
  tokens: TokenData[];
  chapterId?: string;
  paragraphId?: string;
  sentenceId?: string;
}

export type SentenceAnalysisJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export interface SentenceAnalysisJobRecord {
  jobId: number;
  bookId: string;
  chapterId?: string;
  sentenceHash: string;
  text: string;
  status: SentenceAnalysisJobStatus;
  error?: string;
  resultRecordId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SentenceAnalysisJobUpsertPayload {
  bookId: string;
  chapterId?: string;
  sentenceHash?: string;
  text: string;
  status?: SentenceAnalysisJobStatus;
  error?: string;
  resultRecordId?: number;
}

export interface UserPreferenceRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export type SentenceAnalysisListFilters = {
  chapterId?: string;
  paragraphId?: string;
};

export type SentenceAnalysisContext = {
  chapterId?: string;
  paragraphId?: string;
  sentenceId?: string;
};

export type SentenceAnalysisRecordWithTokens = SentenceAnalysisRecord;

// ── Vocabulary ──────────────────────────────────────────────────────────────

export type VocabStatus = "new" | "learning" | "mastered";

export interface VocabularyRecord {
  id: number;
  word: string;
  baseForm: string;
  reading?: string;
  romaji?: string;
  pos?: string;
  glosses?: string[];
  aiMeaning?: string;
  sourceBookId?: string;
  /** Whether the morphological analyzer provided a real lemma for this token */
  hasLemma: boolean;
  status: VocabStatus;
  reviewCount: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt?: string;
  createdAt: string;
  lastReviewedAt?: string;
}

export interface VocabularyContextRecord {
  id: number;
  vocabularyId: number;
  sentenceText: string;
  bookId?: string;
  chapterId?: string;
  createdAt: string;
}

export interface VocabularyUpsertPayload {
  word: string;
  baseForm: string;
  reading?: string;
  romaji?: string;
  pos?: string;
  glosses?: string[];
  aiMeaning?: string;
  sourceBookId?: string;
  /** Whether the morphological analyzer provided a real lemma for this token */
  hasLemma?: boolean;
  sentenceText?: string;
  sentenceBookId?: string;
  sentenceChapterId?: string;
}

// ── Collections ─────────────────────────────────────────────────────────────

export interface CollectionRecord {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionCreatePayload {
  name: string;
}

