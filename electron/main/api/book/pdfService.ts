/**
 * PDF parsing service (main process).
 *
 * Extracts metadata and page count from PDF files WITHOUT pdfjs-dist.
 * pdfjs-dist uses browser APIs (DOMMatrix, Web Workers) that don't exist
 * in Electron's main process, so we parse the PDF binary directly.
 *
 * Page rendering is done in the renderer process (ImagePageViewer)
 * via pdfjs-dist's browser build.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ImportedBookData } from "../../../../src/types/types";

// ── Title extraction ───────────────────────────────────────────────────────

function titleFromFilename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

// ── ID generation ──────────────────────────────────────────────────────────

async function generatePdfId(filePath: string): Promise<string> {
  try {
    const stat = await fs.stat(filePath);
    const hash = createHash("sha1");
    hash.update(path.resolve(filePath));
    hash.update(String(Math.floor(stat.mtimeMs)));
    return `pdf-${hash.digest("base64url").slice(0, 14)}`;
  } catch {
    const hash = createHash("sha1");
    hash.update(path.resolve(filePath));
    hash.update(String(Date.now()));
    return `pdf-${hash.digest("base64url").slice(0, 14)}`;
  }
}

// ── Lightweight PDF parsing (no pdfjs-dist needed) ─────────────────────────

/**
 * Count pages by scanning for /Type /Page objects in the PDF cross-reference.
 * This reads the raw bytes and counts page-object markers without needing
 * a full PDF renderer.
 */
function countPdfPages(buffer: Buffer): number {
  // Strategy: count occurrences of "/Type /Page" (not "/Type /Pages")
  // in the PDF raw text. This is a well-known lightweight approach.
  const text = buffer.toString("latin1");
  const regex = /\/Type\s*\/Page(?!s)\b/g;
  let count = 0;
  while (regex.exec(text)) count++;
  return Math.max(count, 1); // At least 1 page
}

/**
 * Extract PDF Info dictionary values (Title, Author) from raw bytes.
 */
function extractPdfInfo(buffer: Buffer): { title?: string; author?: string } {
  const text = buffer.toString("latin1");
  const result: { title?: string; author?: string } = {};

  // Match /Title (string) or /Title <hex>
  const titleMatch = text.match(/\/Title\s*\(([^)]*)\)/);
  if (titleMatch?.[1]) {
    result.title = decodePdfString(titleMatch[1]);
  }

  const authorMatch = text.match(/\/Author\s*\(([^)]*)\)/);
  if (authorMatch?.[1]) {
    result.author = decodePdfString(authorMatch[1]);
  }

  return result;
}

/**
 * Decode a PDF string literal (handle common escape sequences and UTF-16BE BOM).
 */
function decodePdfString(raw: string): string {
  // Check for UTF-16BE BOM (\xFE\xFF)
  if (raw.charCodeAt(0) === 0xfe && raw.charCodeAt(1) === 0xff) {
    // Decode UTF-16BE
    const bytes: number[] = [];
    for (let i = 2; i < raw.length; i++) {
      bytes.push(raw.charCodeAt(i));
    }
    const u16 = new Uint8Array(bytes);
    const decoder = new TextDecoder("utf-16be");
    return decoder.decode(u16);
  }

  // PDFDocEncoding / ASCII with escape sequences
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")");
}

// ── Service ────────────────────────────────────────────────────────────────

export class PdfService {
  /**
   * Parse a PDF file and return metadata + page count.
   * No page rendering happens here (that's the renderer's job).
   */
  async parsePdf(filePath: string): Promise<ImportedBookData> {
    const id = await generatePdfId(filePath);
    const buffer = await fs.readFile(filePath);

    const totalPages = countPdfPages(buffer);
    const info = extractPdfInfo(buffer);

    const title = info.title || titleFromFilename(filePath);
    const author = info.author || "未知作者";

    return {
      id,
      title,
      author,
      cover: undefined, // Cover will be rendered client-side
      format: "pdf",
      filePath,
      addedDate: new Date(),
      progress: 0,
      status: "not-started",
      totalPages,
      metadata: {
        title,
        creator: author,
        language: "unknown",
        identifier: id,
        sourcePath: filePath,
      },
    };
  }

  /**
   * Read the raw PDF file bytes for renderer-side rendering.
   */
  async readPdfBytes(filePath: string): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(filePath));
  }
}
