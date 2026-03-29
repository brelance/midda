/**
 * ImagePageViewer – image-based page reader for CBZ/CBR/PDF formats.
 *
 * Features:
 * - Displays one page at a time from image-based book formats
 * - Supports keyboard navigation (left/right arrows)
 * - Click-to-turn-page zones (left 30% / right 30%)
 * - Preloads adjacent pages for smooth transitions
 * - Zoom: ⌘+/−, trackpad pinch, preset modes (fit-width/fit-page/actual)
 * - Drag-to-pan when zoomed beyond container
 * - Interactive progress slider (draggable)
 * - Click-to-edit page number input
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import OcrTextOverlay from "./OcrTextOverlay";
import PageTurnButton from "./PageTurnButton";
import type { OcrEngine } from "../../pages/ImageReaderPage/ImageReaderPage";
import { useImageReaderZoom } from "../../hooks/useImageReaderZoom";
import type { ZoomMode } from "../../hooks/useImageReaderZoom";
import "./ImagePageViewer.css";

export interface ImagePageViewerHandle {
  goToNextPage: () => boolean;
  goToPrevPage: () => boolean;
  goToPage: (page: number) => void;
  currentPage: number;
  totalPages: number;
  pageProgress: number;
  zoomLevel: number;
  zoomMode: ZoomMode;
  setZoomMode: (mode: "fit-width" | "fit-page" | "actual") => void;
  zoomIn: () => void;
  zoomOut: () => void;
  loadThumbnail: (page: number) => Promise<string | null>;
}

interface ImagePageViewerProps {
  bookId: string;
  filePath: string;
  format: string;
  totalPages: number;
  initialPage?: number;
  onPageChange?: (page: number, total: number, progress: number) => void;
  onZoomChange?: (level: number, mode: ZoomMode) => void;
  ocrEnabled?: boolean;
  ocrEngine?: OcrEngine;
  /** When false, the bottom bar slides off-screen */
  isFooterVisible?: boolean;
}

interface PageCache {
  dataUrl: string;
  width: number;
  height: number;
}

const ImagePageViewer = forwardRef<ImagePageViewerHandle, ImagePageViewerProps>(
  (
    {
      bookId,
      filePath,
      format,
      totalPages,
      initialPage = 1,
      onPageChange,
      onZoomChange,
      ocrEnabled = false,
      ocrEngine = "native",
      isFooterVisible = true,
    },
    ref
  ) => {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [currentImage, setCurrentImage] = useState<PageCache | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pageCacheRef = useRef<Map<number, PageCache>>(new Map());
    const onPageChangeRef = useRef(onPageChange);
    const imageElRef = useRef<HTMLImageElement | null>(null);

    // ── Page jump input state ─────────────────────────────────────────
    const [isPageInputVisible, setIsPageInputVisible] = useState(false);
    const [pageInputValue, setPageInputValue] = useState("");

    // ── Page turn animation state ───────────────────────────────
    const [pageTransitionDir, setPageTransitionDir] = useState<"left" | "right" | null>(null);
    const transitionKeyRef = useRef(0);

    useEffect(() => {
      onPageChangeRef.current = onPageChange;
    }, [onPageChange]);

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

    const pageProgress = useMemo(
      () => (totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0),
      [currentPage, totalPages]
    );

    // ── PDF document cache (for client-side rendering) ────────────────────
    const pdfDocRef = useRef<any>(null);
    const pdfBytesLoadedRef = useRef<string | null>(null);

    // ── Zoom hook ─────────────────────────────────────────────────────────
    const {
      zoomLevel,
      zoomMode,
      fittedZoom,
      containerRef,
      setZoomMode,
      zoomIn,
      zoomOut,
      resetPan,
      handleWheel,
      panHandlers,
      imageTransformStyle,
    } = useImageReaderZoom({
      imageWidth: currentImage?.width ?? 0,
      imageHeight: currentImage?.height ?? 0,
      onZoomChange,
    });

    // ── Load page image ──────────────────────────────────────────────────
    const loadPage = useCallback(
      async (page: number): Promise<PageCache | null> => {
        const cached = pageCacheRef.current.get(page);
        if (cached) return cached;

        try {
          let pageData: PageCache;

          if (format === "pdf") {
            // Client-side PDF rendering with pdfjs-dist
            const pdfjs = await import("pdfjs-dist");

            // Configure worker (once) for off-main-thread parsing
            if (!pdfjs.GlobalWorkerOptions.workerSrc) {
              pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.mjs",
                import.meta.url
              ).href;
            }
            // Load PDF document once
            if (!pdfDocRef.current || pdfBytesLoadedRef.current !== filePath) {
              if (pdfDocRef.current) pdfDocRef.current.destroy();
              const bytes = await window.api.book.readPdfBytes(filePath);
              pdfDocRef.current = await pdfjs.getDocument({ data: bytes }).promise;
              pdfBytesLoadedRef.current = filePath;
            }

            const pdfPage = await pdfDocRef.current.getPage(page);
            const scale = 2.0; // Retina
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
            // CBZ/CBR: use main-process IPC
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

          // Evict old cache entries (keep max 5 pages)
          if (pageCacheRef.current.size > 5) {
            const keysToDelete: number[] = [];
            for (const key of pageCacheRef.current.keys()) {
              if (Math.abs(key - page) > 2) keysToDelete.push(key);
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

    // ── Load current page + preload adjacent ─────────────────────────────
    useEffect(() => {
      let cancelled = false;
      setIsLoading(true);
      setError(null);

      (async () => {
        const data = await loadPage(currentPage);
        if (cancelled) return;

        if (data) {
          setCurrentImage(data);
          setIsLoading(false);
        } else {
          setError(`无法加载第 ${currentPage} 页`);
          setIsLoading(false);
        }

        // Preload adjacent pages
        if (currentPage > 1) void loadPage(currentPage - 1);
        if (currentPage < totalPages) void loadPage(currentPage + 1);
      })();

      return () => {
        cancelled = true;
      };
    }, [currentPage, loadPage, totalPages]);

    // ── Navigation ───────────────────────────────────────────────────────
    const goToNextPage = useCallback((): boolean => {
      if (currentPage >= totalPages) return false;
      setPageTransitionDir("right");
      transitionKeyRef.current += 1;
      setCurrentPage((p) => p + 1);
      resetPan();
      return true;
    }, [currentPage, totalPages, resetPan]);

    const goToPrevPage = useCallback((): boolean => {
      if (currentPage <= 1) return false;
      setPageTransitionDir("left");
      transitionKeyRef.current += 1;
      setCurrentPage((p) => p - 1);
      resetPan();
      return true;
    }, [currentPage, resetPan]);

    const goToPage = useCallback(
      (page: number) => {
        const clamped = Math.max(1, Math.min(totalPages, page));
        setCurrentPage(clamped);
        resetPan();
      },
      [totalPages, resetPan]
    );

    // Notify parent of page changes
    useEffect(() => {
      onPageChangeRef.current?.(currentPage, totalPages, pageProgress);
    }, [currentPage, totalPages, pageProgress]);

    // ── Keyboard navigation ──────────────────────────────────────────────
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        // Don't intercept when page input is active
        if (isPageInputVisible) return;
        // Don't intercept zoom shortcuts (handled by useImageReaderZoom)
        if (e.metaKey || e.ctrlKey) return;

        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          goToNextPage();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          goToPrevPage();
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [goToNextPage, goToPrevPage, isPageInputVisible]);

    // ── Page jump handlers ───────────────────────────────────────────────
    const handlePageIndicatorClick = useCallback(() => {
      setPageInputValue(String(currentPage));
      setIsPageInputVisible(true);
    }, [currentPage]);

    const handlePageInputConfirm = useCallback(() => {
      const parsed = parseInt(pageInputValue, 10);
      if (!isNaN(parsed)) {
        goToPage(parsed);
      }
      setIsPageInputVisible(false);
    }, [pageInputValue, goToPage]);

    const handlePageInputKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handlePageInputConfirm();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsPageInputVisible(false);
        }
      },
      [handlePageInputConfirm]
    );

    // ── Slider handler ───────────────────────────────────────────────────
    const handleSliderChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        goToPage(Number(e.target.value));
      },
      [goToPage]
    );

    // ── Thumbnail loader (for sidebar) ─────────────────────────────
    const loadThumbnailFn = useCallback(
      async (page: number): Promise<string | null> => {
        const data = await loadPage(page);
        return data?.dataUrl ?? null;
      },
      [loadPage]
    );

    // ── Imperative handle ────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        goToNextPage,
        goToPrevPage,
        goToPage,
        currentPage,
        totalPages,
        pageProgress,
        zoomLevel,
        zoomMode,
        setZoomMode,
        zoomIn,
        zoomOut,
        loadThumbnail: loadThumbnailFn,
      }),
      [goToNextPage, goToPrevPage, goToPage, currentPage, totalPages, pageProgress, zoomLevel, zoomMode, setZoomMode, zoomIn, zoomOut, loadThumbnailFn]
    );

    // Whether zoomed in enough to enable panning
    const isPannable = zoomLevel > fittedZoom;

    return (
      <div className="relative h-full w-full flex flex-col items-center bg-[#1a1a1a] overflow-hidden select-none">
        {/* Page image area */}
        <div
          ref={containerRef}
          className={`flex-1 flex items-center justify-center w-full ${isPannable ? 'overflow-auto' : 'overflow-hidden'}`}
          onWheel={handleWheel}
          {...(isPannable ? panHandlers : {})}
        >
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 text-red-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!isLoading && !error && currentImage && (
            <div
              key={transitionKeyRef.current}
              className={`relative ${
                pageTransitionDir === "right" ? "page-enter-right" :
                pageTransitionDir === "left" ? "page-enter-left" : ""
              }`}
              style={imageTransformStyle}
              onAnimationEnd={() => setPageTransitionDir(null)}
            >
              <img
                ref={imageElRef}
                src={currentImage.dataUrl}
                alt={`Page ${currentPage}`}
                className="w-full h-full object-contain"
                draggable={false}
              />
              {ocrEnabled && (
              <OcrTextOverlay
                  imageRef={imageElRef}
                  imageWidth={currentImage.width}
                  imageHeight={currentImage.height}
                  imageSource={currentImage.dataUrl}
                  enabled={ocrEnabled}
                  ocrEngine={ocrEngine}
                  bookId={bookId}
                  pageNumber={currentPage}
                />
              )}
            </div>
          )}

          {/* Click-to-turn page-turn buttons (same as EPUB paged mode) */}
          {!isPannable && (
            <>
              <PageTurnButton direction="prev" onClick={goToPrevPage} disabled={currentPage <= 1} />
              <PageTurnButton direction="next" onClick={goToNextPage} disabled={currentPage >= totalPages} />
            </>
          )}
        </div>

        {/* Bottom bar: page indicator + interactive slider + zoom info */}
        <div className={`
          flex-shrink-0 w-full px-6 py-3 bg-[#fdfdfd]/90 backdrop-blur-md border-t border-gray-200/80 flex items-center gap-3
          transition-transform duration-300 ease-in-out
          ${isFooterVisible ? 'translate-y-0' : 'translate-y-full'}
        `}>
          {/* Page indicator / jump input */}
          {isPageInputVisible ? (
            <input
              autoFocus
              type="number"
              min={1}
              max={totalPages}
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputConfirm}
              className="w-16 bg-black/[0.06] text-[#1d1d1f] text-sm text-center rounded-md px-1.5 py-1 border border-gray-200/80 outline-none focus:border-[#007aff]/40 focus:ring-1 focus:ring-[#007aff]/20 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          ) : (
            <button
              onClick={handlePageIndicatorClick}
              className="text-gray-500 hover:text-[#1d1d1f] text-sm tabular-nums transition-colors cursor-pointer whitespace-nowrap"
              title="点击跳转页码"
            >
              {currentPage} / {totalPages}
            </button>
          )}

          {/* Interactive range slider */}
          <input
            type="range"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handleSliderChange}
            className="image-reader-slider image-reader-slider--light flex-1 h-1 cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(0,122,255,0.7) ${pageProgress}%, rgba(0,0,0,0.08) ${pageProgress}%)`,
            }}
          />

          {/* Progress percentage */}
          <span className="text-gray-500 text-sm tabular-nums whitespace-nowrap">
            {pageProgress}%
          </span>
        </div>
      </div>
    );
  }
);

ImagePageViewer.displayName = "ImagePageViewer";
export default ImagePageViewer;
