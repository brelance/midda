/**
 * Comic archive (CBZ / CBR) parsing service.
 *
 * CBZ = ZIP of images, CBR = RAR of images.
 * Both use natural sort order on filenames to determine page order.
 * The first image is used as the cover.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import type { ImportedBookData, BookFormat } from "../../../../src/types/types";

// ── CBR extraction cache (avoid re-extracting entire RAR per page) ─────────
const cbrExtractCache = new Map<
  string,
  { name: string; data: Buffer }[]
>();
const CBR_CACHE_MAX = 3;


// ── Image file detection ───────────────────────────────────────────────────

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i;

function isImageEntry(name: string): boolean {
  // Ignore macOS metadata folders
  if (name.startsWith("__MACOSX/") || name.includes("/.")) return false;
  return IMAGE_EXTS.test(name);
}

// ── Natural sort ───────────────────────────────────────────────────────────

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// ── MIME type ───────────────────────────────────────────────────────────────

function mimeForExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
  };
  return map[ext] ?? "application/octet-stream";
}

// ── ID generation ──────────────────────────────────────────────────────────

async function generateBookId(filePath: string): Promise<string> {
  try {
    const stat = await fs.stat(filePath);
    const hash = createHash("sha1");
    hash.update(path.resolve(filePath));
    hash.update(String(Math.floor(stat.mtimeMs)));
    return hash.digest("base64url").slice(0, 16);
  } catch {
    const hash = createHash("sha1");
    hash.update(path.resolve(filePath));
    hash.update(String(Date.now()));
    return hash.digest("base64url").slice(0, 16);
  }
}

// ── Title extraction ───────────────────────────────────────────────────────

function titleFromFilename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

// ── CBZ parsing (ZIP) ──────────────────────────────────────────────────────

export class ComicService {
  /**
   * Parse a CBZ (ZIP-based) comic archive.
   * Returns metadata + cover + total page count (images NOT loaded into memory).
   */
  async parseCbz(filePath: string): Promise<ImportedBookData> {
    const id = await generateBookId(filePath);
    const zip = new AdmZip(filePath);
    const entries = zip
      .getEntries()
      .filter((e) => !e.isDirectory && isImageEntry(e.entryName))
      .sort((a, b) => naturalSort(a.entryName, b.entryName));

    if (entries.length === 0) {
      throw new Error("CBZ 文件中未找到图片");
    }

    // Extract cover from first image
    const coverEntry = entries[0];
    const coverBuffer = coverEntry.getData();
    const coverMime = mimeForExt(coverEntry.entryName);
    const cover = `data:${coverMime};base64,${coverBuffer.toString("base64")}`;

    return {
      id,
      title: titleFromFilename(filePath),
      author: "未知作者",
      cover,
      format: "cbz",
      filePath,
      addedDate: new Date(),
      progress: 0,
      status: "not-started",
      totalPages: entries.length,
      metadata: {
        title: titleFromFilename(filePath),
        creator: "未知作者",
        language: "unknown",
        identifier: id,
        sourcePath: filePath,
      },
    };
  }

  /**
   * Get a specific page image from a CBZ file (1-indexed).
   * Returns a data URL string.
   */
  getCbzPage(
    filePath: string,
    pageNumber: number
  ): { dataUrl: string; width: number; height: number } {
    const zip = new AdmZip(filePath);
    const entries = zip
      .getEntries()
      .filter((e) => !e.isDirectory && isImageEntry(e.entryName))
      .sort((a, b) => naturalSort(a.entryName, b.entryName));

    const idx = pageNumber - 1;
    if (idx < 0 || idx >= entries.length) {
      throw new Error(`页码 ${pageNumber} 超出范围（共 ${entries.length} 页）`);
    }

    const entry = entries[idx];
    const buffer = entry.getData();
    const mime = mimeForExt(entry.entryName);
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    // Basic dimension detection from buffer headers (best-effort)
    const dims = detectImgDimensions(buffer);

    return {
      dataUrl,
      width: dims.width,
      height: dims.height,
    };
  }

  /**
   * Parse a CBR (RAR-based) comic archive.
   */
  async parseCbr(filePath: string): Promise<ImportedBookData> {
    const { createExtractorFromFile } = await import("node-unrar-js");
    const id = await generateBookId(filePath);

    const extractor = await createExtractorFromFile({ filepath: filePath });
    const { files } = extractor.extract();

    const imageFiles: { name: string; extraction: Uint8Array }[] = [];
    for (const file of files) {
      if (
        file.fileHeader &&
        !file.fileHeader.flags.directory &&
        isImageEntry(file.fileHeader.name) &&
        file.extraction
      ) {
        imageFiles.push({
          name: file.fileHeader.name,
          extraction: file.extraction,
        });
      }
    }

    imageFiles.sort((a, b) => naturalSort(a.name, b.name));

    if (imageFiles.length === 0) {
      throw new Error("CBR 文件中未找到图片");
    }

    // Cover from first image
    const coverFile = imageFiles[0];
    const coverMime = mimeForExt(coverFile.name);
    const cover = `data:${coverMime};base64,${Buffer.from(coverFile.extraction).toString("base64")}`;

    return {
      id,
      title: titleFromFilename(filePath),
      author: "未知作者",
      cover,
      format: "cbr",
      filePath,
      addedDate: new Date(),
      progress: 0,
      status: "not-started",
      totalPages: imageFiles.length,
      metadata: {
        title: titleFromFilename(filePath),
        creator: "未知作者",
        language: "unknown",
        identifier: id,
        sourcePath: filePath,
      },
    };
  }

  /**
   * Get a specific page image from a CBR file (1-indexed).
   */
  async getCbrPage(
    filePath: string,
    pageNumber: number
  ): Promise<{ dataUrl: string; width: number; height: number }> {
    // Use cache to avoid re-extracting entire RAR
    let imageFiles = cbrExtractCache.get(filePath);

    if (!imageFiles) {
      const { createExtractorFromFile } = await import("node-unrar-js");
      const extractor = await createExtractorFromFile({ filepath: filePath });
      const { files } = extractor.extract();

      const extracted: { name: string; data: Buffer }[] = [];
      for (const file of files) {
        if (
          file.fileHeader &&
          !file.fileHeader.flags.directory &&
          isImageEntry(file.fileHeader.name) &&
          file.extraction
        ) {
          extracted.push({
            name: file.fileHeader.name,
            data: Buffer.from(file.extraction),
          });
        }
      }

      extracted.sort((a, b) => naturalSort(a.name, b.name));
      cbrExtractCache.set(filePath, extracted);

      // Evict old entries if cache is full
      if (cbrExtractCache.size > CBR_CACHE_MAX) {
        const oldest = cbrExtractCache.keys().next().value;
        if (oldest) cbrExtractCache.delete(oldest);
      }

      imageFiles = extracted;
    }

    const idx = pageNumber - 1;
    if (idx < 0 || idx >= imageFiles.length) {
      throw new Error(
        `页码 ${pageNumber} 超出范围（共 ${imageFiles.length} 页）`
      );
    }

    const file = imageFiles[idx];
    const mime = mimeForExt(file.name);
    const dataUrl = `data:${mime};base64,${file.data.toString("base64")}`;
    const dims = detectImgDimensions(file.data);

    return { dataUrl, width: dims.width, height: dims.height };
  }

  /**
   * Detect format from file extension.
   */
  static detectFormat(filePath: string): BookFormat | null {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".cbz":
        return "cbz";
      case ".cbr":
        return "cbr";
      case ".pdf":
        return "pdf";
      case ".epub":
        return "epub";
      default:
        return null;
    }
  }
}

// ── Image dimension detection (best-effort from buffer) ────────────────────

function detectImgDimensions(buf: Buffer): {
  width: number;
  height: number;
} {
  // PNG: width at bytes 16-19, height at bytes 20-23
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }

  // JPEG: search for SOF0/SOF2 marker
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      // SOF0, SOF1, SOF2, SOF3
      if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc1) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }
      const segLen = buf.readUInt16BE(offset + 2);
      offset += segLen + 2;
    }
  }

  // Fallback — return placeholder dimensions
  return { width: 800, height: 1200 };
}
