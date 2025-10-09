// 全局类型定义
import { EpubBookData, TokenData } from './types';

declare global {
  interface Window {
    api: {
      ai: {
        sendGeminiRequest: (prompt: string) => Promise<TokenData[]>;
      };
      wordDetail: {
        sendWordDetailRequest: (
          word: any,
          pos: any,
          sentence: any,
          furigana: any,
          romaji: any
        ) => void;
        onWordDetailResponse: (callback: (arg0: any) => void) => void;
        onWordDetailError: (callback: (arg0: any) => void) => void;
        cleanupListeners: () => void;
      };
      db: {
        subtitles: {
          addSubtitlesByVideoId: (videoId: any, subtitles: any) => Promise<void>;
          getSubtitlesByVideoId: (videoId: any) => Promise<any>;
          updateToken: (lineId: any, tokenIndex: any, tokenData: any) => Promise<void>;
          deleteSubtitlesByVideoId: (videoId: any) => Promise<void>;
        };
      };
      epub: {
        selectFile: () => Promise<string | null>;
        parseFile: (filePath: string) => Promise<EpubBookData>;
        getCover: (filePath: string) => Promise<string | undefined>;
        onParseProgress: (callback: (progress: any) => void) => void;
        cleanupEpubListeners: () => void;
      };
    };
  }
}

export {};