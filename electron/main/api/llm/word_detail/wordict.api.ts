import { ipcMain, BrowserWindow } from "electron";
import { getLLMClient } from "../core/llmFactory";
import { runPrompt } from "../core/promptRunner";
import { wordDictPrompt } from "../prompts/word_detail/dict.prompt";

export function setupWordDictApiHandler(): void {
  ipcMain.on("word-dict-request", async (event, payload: { word: string; model?: string }) => {
    const window = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
    if (!window) return;

    const sendError = (message: string): void => {
      event.sender.send("word-dict-error", message);
    };

    try {
      const word = typeof payload.word === "string" ? payload.word.trim() : "";
      if (!word) {
        sendError("缺少必要的参数: word");
        return;
      }
      const result = await runPrompt(
        getLLMClient(),
        wordDictPrompt,
        { word },
        { model: payload.model }
      );
      window.webContents.send("word-dict-response", result);
    } catch (error: unknown) {
      console.error("[LLM/word_dict] Server error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal Server Error";
      sendError(errorMessage);
    }
  });
}
