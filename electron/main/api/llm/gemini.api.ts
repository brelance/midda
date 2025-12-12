import { ipcMain, IpcMainInvokeEvent } from "electron";
import type { TokenData } from "../../../../src/types/types";
import { getLLMClient } from "./core/llmFactory";
import { runPrompt } from "./core/promptRunner";
import { tokensPrompt } from "./prompts/tokens.prompt";

export function setupGeminiApiHandler(): void {
  ipcMain.handle(
    "gemini-tokens-request",
    async (
      _event: IpcMainInvokeEvent,
      {
        sentence,
        language,
        model,
      }: { sentence: string; language?: string; model?: string }
    ): Promise<TokenData[]> => {
      if (!sentence || typeof sentence !== "string") {
        throw new Error("缺少待分析的句子");
      }

      console.log(
        `[LLM/tokens] language=${language ?? "auto"} sentence:`,
        sentence
      );

      try {
        const client = getLLMClient();
        const tokens = await runPrompt(
          client,
          tokensPrompt,
          { sentence, language },
          { model }
        );
        return tokens;
      } catch (error) {
        console.error("[LLM/tokens] Error:", error);
        throw error;
      }
    }
  );

  // New generic alias (keep the old one for backwards-compat).
  ipcMain.handle(
    "llm:tokens",
    async (
      _event: IpcMainInvokeEvent,
      payload: { sentence: string; language?: string; model?: string }
    ) =>
      runPrompt(
        getLLMClient(),
        tokensPrompt,
        { sentence: payload.sentence, language: payload.language },
        { model: payload.model }
      )
  );
}
