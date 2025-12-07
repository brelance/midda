import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import type { TokenData, WordDetail } from "../src/types/types";
import type {
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
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
} from "../src/types/database";
import type { RoleplayAnalysisPayload } from "../src/types/roleplay";
const api = {
  ai: {
    sendGeminiRequest: (payload: {
      sentence: string;
      language?: string;
    }): Promise<TokenData[]> =>
      ipcRenderer.invoke("gemini-tokens-request", payload),
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
      romaji: string
    ) =>
      ipcRenderer.send("word-detail-request", {
        word,
        pos,
        sentence,
        furigana,
        romaji,
      }),

    onWordDetailResponse: (callback: (value: WordDetail) => void) =>
      ipcRenderer.on("word-detail-response", (_event, value) =>
        callback(value)
      ),

    onWordDetailError: (callback: (message: string) => void) =>
      ipcRenderer.on("word-detail-error", (_event, message) =>
        callback(message)
      ),

    cleanupListeners: () => {
      ipcRenderer.removeAllListeners("word-detail-response");
      ipcRenderer.removeAllListeners("word-detail-error");
    },
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

    // 监听器（如果需要异步通知）
    onParseProgress: (callback: (progress: any) => void) =>
      ipcRenderer.on("epub:parse-progress", (_, progress) =>
        callback(progress)
      ),

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
