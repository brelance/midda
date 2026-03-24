/**
 * Generic book API – IPC handlers for multi-format book import.
 *
 * Channels:
 *   book:select-file   → open file picker for any supported format
 *   book:parse-file    → detect format, parse, copy to library, return ImportedBookData
 *   book:get-page      → retrieve a single page image (CBZ/CBR/PDF)
 *   book:remove-from-library → delete a book's stored file
 */

import { dialog, ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import { ComicService } from "./comicService";
import { PdfService } from "./pdfService";
import {
  copyBookToLibrary,
  removeBookFromLibrary,
  detectBookFormat,
} from "./bookStorage";
import type { BookFormat } from "../../../../src/types/types";

const comicService = new ComicService();
const pdfService = new PdfService();

export function setupBookApiHandlers(): void {
  // ── Select file ────────────────────────────────────────────────────────
  ipcMain.handle("book:select-file", async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [
        {
          name: "书籍文件",
          extensions: ["epub", "cbz", "cbr", "pdf"],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ── Parse file ─────────────────────────────────────────────────────────
  ipcMain.handle("book:parse-file", async (_event, filePath: string) => {
    const format = detectBookFormat(filePath);
    if (!format) {
      throw new Error(`不支持的文件格式: ${path.extname(filePath)}`);
    }

    let bookData;

    switch (format) {
      case "cbz":
        bookData = await comicService.parseCbz(filePath);
        break;
      case "cbr":
        bookData = await comicService.parseCbr(filePath);
        break;
      case "pdf":
        bookData = await pdfService.parsePdf(filePath);
        break;
      case "epub":
        // For EPUB, redirect to the existing epub:parse-file handler
        throw new Error("请使用 epub:parse-file 导入 EPUB");
      default:
        throw new Error(`未知格式: ${format}`);
    }

    // Copy to library
    const libraryPath = await copyBookToLibrary(
      filePath,
      bookData.id,
      format
    );
    bookData.filePath = libraryPath;

    return bookData;
  });

  // ── Get page image ─────────────────────────────────────────────────────
  ipcMain.handle(
    "book:get-page",
    async (
      _event,
      _bookId: string,
      filePath: string,
      format: BookFormat,
      pageNumber: number
    ) => {
      switch (format) {
        case "cbz":
          return comicService.getCbzPage(filePath, pageNumber);
        case "cbr":
          return comicService.getCbrPage(filePath, pageNumber);
        case "pdf":
          // PDF rendering happens client-side; this shouldn't be called
          throw new Error("PDF 页面需在渲染进程中渲染，请使用 book:read-pdf-bytes");
        default:
          throw new Error(`格式 ${format} 不支持 get-page 操作`);
      }
    }
  );

  // ── Remove from library ────────────────────────────────────────────────
  ipcMain.handle(
    "book:remove-from-library",
    async (_event, bookId: string, format: BookFormat) => {
      try {
        await removeBookFromLibrary(bookId, format);
        return true;
      } catch (error) {
        console.error("[book:remove-from-library]", error);
        return false;
      }
    }
  );

  // ── Read PDF bytes (for renderer-side rendering) ─────────────────────
  ipcMain.handle(
    "book:read-pdf-bytes",
    async (_event, filePath: string) => {
      try {
        return await pdfService.readPdfBytes(filePath);
      } catch (error) {
        console.error("[book:read-pdf-bytes]", error);
        throw error;
      }
    }
  );
}
