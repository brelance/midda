import { promises as fs } from "node:fs";
import path from "node:path";
import { fileTypeFromFile } from "file-type";
import { EpubValidationError } from "./errors";

export interface ValidateOptions {
  maxSizeBytes?: number;
}

const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function assertValidEpub(
  filePath: string,
  options: ValidateOptions = {}
): Promise<void> {
  const { maxSizeBytes = DEFAULT_MAX_SIZE } = options;
  const normalizedPath = filePath?.trim();

  if (!normalizedPath) {
    throw new EpubValidationError("未提供有效的 EPUB 文件路径");
  }

  // 1. 存在性检查
  try {
    await fs.access(normalizedPath);
  } catch (error) {
    throw new EpubValidationError("EPUB 文件不存在或无法访问", error);
  }

  // 2. 扩展名检查
  const ext = path.extname(normalizedPath).toLowerCase();
  if (ext !== ".epub") {
    throw new EpubValidationError("请选择以 .epub 结尾的文件");
  }

  // 3. 文件头检查（容忍部分打包工具识别为 zip）
  let detectedType: Awaited<ReturnType<typeof fileTypeFromFile>> | undefined;
  try {
    detectedType = await fileTypeFromFile(normalizedPath);
  } catch (error) {
    // 部分 EPUB 解析工具会导致 file-type 解析失败，保留扩展名校验即可
    detectedType = undefined;
  }

  if (
    detectedType &&
    detectedType.ext !== "epub" &&
    detectedType.ext !== "zip" &&
    detectedType.mime !== "application/epub+zip"
  ) {
    throw new EpubValidationError(
      `不支持的文件类型: ${detectedType.mime ?? detectedType.ext}`
    );
  }

  // 4. 文件大小限制
  try {
    const stat = await fs.stat(normalizedPath);
    if (stat.size > maxSizeBytes) {
      throw new EpubValidationError(
        `文件过大 (${Math.round(stat.size / (1024 * 1024))}MB)，请导入不超过 ${
          maxSizeBytes / (1024 * 1024)
        }MB 的 EPUB`
      );
    }
  } catch (error) {
    if (error instanceof EpubValidationError) {
      throw error;
    }
    throw new EpubValidationError("无法读取文件大小", error);
  }
}
