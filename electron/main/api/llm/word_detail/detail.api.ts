import { ipcMain, BrowserWindow } from "electron";

import { getLLMClient } from "../core/llmFactory";
import { runPrompt } from "../core/promptRunner";
import {
  wordDetailPrompt,
  type WordDetailPromptInput,
} from "../prompts/word_detail/detail.prompt";

export function setupWordDetailApiHandler(): void {
  ipcMain.on(
    "word-detail-request",
    async (
      event,
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
      const window = BrowserWindow.fromWebContents(
        event.sender
      ) as BrowserWindow;
      if (!window) return;

      const sendError = (message: string) => {
        event.sender.send("word-detail-error", message);
      };

      try {
        if (!word || !pos || !sentence) {
          sendError("缺少必要的参数");
          return;
        }

        const input: WordDetailPromptInput = {
          word,
          pos,
          sentence,
          furigana,
          romaji,
        };

        const wordDetail = await runPrompt(
          getLLMClient(),
          wordDetailPrompt,
          input,
          { model }
        );

        window.webContents.send("word-detail-response", wordDetail);
      } catch (error: unknown) {
        console.error("[LLM/word_detail] Server error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Internal Server Error";
        sendError(errorMessage);
      }
    }
  );
}
