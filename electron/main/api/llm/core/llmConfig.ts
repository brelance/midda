export type LLMProviderId = "openai-compatible";

export interface LLMEnvConfig {
  provider: LLMProviderId;
  apiKey: string;
  chatCompletionsUrl: string;
  defaultModel: string;
  /**
   * Some OpenAI-compatible gateways are strict about unknown fields.
   * Keep this opt-in so we don't accidentally break requests.
   */
  supportsResponseFormat: boolean;
}

const normalizeEnvString = (value: string | undefined): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const requireEnv = (value: string | undefined, name: string): string => {
  const normalized = normalizeEnvString(value);
  if (!normalized) {
    throw new Error(`${name} is not defined in environment variables.`);
  }
  return normalized;
};

export const getLLMEnvConfig = (): LLMEnvConfig => {
  const provider =
    (normalizeEnvString(process.env.LLM_PROVIDER) as LLMProviderId | undefined) ??
    "openai-compatible";

  // Back-compat with existing env names used by current handlers.
  const apiKey = requireEnv(
    process.env.LLM_API_KEY ?? process.env.API_KEY,
    "LLM_API_KEY/API_KEY"
  );
  const chatCompletionsUrl =
    normalizeEnvString(process.env.LLM_CHAT_COMPLETIONS_URL) ??
    normalizeEnvString(process.env.API_URL) ??
    "https://api.chatanywhere.tech/v1/chat/completions";
  try {
    // Fail fast with a clearer error than undici's "Failed to parse URL".
    new URL(chatCompletionsUrl);
  } catch {
    throw new Error(
      `LLM_CHAT_COMPLETIONS_URL/API_URL is not a valid URL: ${chatCompletionsUrl}`
    );
  }
  const defaultModel = requireEnv(
    normalizeEnvString(process.env.LLM_MODEL) ??
      normalizeEnvString(process.env.MODEL_NAME),
    "LLM_MODEL/MODEL_NAME"
  );

  const supportsResponseFormat =
    (process.env.LLM_SUPPORTS_RESPONSE_FORMAT ?? "true").toLowerCase() !==
    "false";

  return {
    provider,
    apiKey,
    chatCompletionsUrl,
    defaultModel,
    supportsResponseFormat,
  };
};

export const resolveModel = (
  env: LLMEnvConfig,
  overrides: { model?: string | null | undefined }
): string => {
  const model = typeof overrides.model === "string" ? overrides.model.trim() : "";
  return model || env.defaultModel;
};
