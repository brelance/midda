/**
 * useImagePageLoader — shared hook for loading pages from PDF/CBZ/CBR books.
 *
 * Extracted from ImagePageViewer to be reusable by both single-page
 * and continuous-scroll viewers.
 */

import { useCallback, useEffect, useRef } from "react";

interface PageCache {
  dataUrl: string;
  width: number;
  height: number;
}

interface UseImagePageLoaderOptions {
  bookId: string;
  filePath: string;
  format: string;
}

export function useImagePageLoader({
  bookId,
  filePath,
  format,
}: UseImagePageLoaderOptions) {
  const pageCacheRef = useRef<Map<number, PageCache>>(new Map());
  const pdfDocRef = useRef<any>(null);
  const pdfBytesLoadedRef = useRef<string | null>(null);

  // Cleanup PDF document on unmount
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
        pdfBytesLoadedRef.current = null;
      }
    };
  }, []);

  const loadPage = useCallback(
    async (page: number): Promise<PageCache | null> => {
      const cached = pageCacheRef.current.get(page);
      if (cached) return cached;

      try {
        let pageData: PageCache;

        if (format === "pdf") {
          const pdfjs = await import("pdfjs-dist");

          if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
              "pdfjs-dist/build/pdf.worker.mjs",
              import.meta.url
            ).href;
          }

          if (!pdfDocRef.current || pdfBytesLoadedRef.current !== filePath) {
            if (pdfDocRef.current) pdfDocRef.current.destroy();
            const bytes = await window.api.book.readPdfBytes(filePath);
            pdfDocRef.current = await pdfjs.getDocument({ data: bytes }).promise;
            pdfBytesLoadedRef.current = filePath;
          }

          const pdfPage = await pdfDocRef.current.getPage(page);
          const scale = 2.0;
          const viewport = pdfPage.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d")!;

          await pdfPage.render({ canvasContext: ctx, viewport }).promise;

          pageData = {
            dataUrl: canvas.toDataURL("image/png"),
            width: canvas.width,
            height: canvas.height,
          };

          pdfPage.cleanup();
        } else {
          const result = await window.api.book.getPage(
            bookId,
            filePath,
            format,
            page
          );
          pageData = {
            dataUrl: result.dataUrl,
            width: result.width,
            height: result.height,
          };
        }

        pageCacheRef.current.set(page, pageData);

        // Evict old cache entries (keep max 30 pages for scroll mode)
        if (pageCacheRef.current.size > 30) {
          const keysToDelete: number[] = [];
          for (const key of pageCacheRef.current.keys()) {
            if (Math.abs(key - page) > 15) keysToDelete.push(key);
          }
          keysToDelete.forEach((k) => pageCacheRef.current.delete(k));
        }

        return pageData;
      } catch (err) {
        console.error(`Failed to load page ${page}:`, err);
        return null;
      }
    },
    [bookId, filePath, format]
  );

  const cleanup = useCallback(() => {
    pageCacheRef.current.clear();
    if (pdfDocRef.current) {
      pdfDocRef.current.destroy();
      pdfDocRef.current = null;
      pdfBytesLoadedRef.current = null;
    }
  }, []);

  return { loadPage, cleanup };
}

export type { PageCache };
