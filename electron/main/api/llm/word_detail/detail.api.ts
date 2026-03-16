import { ipcMain } from "electron";

import { getLLMClient } from "../core/llmFactory";
import { runPrompt } from "../core/promptRunner";
import {
  wordDetailPrompt,
  type WordDetailPromptInput,
} from "../prompts/word_detail/detail.prompt";

export function setupWordDetailApiHandler(): void {
  ipcMain.handle(
    "word-detail-request",
    async (
      _event,
      {
        word,
        pos,
        sentence,
        furigana,
        romaji,
        model,
      }: {
        word: string;
        pos: string;
        sentence: string;
        furigana: string;
        romaji: string;
        model?: string;
      }
    ) => {
      if (!word || !pos || !sentence) {
        throw new Error("缺少必要的参数");
      }

      const input: WordDetailPromptInput = {
        word,
        pos,
        sentence,
        furigana,
        romaji,
      };

      return runPrompt(
        getLLMClient(),
        wordDetailPrompt,
        input,
        { model }
      );
    }
  );
}
