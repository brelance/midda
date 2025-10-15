export type TtsPlaybackStatus = "idle" | "playing" | "paused";

export interface TtsSentencePayload {
  id: string;
  text: string;
}

export interface TtsStartRequestOptions {
  startIndex?: number;
  voice?: string;
  rate?: number;
}

export interface TtsStateUpdate {
  status: TtsPlaybackStatus;
  currentIndex: number | null;
  currentSentenceId: string | null;
  queueLength: number;
  error?: string;
}
