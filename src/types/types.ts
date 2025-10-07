export interface SubtitleLineData {
  startTime: number;
  endTime: number;
  originalText: string;
  tokens: TokenData[];
}

export interface TokenData {
  word: string;
  pos: string;
  furigana?: string;
  romaji?: string;
}

export type CueNode = Node & {
  type: "cue";
  data: {
    start: number; // 开始时间 (毫秒)
    end: number; // 结束时间 (毫秒)
    text: string; // 字幕文本
    translation: string;
  };
};

export interface WordDetail {
  originalWord: string;
  chineseTranslation: string;
  pos: string;
  furigana?: string;
  romaji?: string;
  dictionaryForm?: string;
  explanation: string;
}

export interface GeminiNonStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GeminiChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GeminiChoice {
  index: number;
  message: GeminiMessage;
  finish_reason: string;
}

export interface GeminiMessage {
  content: string;
  role: string;
}
