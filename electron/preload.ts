import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import type { TokenData, WordDetail } from "../src/types/types";
import type {
  TtsEngine,
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
  TtsVoiceInfo,
} from "../src/types/tts";
import type {
  LibraryBookUpsertPayload,
  LibraryChapterUpsertPayload,
  ChapterReadingPositionUpsertPayload,
  SentenceAnalysisUpsertPayload,
  SentenceAnalysisContext,
  SentenceAnalysisListFilters,
  SentenceAnalysisJobUpsertPayload,
  SentenceAnalysisJobStatus,
  VocabularyUpsertPayload,
  VocabStatus,
} from "../src/types/database";
import type { RoleplayAnalysisPayload } from "../src/types/roleplay";
const api = {
  ai: {
    sendTokensRequest: (payload: {
      sentence: string;
      language?: string;
      model?: string;
    }): Promise<TokenData[]> => ipcRenderer.invoke("llm:tokens", payload),
  },

  interactiveRoleplay: {
    analyzeChapter: (payload: RoleplayAnalysisPayload) =>
      ipcRenderer.invoke("interactive-roleplay:analyze", payload),
    sendMessage: (payload: import("../src/types/roleplay").RoleplayChatRequest) =>
      ipcRenderer.invoke("interactive-roleplay:sendMessage", payload),
  },

  wordDetail: {
    sendWordDetailRequest: (
      word: string,
      pos: string,
      sentence: string,
      furigana: string,
      romaji: string,
      model?: string
    ): Promise<WordDetail> =>
      ipcRenderer.invoke("word-detail-request", {
        word,
        pos,
        sentence,
        furigana,
        romaji,
        model,
      }),
  },

  db: {
    books: {
      upsert: (payload: LibraryBookUpsertPayload) =>
        ipcRenderer.invoke("db:books:upsert", payload),
      get: (bookId: string) => ipcRenderer.invoke("db:books:get", bookId),
      getAll: () => ipcRenderer.invoke("db:books:getAll"),
      delete: (bookId: string) =>
        ipcRenderer.invoke("db:books:delete", bookId),
    },
    chapters: {
      bulkUpsert: (payload: LibraryChapterUpsertPayload[]) =>
        ipcRenderer.invoke("db:chapters:bulkUpsert", payload),
      getByBook: (bookId: string) =>
        ipcRenderer.invoke("db:chapters:getByBook", bookId),
      deleteByBook: (bookId: string) =>
        ipcRenderer.invoke("db:chapters:deleteByBook", bookId),
    },
    readingPositions: {
      upsert: (payload: ChapterReadingPositionUpsertPayload) =>
        ipcRenderer.invoke("db:readingPositions:upsert", payload),
      get: (bookId: string, chapterId: string) =>
        ipcRenderer.invoke("db:readingPositions:get", bookId, chapterId),
      delete: (bookId: string, chapterId: string) =>
        ipcRenderer.invoke("db:readingPositions:delete", bookId, chapterId),
    },
    sentenceAnalysis: {
      upsert: (payload: SentenceAnalysisUpsertPayload) =>
        ipcRenderer.invoke("db:sentenceAnalysis:upsert", payload),
      getBySentence: (
        bookId: string,
        text: string,
        context?: SentenceAnalysisContext
      ) =>
        ipcRenderer.invoke(
          "db:sentenceAnalysis:getBySentence",
          bookId,
          text,
          context
        ),
      listByContext: (
        bookId: string,
        filters?: SentenceAnalysisListFilters
      ) =>
        ipcRenderer.invoke(
          "db:sentenceAnalysis:listByContext",
          bookId,
          filters
        ),
    },
    sentenceAnalysisJobs: {
      enqueue: (payload: SentenceAnalysisJobUpsertPayload) =>
        ipcRenderer.invoke("db:sentenceAnalysisJobs:enqueue", payload),
      updateStatus: (
        jobId: number,
        status: SentenceAnalysisJobStatus,
        options?: { error?: string; resultRecordId?: number }
      ) =>
        ipcRenderer.invoke(
          "db:sentenceAnalysisJobs:updateStatus",
          jobId,
          status,
          options
        ),
      getPending: (limit?: number) =>
        ipcRenderer.invoke("db:sentenceAnalysisJobs:getPending", limit),
      delete: (jobId: number) =>
        ipcRenderer.invoke("db:sentenceAnalysisJobs:delete", jobId),
    },
    userPreferences: {
      set: (key: string, value: string) =>
        ipcRenderer.invoke("db:userPreferences:set", key, value),
      get: (key: string) =>
        ipcRenderer.invoke("db:userPreferences:get", key),
      delete: (key: string) =>
        ipcRenderer.invoke("db:userPreferences:delete", key),
    },
    vocabulary: {
      upsert: (payload: VocabularyUpsertPayload) =>
        ipcRenderer.invoke("db:vocabulary:upsert", payload),
      getAll: () => ipcRenderer.invoke("db:vocabulary:getAll"),
      getContexts: (vocabId: number) =>
        ipcRenderer.invoke("db:vocabulary:getContexts", vocabId),
      getBaseForms: (): Promise<string[]> =>
        ipcRenderer.invoke("db:vocabulary:getBaseForms"),
      getDue: (limit?: number) =>
        ipcRenderer.invoke("db:vocabulary:getDue", limit),
      updateStatus: (id: number, status: VocabStatus) =>
        ipcRenderer.invoke("db:vocabulary:updateStatus", id, status),
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
      ) => ipcRenderer.invoke("db:vocabulary:updateReview", id, update),
      delete: (id: number) =>
        ipcRenderer.invoke("db:vocabulary:delete", id),
    },
  },

  epub: {
    selectFile: (): Promise<string | null> =>
      ipcRenderer.invoke("epub:select-file"),
    parseFile: (filePath: string): Promise<any> =>
      ipcRenderer.invoke("epub:parse-file", filePath),
    getCover: (filePath: string): Promise<string | undefined> =>
      ipcRenderer.invoke("epub:get-cover", filePath),
    removeFromLibrary: (bookId: string): Promise<boolean> =>
      ipcRenderer.invoke("epub:remove-from-library", bookId),

    onParseProgress: (callback: (progress: any) => void): (() => void) => {
      const listener = (_: Electron.IpcRendererEvent, progress: any) =>
        callback(progress);
      ipcRenderer.on("epub:parse-progress", listener);
      // Return a cleanup function so callers can remove exactly this listener
      return () => ipcRenderer.removeListener("epub:parse-progress", listener);
    },

    cleanupEpubListeners: () => {
      ipcRenderer.removeAllListeners("epub:parse-progress");
    },
  },

  tts: {
    start: (
      sentences: TtsSentencePayload[],
      options?: TtsStartRequestOptions
    ): Promise<TtsStateUpdate> =>
      ipcRenderer.invoke("tts:start", { sentences, ...options }),
    pause: (): Promise<TtsStateUpdate> => ipcRenderer.invoke("tts:pause"),
    resume: (): Promise<TtsStateUpdate> => ipcRenderer.invoke("tts:resume"),
    stop: (): Promise<TtsStateUpdate> => ipcRenderer.invoke("tts:stop"),
    jumpTo: (index: number): Promise<TtsStateUpdate> =>
      ipcRenderer.invoke("tts:jump-to", { index }),
    onStateChange: (
      callback: (state: TtsStateUpdate) => void
    ): (() => void) => {
      let isDisposed = false;
      const listener = (_event: Electron.IpcRendererEvent, state: TtsStateUpdate) => {
        callback(state);
      };

      ipcRenderer.on("tts:state", listener);

      void ipcRenderer.invoke("tts:subscribe").then((state: TtsStateUpdate) => {
        if (!isDisposed) {
          callback(state);
        }
      });

      return () => {
        isDisposed = true;
        ipcRenderer.removeListener("tts:state", listener);
      };
    },
    cleanup: () => {
      ipcRenderer.removeAllListeners("tts:state");
    },
    listVoices: (language?: string): Promise<TtsVoiceInfo[]> =>
      ipcRenderer.invoke("tts:list-voices", language),
    setEngine: (engine: TtsEngine): Promise<void> =>
      ipcRenderer.invoke("tts:set-engine", engine),
  },

  localDict: {
    lookup: (
      word: string,
      options?: { includeTags?: boolean }
    ): Promise<unknown> =>
      ipcRenderer.invoke("word-dict-local", { word, ...options }),
    lookupExamples: (
      entryId: string,
      limit?: number
    ): Promise<unknown> =>
      ipcRenderer.invoke("word-dict-examples", { entryId, limit }),
  },

  auth: {
    startOAuth: (provider: "google" | "apple"): Promise<void> =>
      ipcRenderer.invoke("auth:start-oauth", provider),
    getSession: (): Promise<{
      user: { id: string; email: string; name: string; avatar?: string; provider: string } | null;
      isAuthenticated: boolean;
    }> => ipcRenderer.invoke("auth:get-session"),
    restoreSession: (): Promise<{
      id: string;
      email: string;
      name: string;
      avatar?: string;
      provider: string;
    } | null> => ipcRenderer.invoke("auth:restore-session"),
    refreshSession: (): Promise<unknown> =>
      ipcRenderer.invoke("auth:refresh"),
    logout: (): Promise<void> => ipcRenderer.invoke("auth:logout"),
    onAuthStateChange: (
      callback: (user: { id: string; email: string; name: string; avatar?: string; provider: string } | null) => void
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        user: { id: string; email: string; name: string; avatar?: string; provider: string } | null
      ) => callback(user);
      ipcRenderer.on("auth:state-change", listener);
      return () => ipcRenderer.removeListener("auth:state-change", listener);
    },
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", {
      ...electronAPI,
      app: {
        getPath: (name: "downloads") =>
          ipcRenderer.sendSync("electron:get-path", name),
      },
    });
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = {
    ...electronAPI,
    app: {
      getPath: (name: "downloads") =>
        ipcRenderer.sendSync("electron:get-path", name),
    },
  };
  // @ts-ignore (define in dts)
  window.api = api;
}
