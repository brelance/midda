/**
 * OCR API — IPC handlers for text recognition.
 *
 * Channels:
 *   ocr:recognize-text     → native OS OCR
 *   ocr:is-available       → check native OCR availability
 *   ocr:manga-recognize    → PaddleOCR-VL 1.5 via official cloud API
 *   ocr:manga-cancel       → cancel an in-flight PaddleOCR request
 *   ocr:manga-is-ready     → check PaddleOCR service health
 */

import { ipcMain } from "electron";
import type { MangaOcrRequest } from "../../../../src/types/ocr";
import { recognizeText, isNativeOcrAvailable } from "./nativeOcr";
import {
  cancelPaddleOcrRequest,
  checkPaddleOcrHealth,
  isPaddleOcrCancelledError,
  recognizeWithPaddleOcr,
} from "./paddleOcr";

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
    async (_event, request: MangaOcrRequest) => {
      try {
        return await recognizeWithPaddleOcr(request);
      } catch (error: any) {
        if (!isPaddleOcrCancelledError(error)) {
          console.error("[ocr:manga-recognize]", error);
        }
        throw error;
      }
    }
  );

  ipcMain.handle("ocr:manga-cancel", async (_event, requestId: string) => {
    return cancelPaddleOcrRequest(requestId);
  });

  ipcMain.handle("ocr:manga-is-ready", async () => {
    return await checkPaddleOcrHealth();
  });
}
