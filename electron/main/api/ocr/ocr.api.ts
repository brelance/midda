/**
 * OCR API — IPC handlers for text recognition.
 *
 * Channels:
 *   ocr:recognize-text     → native OS OCR
 *   ocr:is-available       → check native OCR availability
 *   ocr:manga-recognize    → manga-ocr ONNX inference
 *   ocr:manga-status       → check model download status
 *   ocr:manga-download     → download manga-ocr models
 */

import { ipcMain, BrowserWindow } from "electron";
import { recognizeText, isNativeOcrAvailable } from "./nativeOcr";
import {
  recognizeMangaText,
  getMangaOcrStatus,
  downloadMangaOcrModels,
  isMangaOcrReady,
} from "./mangaOcr";

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

  // ── Manga OCR ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "ocr:manga-recognize",
    async (_event, imageInput: string) => {
      try {
        return await recognizeMangaText(imageInput);
      } catch (error: any) {
        console.error("[ocr:manga-recognize]", error);
        throw error;
      }
    }
  );

  ipcMain.handle("ocr:manga-status", async () => {
    return await getMangaOcrStatus();
  });

  ipcMain.handle("ocr:manga-is-ready", async () => {
    return await isMangaOcrReady();
  });

  ipcMain.handle("ocr:manga-download", async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      await downloadMangaOcrModels((file, current, total) => {
        // Send progress to renderer
        win?.webContents.send("ocr:manga-download-progress", {
          file,
          current,
          total,
        });
      });
      return { success: true };
    } catch (error: any) {
      console.error("[ocr:manga-download]", error);
      throw error;
    }
  });
}
