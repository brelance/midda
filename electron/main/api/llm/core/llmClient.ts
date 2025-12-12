export type LLMChatRole = "system" | "user" | "assistant";

export interface LLMChatMessage {
  role: LLMChatRole;
  content: string;
}

export type LLMResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  // Some prompts naturally return arrays; we still parse as JSON on our side.
  | { type: "json_array" };

export interface LLMChatRequest {
  model: string;
  messages: LLMChatMessage[];
  temperature?: number;
  stream?: false;
  responseFormat?: LLMResponseFormat;
  /**
   * Provider-specific fields (e.g. reasoning_effort) that should be forwarded
   * by the underlying implementation when supported.
   */
  extra?: Record<string, unknown>;
}

export interface LLMChatResponse {
  content: string;
  raw: unknown;
}

export interface LLMClient {
  chat(request: LLMChatRequest): Promise<LLMChatResponse>;
}

