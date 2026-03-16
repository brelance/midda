import { ipcMain } from "electron";
import { getLLMClient } from "../core/llmFactory";
import { runPrompt } from "../core/promptRunner";
import { wordDictPrompt } from "../prompts/word_detail/dict.prompt";

export function setupWordDictApiHandler(): void {
  ipcMain.handle(
    "word-dict-request",
    async (_event, payload: { word: string; model?: string }) => {
      const word = typeof payload.word === "string" ? payload.word.trim() : "";
      if (!word) {
        throw new Error("缺少必要的参数: word");
      }

      return runPrompt(
        getLLMClient(),
        wordDictPrompt,
        { word },
        { model: payload.model }
      );
    }
  );
}
