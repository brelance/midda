/**
 * Generic book file storage service.
 * Copies imported book files to the app's userData directory.
 *
 * Directory structure:
 *   library/epub/{id}.epub
 *   library/cbz/{id}.cbz
 *   library/cbr/{id}.cbr
 *   library/pdf/{id}.pdf
 */

import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BookFormat } from "../../../../src/types/types";

const FORMAT_EXTENSIONS: Record<string, string> = {
  epub: ".epub",
  cbz: ".cbz",
  cbr: ".cbr",
  pdf: ".pdf",
};

function librarySubdir(format: BookFormat): string {
  return `library/${format}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function copyBookToLibrary(
  sourcePath: string,
  bookId: string,
  format: BookFormat
): Promise<string> {
  const userDataPath = app.getPath("userData");
  const dir = path.join(userDataPath, librarySubdir(format));
  await ensureDir(dir);

  const ext = FORMAT_EXTENSIONS[format] ?? path.extname(sourcePath);
  const destPath = path.join(dir, `${bookId}${ext}`);

  if (path.resolve(sourcePath) === path.resolve(destPath)) {
    return destPath;
  }

  await fs.copyFile(sourcePath, destPath);
  return destPath;
}

export async function removeBookFromLibrary(
  bookId: string,
  format: BookFormat
): Promise<void> {
  const userDataPath = app.getPath("userData");
  const ext = FORMAT_EXTENSIONS[format] ?? "";
  const filePath = path.join(
    userDataPath,
    librarySubdir(format),
    `${bookId}${ext}`
  );

  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

export function resolveBookPath(bookId: string, format: BookFormat): string {
  const userDataPath = app.getPath("userData");
  const ext = FORMAT_EXTENSIONS[format] ?? "";
  return path.join(userDataPath, librarySubdir(format), `${bookId}${ext}`);
}

/**
 * Detect book format from file extension.
 */
export function detectBookFormat(filePath: string): BookFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".cbz": return "cbz";
    case ".cbr": return "cbr";
    case ".pdf": return "pdf";
    case ".epub": return "epub";
    default: return null;
  }
}
