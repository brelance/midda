import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import { TokenData } from "../src/types/types";
const api = {
  ai: {
    sendGeminiRequest: (prompt: string): Promise<TokenData[]> =>
      ipcRenderer.invoke("gemini-tokens-request", { prompt }),
  },

  wordDetail: {
    sendWordDetailRequest: (
      word: any,
      pos: any,
      sentence: any,
      furigana: any,
      romaji: any
    ) =>
      ipcRenderer.send("word-detail-request", {
        word,
        pos,
        sentence,
        furigana,
        romaji,
      }),

    onWordDetailResponse: (callback: (arg0: any) => void) =>
      ipcRenderer.on("word-detail-response", (_event, value) =>
        callback(value)
      ),

    onWordDetailError: (callback: (arg0: any) => void) =>
      ipcRenderer.on("word-detail-error", (_event, message) =>
        callback(message)
      ),

    cleanupListeners: () => {
      ipcRenderer.removeAllListeners("word-detail-response");
      ipcRenderer.removeAllListeners("word-detail-error");
    },
  },

  db: {
    subtitles: {
      addSubtitlesByVideoId: (videoId: any, subtitles: any) =>
        ipcRenderer.invoke(
          "db:subtitles:addSubtitlesByVideoId",
          videoId,
          subtitles
        ),
      getSubtitlesByVideoId: (videoId: any) =>
        ipcRenderer.invoke("db:subtitles:getSubtitlesByVideoId", videoId),
      updateToken: (lineId: any, tokenIndex: any, tokenData: any) =>
        ipcRenderer.invoke(
          "db:subtitles:updateToken",
          lineId,
          tokenIndex,
          tokenData
        ),
      deleteSubtitlesByVideoId: (videoId: any) =>
        ipcRenderer.invoke("db:subtitles:deleteSubtitlesByVideoId", videoId),
    },
  },

  epub: {
    selectFile: (): Promise<string | null> =>
      ipcRenderer.invoke("epub:select-file"),
    parseFile: (filePath: string): Promise<any> =>
      ipcRenderer.invoke("epub:parse-file", filePath),
    getCover: (filePath: string): Promise<string | undefined> =>
      ipcRenderer.invoke("epub:get-cover", filePath),

    // 监听器（如果需要异步通知）
    onParseProgress: (callback: (progress: any) => void) =>
      ipcRenderer.on("epub:parse-progress", (_, progress) =>
        callback(progress)
      ),

    cleanupEpubListeners: () => {
      ipcRenderer.removeAllListeners("epub:parse-progress");
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
