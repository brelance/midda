import type { LLMClient, LLMChatMessage, LLMResponseFormat } from "./llmClient";
import { getLLMEnvConfig, resolveModel } from "./llmConfig";
import { stripMarkdownCodeFences } from "./json";

export interface PromptDefinition<Input, Output> {
  id: string;
  build(input: Input): {
    messages: LLMChatMessage[];
    temperature?: number;
    responseFormat?: LLMResponseFormat;
    extra?: Record<string, unknown>;
  };
  parse(text: string): Output;
}

export const runPrompt = async <Input, Output>(
  client: LLMClient,
  prompt: PromptDefinition<Input, Output>,
  input: Input,
  opts?: { model?: string | null | undefined }
): Promise<Output> => {
  const env = getLLMEnvConfig();
  const model = resolveModel(env, { model: opts?.model });
  const built = prompt.build(input);
  const { content } = await client.chat({
    model,
    messages: built.messages,
    temperature: built.temperature,
    responseFormat: built.responseFormat,
    extra: built.extra,
    stream: false,
  });
  const cleaned = stripMarkdownCodeFences(content);
  return prompt.parse(cleaned);
};

