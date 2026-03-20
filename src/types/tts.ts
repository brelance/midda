export type TtsPlaybackStatus = "idle" | "playing" | "paused";
export type TtsEngine = "edge" | "system";

export interface TtsSentencePayload {
  id: string;
  text: string;
}

export interface TtsStartRequestOptions {
  startIndex?: number;
  voice?: string;
  rate?: number;
  language?: string;
  engine?: TtsEngine;
}

export interface TtsStateUpdate {
  status: TtsPlaybackStatus;
  currentIndex: number | null;
  currentSentenceId: string | null;
  queueLength: number;
  error?: string;
  engine?: TtsEngine;
}

export interface TtsVoiceInfo {
  name: string;
  locale: string;
  gender?: string;
}
