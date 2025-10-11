import { BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { EPUBService, type ParseProgress } from "./epubService";
import { assertValidEpub } from "./validators";
import { copyToLibrary } from "./storage";
import { EpubBaseError, EpubValidationError } from "./errors";

function formatIpcError(error: unknown): Error {
  if (error instanceof EpubBaseError) {
    const ipcError = new Error(error.message);
    (ipcError as any).code = error.code;
    if (error.stage) {
      (ipcError as any).stage = error.stage;
    }
    return ipcError;
  }

  if (error instanceof Error) {
    return error;
  }

  const fallback = new Error("EPUB 导入失败");
  (fallback as any).code = "EPUB_PARSE_FAILED";
  return fallback;
}

function normalizePath(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new EpubValidationError("未提供可用的 EPUB 文件路径");
  }

  const resolved = path.resolve(input);
  return resolved;
}

export function setupEpubApiHandler(): void {
  const epubService = new EPUBService();

  ipcMain.handle("epub:select-file", async (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;

    const result = await dialog.showOpenDialog(parentWindow, {
      properties: ["openFile"],
      filters: [
        { name: "EPUB Files", extensions: ["epub"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle("epub:parse-file", async (event, rawFilePath: string) => {
    const webContents = event.sender;
    const sendProgress = (progress: ParseProgress) => {
      webContents.send("epub:parse-progress", progress);
    };

    try {
      const filePath = normalizePath(rawFilePath);
      await assertValidEpub(filePath);

      const bookData = await epubService.parseEpubFile(filePath, {
        sourcePath: filePath,
        onProgress: sendProgress,
      });

      const storedPath = await copyToLibrary(filePath, bookData.id);
      bookData.filePath = storedPath;

      return bookData;
    } catch (error) {
      console.error("EPUB解析失败:", error);
      throw formatIpcError(error);
    }
  });

  ipcMain.handle("epub:get-cover", async (_, rawFilePath: string) => {
    try {
      const filePath = normalizePath(rawFilePath);
      await assertValidEpub(filePath);
      return await epubService.extractCoverFromFile(filePath);
    } catch (error) {
      console.error("封面提取失败:", error);
      throw formatIpcError(error);
    }
  });
}
