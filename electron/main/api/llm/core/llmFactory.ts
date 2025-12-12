import type { LLMClient } from "./llmClient";
import { getLLMEnvConfig } from "./llmConfig";
import { OpenAICompatibleClient } from "./openaiCompatibleClient";

let singleton: LLMClient | null = null;

export const getLLMClient = (): LLMClient => {
  if (singleton) return singleton;

  const env = getLLMEnvConfig();
  switch (env.provider) {
    case "openai-compatible":
      singleton = new OpenAICompatibleClient(env);
      return singleton;
    default:
      // Exhaustiveness guard (future providers).
      throw new Error(`Unsupported LLM provider: ${env.provider}`);
  }
};

