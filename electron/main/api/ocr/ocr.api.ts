/**
 * OCR API — IPC handlers for text recognition.
 *
 * Channels:
 *   ocr:recognize-text     → native OS OCR
 *   ocr:is-available       → check native OCR availability
 *   ocr:manga-recognize    → PaddleOCR-VL 1.5 via vLLM
 *   ocr:manga-is-ready     → check PaddleOCR service health
 */

import { ipcMain } from "electron";
import { recognizeText, isNativeOcrAvailable } from "./nativeOcr";
import { recognizeWithPaddleOcr, checkPaddleOcrHealth } from "./paddleOcr";

export function setupOcrApiHandlers(): void {
  // ── Native OCR ────────────────────────────────────────────────────────
  ipcMain.handle(
    "ocr:recognize-text",
    async (_event, imageInput: string, languageHint?: string) => {
      try {
        return await recognizeText(imageInput, languageHint);
      } catch (error: any) {
        console.error("[ocr:recognize-text]", error);
        throw error;
      }
    }
  );

  ipcMain.handle("ocr:is-available", () => {
    return isNativeOcrAvailable();
  });

  // ── PaddleOCR-VL (replaces manga-ocr) ─────────────────────────────────
  ipcMain.handle(
    "ocr:manga-recognize",
    async (_event, imageInput: string) => {
      try {
        return await recognizeWithPaddleOcr(imageInput);
      } catch (error: any) {
        console.error("[ocr:manga-recognize]", error);
        throw error;
      }
    }
  );

  ipcMain.handle("ocr:manga-is-ready", async () => {
    return await checkPaddleOcrHealth();
  });
}
