/**
 * ImageScrollViewer — continuous vertical scroll viewer for PDF/CBZ/CBR.
 *
 * Renders all pages in a vertical scroll container with lazy loading
 * via IntersectionObserver. Only loads pages that are near the viewport.
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
import { useImagePageLoader } from "../../hooks/useImagePageLoader";
import type { PageCache } from "../../hooks/useImagePageLoader";
import { useImageReaderZoom } from "../../hooks/useImageReaderZoom";
import type { ZoomMode } from "../../hooks/useImageReaderZoom";
import OcrTextOverlay from "./OcrTextOverlay";
import type { OcrEngine } from "../../pages/ImageReaderPage/ImageReaderPage";

export interface ImageScrollViewerHandle {
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

interface ImageScrollViewerProps {
  bookId: string;
  filePath: string;
  format: string;
  totalPages: number;
  initialPage?: number;
  onPageChange?: (page: number, total: number, progress: number) => void;
  onZoomChange?: (level: number, mode: ZoomMode) => void;
  ocrEnabled?: boolean;
  ocrEngine?: OcrEngine;
}

const PAGE_GAP = 8;
const LOAD_MARGIN = "600px"; // preload pages within 600px of viewport

const ImageScrollViewer = forwardRef<ImageScrollViewerHandle, ImageScrollViewerProps>(
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
    },
    ref
  ) => {
    const { loadPage } = useImagePageLoader({ bookId, filePath, format });
    const [loadedPages, setLoadedPages] = useState<Map<number, PageCache>>(new Map());
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [isPageInputVisible, setIsPageInputVisible] = useState(false);
    const [pageInputValue, setPageInputValue] = useState("");
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
    const onPageChangeRef = useRef(onPageChange);
    const imageElRefsMap = useRef<Map<number, HTMLImageElement>>(new Map());
    const isScrollingToRef = useRef(false);
    const currentPageRef = useRef(initialPage);

    useEffect(() => {
      onPageChangeRef.current = onPageChange;
    }, [onPageChange]);

    // ── Determine representative page dimensions for zoom ────────────
    const firstLoaded = loadedPages.values().next().value as PageCache | undefined;

    const {
      zoomLevel,
      zoomMode,
      setZoomMode,
      zoomIn,
      zoomOut,
      handleWheel,
      imageTransformStyle: _imageTransformStyle,
    } = useImageReaderZoom({
      imageWidth: firstLoaded?.width ?? 0,
      imageHeight: firstLoaded?.height ?? 0,
      onZoomChange,
      externalContainerRef: scrollContainerRef,
    });

    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 2) || 2;

    const pageProgress = useMemo(
      () => (totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0),
      [currentPage, totalPages]
    );

    // ── Notify parent ────────────────────────────────────────────────
    useEffect(() => {
      onPageChangeRef.current?.(currentPage, totalPages, pageProgress);
    }, [currentPage, totalPages, pageProgress]);

    // ── Lazy-load pages via IntersectionObserver ─────────────────────
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (isNaN(page)) return;

            loadPage(page).then((data) => {
              if (data) {
                setLoadedPages((prev) => {
                  if (prev.has(page)) return prev;
                  return new Map(prev).set(page, data);
                });
              }
            });
          });
        },
        {
          root: scrollContainerRef.current,
          rootMargin: LOAD_MARGIN,
        }
      );

      pageRefsMap.current.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, [loadPage, totalPages]);

    // ── Track which page is most visible ─────────────────────────────
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingToRef.current) return;

          let maxRatio = 0;
          let maxPage = currentPageRef.current;

          entries.forEach((entry) => {
            if (entry.intersectionRatio > maxRatio) {
              maxRatio = entry.intersectionRatio;
              const p = Number((entry.target as HTMLElement).dataset.page);
              if (!isNaN(p)) maxPage = p;
            }
          });

          if (maxRatio > 0) {
            currentPageRef.current = maxPage;
            setCurrentPage(maxPage);
          }
        },
        {
          root: scrollContainerRef.current,
          threshold: [0, 0.25, 0.5, 0.75, 1.0],
        }
      );

      pageRefsMap.current.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, [totalPages]);

    // ── Scroll to initial page on mount ──────────────────────────────
    useEffect(() => {
      if (initialPage > 1) {
        const timeout = setTimeout(() => {
          const el = pageRefsMap.current.get(initialPage);
          if (el) {
            isScrollingToRef.current = true;
            el.scrollIntoView({ block: "start", behavior: "instant" });
            setTimeout(() => { isScrollingToRef.current = false; }, 100);
          }
        }, 100);
        return () => clearTimeout(timeout);
      }
    }, [initialPage]);

    // ── Navigation ──────────────────────────────────────────────────
    const goToPage = useCallback(
      (page: number) => {
        const clamped = Math.max(1, Math.min(totalPages, page));
        const el = pageRefsMap.current.get(clamped);
        if (el) {
          isScrollingToRef.current = true;
          el.scrollIntoView({ block: "start", behavior: "smooth" });
          setCurrentPage(clamped);
          setTimeout(() => { isScrollingToRef.current = false; }, 500);
        }
      },
      [totalPages]
    );

    // ── Thumbnail loader ────────────────────────────────────────────
    const loadThumbnailFn = useCallback(
      async (page: number): Promise<string | null> => {
        const data = await loadPage(page);
        return data?.dataUrl ?? null;
      },
      [loadPage]
    );

    // ── Register page ref ───────────────────────────────────────────
    const setPageRef = useCallback(
      (page: number) => (el: HTMLDivElement | null) => {
        if (el) {
          pageRefsMap.current.set(page, el);
        } else {
          pageRefsMap.current.delete(page);
        }
      },
      []
    );

    // ── Imperative handle ───────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
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
      [goToPage, currentPage, totalPages, pageProgress, zoomLevel, zoomMode, setZoomMode, zoomIn, zoomOut, loadThumbnailFn]
    );

    // Generate page numbers
    const pages = useMemo(
      () => Array.from({ length: totalPages }, (_, i) => i + 1),
      [totalPages]
    );

    return (
      <div className="relative h-full w-full flex flex-col bg-[#1a1a1a] overflow-hidden select-none">
        {/* Scrollable page container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onWheel={(e) => {
            // Only intercept pinch-to-zoom, not normal scroll
            if (e.ctrlKey) handleWheel(e);
          }}
          style={{ scrollBehavior: "auto" }}
        >
          <div className="flex flex-col items-center py-4" style={{ gap: PAGE_GAP }}>
            {pages.map((page) => {
              const pageData = loadedPages.get(page);
              const displayWidth = pageData ? (pageData.width / dpr) * zoomLevel : undefined;
              const displayHeight = pageData ? (pageData.height / dpr) * zoomLevel : undefined;
              const isOcrWindowPage = ocrEnabled && Math.abs(page - currentPage) <= 1;

              return (
                <div
                  key={page}
                  ref={setPageRef(page)}
                  data-page={page}
                  className="relative flex-shrink-0"
                  style={{
                    width: displayWidth ?? "80%",
                    height: displayHeight ?? 600,
                    maxWidth: "100%",
                  }}
                >
                  {pageData ? (
                    <>
                      <img
                        ref={(el) => {
                          if (el) imageElRefsMap.current.set(page, el);
                          else imageElRefsMap.current.delete(page);
                        }}
                        src={pageData.dataUrl}
                        alt={`Page ${page}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                      {isOcrWindowPage && (
                        <OcrTextOverlay
                          imageRef={{ current: imageElRefsMap.current.get(page) ?? null }}
                          imageWidth={pageData.width}
                          imageHeight={pageData.height}
                          imageSource={pageData.dataUrl}
                          enabled={isOcrWindowPage}
                          ocrEngine={ocrEngine}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-white/30">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                        <span className="text-xs tabular-nums">{page}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar (same style as single-page viewer) */}
        <div className="flex-shrink-0 w-full px-6 py-3 bg-[rgba(30,30,30,0.75)] backdrop-blur-[20px] backdrop-saturate-[180%] border-t border-white/[0.08] flex items-center gap-3">
          {isPageInputVisible ? (
            <input
              autoFocus
              type="number"
              min={1}
              max={totalPages}
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const parsed = parseInt(pageInputValue, 10);
                  if (!isNaN(parsed)) goToPage(parsed);
                  setIsPageInputVisible(false);
                } else if (e.key === "Escape") {
                  setIsPageInputVisible(false);
                }
              }}
              onBlur={() => setIsPageInputVisible(false)}
              className="w-16 bg-white/10 text-white text-sm text-center rounded px-1.5 py-0.5 border border-white/20 outline-none focus:border-white/50 tabular-nums"
            />
          ) : (
            <button
              onClick={() => {
                setPageInputValue(String(currentPage));
                setIsPageInputVisible(true);
              }}
              className="text-white/70 hover:text-white text-sm tabular-nums transition-colors cursor-pointer whitespace-nowrap"
              title="点击跳转页码"
            >
              {currentPage} / {totalPages}
            </button>
          )}

          <input
            type="range"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="image-reader-slider flex-1 h-1 cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.7) ${pageProgress}%, rgba(255,255,255,0.2) ${pageProgress}%)`,
            }}
          />

          <span className="text-white/70 text-sm tabular-nums whitespace-nowrap">
            {pageProgress}%
          </span>
        </div>
      </div>
    );
  }
);

ImageScrollViewer.displayName = "ImageScrollViewer";
export default ImageScrollViewer;
