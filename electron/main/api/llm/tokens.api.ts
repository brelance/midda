import { ipcMain, IpcMainInvokeEvent } from "electron";
import type { TokenData } from "../../../../src/types/types";
import { getLLMClient } from "./core/llmFactory";
import { runPrompt } from "./core/promptRunner";
import { tokensPrompt } from "./prompts/tokens.prompt";

export function setupTokensApiHandler(): void {
  ipcMain.handle(
    "llm:tokens",
    async (
      _event: IpcMainInvokeEvent,
      payload: { sentence: string; language?: string; model?: string }
    ): Promise<TokenData[]> => {
      if (!payload?.sentence || typeof payload.sentence !== "string") {
        throw new Error("缺少待分析的句子");
      }

      console.log(
        `[LLM/tokens] language=${payload.language ?? "auto"} sentence:`,
        payload.sentence
      );

      return runPrompt(
        getLLMClient(),
        tokensPrompt,
        { sentence: payload.sentence, language: payload.language },
        { model: payload.model }
      );
    }
  );
}
