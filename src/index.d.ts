import { ElectronAPI } from "@electron-toolkit/preload";
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

import {
  LocalVideoFile,
  SubtitleLineData,
  TokenData,
  Video,
  JimakuResult,
  TorrentStatus, // Add TorrentStatus
  WordDictResult,
} from "../types/models";

export interface IElectronAPI {
  readVideoFiles: () => LocalVideoFile[];

  db: {
    subtitles: {
      addSubtitlesByVideoId: (
        videoId: string,
        subtitles: SubtitleLineData[]
      ) => Promise<{ success: boolean; message: string }>;
      getSubtitlesByVideoId: (
        videoId: string
      ) => Promise<SubtitleLineData[] | null>;
      updateToken: (
        lineId: number,
        tokenIndex: number,
        tokenData: Partial<TokenData>
      ) => Promise<{ success: boolean }>;
      deleteSubtitlesByVideoId: (
        videoId: string
      ) => Promise<{ success: boolean }>;
    };
    translation: {
      addTranslationSentence: (
        data: TranslationSentenceData
      ) => Promise<{ success: boolean; message?: string }>;
      getTranslationSentence: (
        videoId: string,
        startTime: number
      ) => Promise<TranslationSentenceData | null>;
      getTranslationSentencesByVideoId: (
        videoId: string
      ) => Promise<TranslationSentenceData[] | null>;
      updateTranslationSentence: (
        data: TranslationSentenceData
      ) => Promise<{ success: boolean; message?: string }>;
      deleteTranslationSentence: (
        videoId: string,
        startTime: number
      ) => Promise<{ success: boolean }>;
      deleteTranslationSentencesByVideoId: (
        videoId: string
      ) => Promise<{ success: boolean }>;
      addTranslationSentences: (
        data: TranslationSentenceData[]
      ) => Promise<{ success: boolean; message?: string }>;
    };
  };

  ai: {
    sendGeminiRequest: (prompt: string) => Promise<TokenData[]>;
    onGeminiEnd: (callback: () => void) => void;
    onGeminiNonStreamTokensResponse: (
      callback: (tokens: TokenData[]) => void
    ) => void;
    onGeminiError: (callback: (message: string) => void) => void;
    cleanupListeners: () => void;
  };

  wordDetail: {
    sendWordDetailRequest: (
      word: string,
      pos: string,
      sentence: string,
      furigana: string,
      romaji: string
    ) => void;
    onWordDetailResponse: (callback: (value: WordDetail) => void) => void;
    onWordDetailError: (callback: (message: string) => void) => void;
    cleanupListeners: () => void;
  };
}
