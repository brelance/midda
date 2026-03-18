import { proxyFetch as fetch } from "../../../utils/proxy";
import type { LLMChatRequest, LLMChatResponse, LLMClient } from "./llmClient";
import type { LLMEnvConfig } from "./llmConfig";

type OpenAICompatibleChatCompletionsResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
};

export class OpenAICompatibleClient implements LLMClient {
  constructor(private readonly env: LLMEnvConfig) {}

  async chat(request: LLMChatRequest): Promise<LLMChatResponse> {
    const payload: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
    };

    if (typeof request.temperature === "number") {
      payload.temperature = request.temperature;
    }

    // Avoid sending unsupported fields unless explicitly enabled.
    if (
      this.env.supportsResponseFormat &&
      request.responseFormat &&
      request.responseFormat.type === "json_object"
    ) {
      payload.response_format = {
        type: "json_object",
      };
    }

    if (request.extra && typeof request.extra === "object") {
      Object.assign(payload, request.extra);
    }

    const baseUrl = this.env.chatCompletionsUrl.replace(/\/+$/, "");
    const fullUrl = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : `${baseUrl}/chat/completions`;
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.env.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`LLM API request failed: ${response.status} ${errorText}`);
    }

    const raw = (await response.json()) as OpenAICompatibleChatCompletionsResponse;
    const content = raw?.choices?.[0]?.message?.content ?? "";
    if (!content || typeof content !== "string") {
      throw new Error("LLM API response did not contain message content.");
    }

    return { content, raw };
  }
}
