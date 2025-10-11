import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { EpubStorageError } from "./errors";

const EPUB_LIBRARY_DIR = "library/epub";

async function ensureLibraryDir(): Promise<string> {
  const userDataPath = app.getPath("userData");
  const libraryPath = path.join(userDataPath, EPUB_LIBRARY_DIR);
  await fs.mkdir(libraryPath, { recursive: true });
  return libraryPath;
}

export async function copyToLibrary(
  sourcePath: string,
  targetId: string
): Promise<string> {
  try {
    const libraryPath = await ensureLibraryDir();
    const destinationPath = path.join(libraryPath, `${targetId}.epub`);

    if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
      return destinationPath;
    }

    await fs.copyFile(sourcePath, destinationPath);
    return destinationPath;
  } catch (error) {
    throw new EpubStorageError("无法保存 EPUB 文件副本", error);
  }
}

export async function removeFromLibrary(targetId: string): Promise<void> {
  try {
    const libraryPath = await ensureLibraryDir();
    const destinationPath = path.join(libraryPath, `${targetId}.epub`);
    await fs.unlink(destinationPath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw new EpubStorageError("删除 EPUB 文件副本失败", error);
  }
}

export async function resolveLibraryPath(): Promise<string> {
  try {
    return await ensureLibraryDir();
  } catch (error) {
    throw new EpubStorageError("无法访问 EPUB 库目录", error);
  }
}
