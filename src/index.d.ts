import { ElectronAPI } from "@electron-toolkit/preload";
import type { TokenData, WordDetail, SentenceAnalysisRecord, EpubBookData } from "./types/types";
import type {
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
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

  epub: {
    selectFile: () => Promise<string | null>;
    parseFile: (filePath: string) => Promise<EpubBookData>;
    getCover: (filePath: string) => Promise<string | undefined>;
    removeFromLibrary: (bookId: string) => Promise<boolean>;
    /** Returns an unsubscribe function; call it to remove only this listener */
    onParseProgress: (callback: (progress: any) => void) => () => void;
    cleanupEpubListeners: () => void;
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
  };
}
