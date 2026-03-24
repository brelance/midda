/**
 * PDF parsing service (main process).
 *
 * Extracts metadata and page count from PDF files.
 * Page rendering is done in the renderer process (ImagePageViewer)
 * via pdfjs-dist's browser build, not here.
 *
 * For the cover, we skip rendering in main process and
 * let the renderer handle it on first paint.
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

// ── Lazy singleton for pdfjs ───────────────────────────────────────────────

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib(): Promise<typeof import("pdfjs-dist")> {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  return pdfjsLib;
}

export class PdfService {
  /**
   * Parse a PDF file and return metadata + page count.
   * No page rendering happens here (that's the renderer's job).
   */
  async parsePdf(filePath: string): Promise<ImportedBookData> {
    const pdfjs = await getPdfjsLib();
    const id = await generatePdfId(filePath);

    const data = new Uint8Array(await fs.readFile(filePath));
    const doc = await pdfjs.getDocument({
      data,
      useSystemFonts: true,
    }).promise;

    const totalPages = doc.numPages;

    // Extract metadata
    const metadata = await doc.getMetadata().catch(() => null);
    const info = metadata?.info as Record<string, string> | undefined;
    const pdfTitle = info?.["Title"] ?? "";
    const pdfAuthor = info?.["Author"] ?? "";

    const title = pdfTitle || titleFromFilename(filePath);
    const author = pdfAuthor || "未知作者";

    doc.destroy();

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
