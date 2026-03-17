/**
 * epub-img:// custom protocol handler
 *
 * URL format:  epub-img://{bookId}/{manifestId}/{zipInternalPath...}
 *
 * The `epub` npm package rewrites <img src> in chapter HTML to:
 *   {imageroot}{manifestId}/{zipInternalPath}
 *
 * When epubService creates an EPub instance with:
 *   imageroot = "epub-img://{bookId}/"
 *
 * ...the chapter HTML will already contain URLs like:
 *   epub-img://abc123/cover-img/OEBPS/Images/cover.jpg
 *
 * This handler reads the resource from the stored EPUB zip and
 * returns it with the appropriate MIME type.
 */

import { protocol, app } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import AdmZip, { IZipEntry } from "adm-zip";

const SCHEME = "epub-img";
const EPUB_LIBRARY_DIR = "library/epub";

/**
 * Simple LRU cache for AdmZip instances.
 * We keep at most MAX_CACHED_BOOKS books open to avoid re-parsing the zip
 * on every single image request (a chapter with 20 images would otherwise
 * open+parse the zip 20 times).
 */
const MAX_CACHED_BOOKS = 3;
const zipCache = new Map<string, AdmZip>();

function getOrOpenZip(epubFilePath: string, bookId: string): AdmZip {
  // LRU: if already cached, move it to the "most recently used" position
  if (zipCache.has(bookId)) {
    const existing = zipCache.get(bookId)!;
    // Re-insert to update Map insertion order (used as LRU order)
    zipCache.delete(bookId);
    zipCache.set(bookId, existing);
    return existing;
  }

  // Evict the least-recently-used entry if we're at capacity
  if (zipCache.size >= MAX_CACHED_BOOKS) {
    const lruKey = zipCache.keys().next().value;
    if (lruKey !== undefined) {
      zipCache.delete(lruKey);
    }
  }

  const zip = new AdmZip(epubFilePath);
  zipCache.set(bookId, zip);
  return zip;
}

/**
 * Must be called BEFORE app is ready, alongside the main import chain.
 * Registers the scheme so Electron treats it as a privileged, fetch-capable scheme.
 */
export function registerEpubImageScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true,
        corsEnabled: false,
      },
    },
  ]);
}

/**
 * Must be called AFTER app is ready (inside app.whenReady()).
 * Handles actual epub-img:// requests by reading from the EPUB zip file.
 */
export function setupEpubImageProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const url = new URL(request.url);

      // url.hostname = bookId
      // url.pathname = /{manifestId}/{zipInternalPath...}
      const bookId = url.hostname;
      // strip leading slash from pathname and extract the zip path
      // pathname example: "/cover-img/OEBPS/Images/cover.jpg"
      // We drop the first segment (manifestId) since it's only needed for
      // routing — the actual zip path follows after it.
      const pathParts = url.pathname.replace(/^\//, "").split("/");
      // pathParts[0] = manifestId (routing hint, not used for zip lookup)
      // pathParts[1..] = actual zip-internal path
      const zipInternalPath = pathParts.slice(1).join("/");

      if (!bookId || !zipInternalPath) {
        return new Response("Not found", { status: 404 });
      }

      const userDataPath = app.getPath("userData");
      const epubFilePath = path.join(
        userDataPath,
        EPUB_LIBRARY_DIR,
        `${bookId}.epub`
      );

      // Verify the file exists
      try {
        await fs.access(epubFilePath);
      } catch {
        console.warn(`[epub-img] EPUB file not found for bookId: ${bookId}`);
        // Also evict stale cache entry if the file is gone
        zipCache.delete(bookId);
        return new Response("Not found", { status: 404 });
      }

      // Use cached zip handle (LRU, max 3 books)
      const zip = getOrOpenZip(epubFilePath, bookId);
      const entry = zip.getEntry(zipInternalPath);

      if (!entry) {
        // Try case-insensitive lookup as some EPUBs have inconsistent casing
        const allEntries = zip.getEntries();
        const normalizedTarget = zipInternalPath.toLowerCase();
        const found = allEntries.find(
          (e: IZipEntry) => e.entryName.toLowerCase() === normalizedTarget
        );
        if (!found) {
          console.warn(
            `[epub-img] Entry not found in zip: ${zipInternalPath} (bookId: ${bookId})`
          );
          return new Response("Not found", { status: 404 });
        }
        const data = new Uint8Array(found.getData());
        const mimeType = guessMimeType(found.entryName);
        return new Response(data, {
          status: 200,
          headers: { "Content-Type": mimeType },
        });
      }

      const data = new Uint8Array(entry.getData());
      const mimeType = guessMimeType(zipInternalPath);

      return new Response(data, {
        status: 200,
        headers: { "Content-Type": mimeType },
      });
    } catch (error) {
      console.error("[epub-img] Protocol handler error:", error);
      return new Response("Internal error", { status: 500 });
    }
  });
}

/**
 * Infers MIME type from file extension.
 */
function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".css": "text/css",
    ".xhtml": "application/xhtml+xml",
    ".html": "text/html",
    ".xml": "application/xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}
