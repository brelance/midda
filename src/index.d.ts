import { ElectronAPI } from "@electron-toolkit/preload";
import type { TokenData, WordDetail, SentenceAnalysisRecord, EpubBookData } from "./types/types";
import type { LocalDictResult } from "./types/localDict";
import type {
  TtsEngine,
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
  TtsVoiceInfo,
} from "./types/tts";
import type {
  LibraryBookRecord,
  LibraryBookUpsertPayload,
  LibraryChapterRecord,
  LibraryChapterUpsertPayload,
  ChapterReadingPositionRecord,
  ChapterReadingPositionUpsertPayload,
  SentenceAnalysisUpsertPayload,
  SentenceAnalysisJobRecord,
  SentenceAnalysisJobStatus,
  SentenceAnalysisJobUpsertPayload,
  UserPreferenceRecord,
  SentenceAnalysisListFilters,
  SentenceAnalysisContext,
  VocabStatus,
  VocabularyRecord,
  VocabularyContextRecord,
  VocabularyUpsertPayload,
  CollectionRecord,
} from "./types/database";
import type {
  RoleplayAnalysisPayload,
  RoleplayChatRequest,
  RoleplayChatResponse,
} from "./types/roleplay";

declare global {
  interface Window {
    electron: ElectronAPI & {
      app: {
        getPath: (name: "downloads") => string;
      };
    };
    api: IElectronAPI;
  }
}

export interface IElectronAPI {
  db: {
    books: {
      upsert: (payload: LibraryBookUpsertPayload) => Promise<LibraryBookRecord>;
      get: (bookId: string) => Promise<LibraryBookRecord | null>;
      getAll: () => Promise<LibraryBookRecord[]>;
      delete: (bookId: string) => Promise<boolean>;
    };
    chapters: {
      bulkUpsert: (
        payload: LibraryChapterUpsertPayload[]
      ) => Promise<LibraryChapterRecord[]>;
      getByBook: (bookId: string) => Promise<LibraryChapterRecord[]>;
      deleteByBook: (bookId: string) => Promise<boolean>;
    };
    readingPositions: {
      upsert: (
        payload: ChapterReadingPositionUpsertPayload
      ) => Promise<ChapterReadingPositionRecord>;
      get: (
        bookId: string,
        chapterId: string
      ) => Promise<ChapterReadingPositionRecord | null>;
      delete: (bookId: string, chapterId: string) => Promise<boolean>;
    };
    sentenceAnalysis: {
      upsert: (
        payload: SentenceAnalysisUpsertPayload
      ) => Promise<SentenceAnalysisRecord>;
      getBySentence: (
        bookId: string,
        text: string,
        context?: SentenceAnalysisContext
      ) => Promise<SentenceAnalysisRecord | null>;
      listByContext: (
        bookId: string,
        filters?: SentenceAnalysisListFilters
      ) => Promise<SentenceAnalysisRecord[]>;
    };
    sentenceAnalysisJobs: {
      enqueue: (
        payload: SentenceAnalysisJobUpsertPayload
      ) => Promise<SentenceAnalysisJobRecord>;
      updateStatus: (
        jobId: number,
        status: SentenceAnalysisJobStatus,
        options?: { error?: string; resultRecordId?: number }
      ) => Promise<boolean>;
      getPending: (limit?: number) => Promise<SentenceAnalysisJobRecord[]>;
      delete: (jobId: number) => Promise<boolean>;
    };
    userPreferences: {
      set: (key: string, value: string) => Promise<UserPreferenceRecord>;
      get: (key: string) => Promise<UserPreferenceRecord | null>;
      delete: (key: string) => Promise<boolean>;
    };
    vocabulary: {
      upsert: (payload: VocabularyUpsertPayload) => Promise<VocabularyRecord>;
      getAll: () => Promise<VocabularyRecord[]>;
      getContexts: (vocabId: number) => Promise<VocabularyContextRecord[]>;
      getBaseForms: () => Promise<string[]>;
      getDue: (limit?: number) => Promise<VocabularyRecord[]>;
      updateStatus: (id: number, status: VocabStatus) => Promise<boolean>;
      updateReview: (
        id: number,
        update: {
          status: VocabStatus;
          reviewCount: number;
          easeFactor: number;
          intervalDays: number;
          nextReviewAt: string;
          lastReviewedAt: string;
        }
      ) => Promise<boolean>;
      delete: (id: number) => Promise<boolean>;
    };
    collections: {
      create: (name: string) => Promise<CollectionRecord>;
      getAll: () => Promise<CollectionRecord[]>;
      rename: (id: string, name: string) => Promise<CollectionRecord>;
      delete: (id: string) => Promise<boolean>;
      reorder: (ids: string[]) => Promise<void>;
      addBook: (collectionId: string, bookId: string) => Promise<void>;
      removeBook: (collectionId: string, bookId: string) => Promise<boolean>;
      getBookIds: (collectionId: string) => Promise<string[]>;
    };
  };

  ai: {
    sendTokensRequest: (payload: {
      sentence: string;
      language?: string;
      model?: string;
    }) => Promise<TokenData[]>;
  };

  interactiveRoleplay?: {
    analyzeChapter: (payload: RoleplayAnalysisPayload) => Promise<unknown>;
    sendMessage: (payload: RoleplayChatRequest) => Promise<RoleplayChatResponse>;
  };

  wordDetail: {
    sendWordDetailRequest: (
      word: string,
      pos: string,
      sentence: string,
      furigana: string,
      romaji: string,
      model?: string
    ) => Promise<WordDetail>;
  };

  localDict: {
    lookup: (
      word: string,
      options?: { includeTags?: boolean }
    ) => Promise<LocalDictResult>;
    lookupExamples: (
      entryId: string,
      limit?: number
    ) => Promise<import("./types/localDict").DictExample[]>;
  };

  epub: {
    selectFile: () => Promise<string | null>;
    parseFile: (filePath: string) => Promise<EpubBookData>;
    getCover: (filePath: string) => Promise<string | undefined>;
    removeFromLibrary: (bookId: string) => Promise<boolean>;
    /** Returns an unsubscribe function; call it to remove only this listener */
    onParseProgress: (callback: (progress: any) => void) => () => void;
    cleanupEpubListeners: () => void;
  };

  book: {
    selectFile: () => Promise<string | null>;
    parseFile: (filePath: string) => Promise<import("./types/types").ImportedBookData>;
    getPage: (
      bookId: string,
      filePath: string,
      format: string,
      pageNumber: number
    ) => Promise<{ dataUrl: string; width: number; height: number }>;
    removeFromLibrary: (bookId: string, format: string) => Promise<boolean>;
    readPdfBytes: (filePath: string) => Promise<Uint8Array>;
  };

  ocr: {
    recognizeText: (
      imageInput: string,
      languageHint?: string
    ) => Promise<{
      text: string;
      blocks: Array<{
        text: string;
        confidence: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      language?: string;
    }>;
    isAvailable: () => Promise<boolean>;
    mangaRecognize: (imageInput: string) => Promise<{ text: string; confidence: number }>;
    mangaStatus: () => Promise<{ ready: boolean; downloaded: string[]; missing: string[] }>;
    mangaIsReady: () => Promise<boolean>;
    mangaDownload: () => Promise<{ success: boolean }>;
    onMangaDownloadProgress: (
      callback: (data: { file: string; current: number; total: number }) => void
    ) => () => void;
  };

  tts: {
    start: (
      sentences: TtsSentencePayload[],
      options?: TtsStartRequestOptions
    ) => Promise<TtsStateUpdate>;
    pause: () => Promise<TtsStateUpdate>;
    resume: () => Promise<TtsStateUpdate>;
    stop: () => Promise<TtsStateUpdate>;
    jumpTo: (index: number) => Promise<TtsStateUpdate>;
    onStateChange: (callback: (state: TtsStateUpdate) => void) => () => void;
    cleanup: () => void;
    listVoices: (language?: string) => Promise<TtsVoiceInfo[]>;
    setEngine: (engine: TtsEngine) => Promise<void>;
  };

  auth: {
    startOAuth: (provider: "google" | "apple") => Promise<void>;
    getSession: () => Promise<{
      user: AuthUser | null;
      isAuthenticated: boolean;
    }>;
    restoreSession: () => Promise<AuthUser | null>;
    refreshSession: () => Promise<AuthUser | null>;
    logout: () => Promise<void>;
    onAuthStateChange: (
      callback: (user: AuthUser | null) => void
    ) => () => void;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}
