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

export type RoleplayChatHistoryRole = "user" | "assistant";

export interface RoleplayChatHistoryMessage {
  role: RoleplayChatHistoryRole;
  content: string;
}

export interface RoleplayChatRequest {
  character: RoleplayCharacterProfile;
  bookTitle: string;
  chapterTitle: string;
  chapterContentOrSummary: string;
  targetLanguage: string;
  userProficiencyLevel: string;
  message: string;
  history?: RoleplayChatHistoryMessage[];
}

export interface RoleplayChatResponse {
  reply: string;
}
