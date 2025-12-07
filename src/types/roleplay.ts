export interface RoleplayCharacterProfile {
  name: string;
  personality?: string;
  speakingStyle?: string;
  catchphrases?: string[];
  userRelationship?: string;
}

export interface RoleplayAnalysisPayload {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  bookContent: string;
}

export type RoleplayAnalysisStatus = "idle" | "loading" | "ready" | "error";

export interface RoleplayAnalysisState {
  status: RoleplayAnalysisStatus;
  characters: RoleplayCharacterProfile[];
  error?: string;
}
