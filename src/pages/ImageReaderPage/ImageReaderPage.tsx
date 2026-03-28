/**
 * ImageReaderPage — lightweight reader for image-based book formats (CBZ/CBR/PDF).
 *
 * Unlike the full ReaderPage (which handles EPUB HTML chapters, sentence analysis,
 * TTS, roleplay, etc.), this page focuses on simple image page navigation.
 *
 * Chrome (toolbar / footer / sidebar) follows the same Apple HIG light-frosted-glass
 * design language as the EPUB ReaderPage, while the content area stays dark.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ImagePageViewer, {
  type ImagePageViewerHandle,
} from "../../components/reader/ImagePageViewer";
import ImageScrollViewer, {
  type ImageScrollViewerHandle,
} from "../../components/reader/ImageScrollViewer";
import ImageThumbnailSidebar from "../../components/reader/ImageThumbnailSidebar";
import type { ZoomMode } from "../../hooks/useImageReaderZoom";
import { useReaderToolbarVisibility } from "../../hooks/useReaderToolbarVisibility";
import "../../components/reader/ImagePageViewer.css";

export type OcrEngine = "native" | "manga";

interface ImageReaderPageProps {
  book: {
    id: string;
    title: string;
    format: string;
    filePath?: string;
    totalPages?: number;
    progress?: number;
  };
  onExitReader: () => void;
  onProgressChange?: (progress: number) => void;
}

const ImageReaderPage: React.FC<ImageReaderPageProps> = ({
  book,
  onExitReader,
  onProgressChange,
}) => {
  const viewerRef = useRef<ImagePageViewerHandle>(null);
  const scrollViewerRef = useRef<ImageScrollViewerHandle>(null);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>("manga");
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const [mangaReady, setMangaReady] = useState(false);

  // Zoom state (synced from viewer)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-page");

  // Thumbnail sidebar
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(false);

  // Current page & progress (synced from viewer)
  const [currentPage, setCurrentPage] = useState(1);
  // Toolbar visibility — same hook as EPUB reader
  const {
    isHeaderVisible,
    handlePointerMove,
    showToolbarsTemporarily,
  } = useReaderToolbarVisibility();

  // View mode: single-page or continuous scroll
  const [viewMode, setViewMode] = useState<"page" | "scroll">(() => {
    try { return (localStorage.getItem("midda-reader-viewMode") as "page" | "scroll") || "page"; }
    catch { return "page"; }
  });

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "page" ? "scroll" : "page";
      try { localStorage.setItem("midda-reader-viewMode", next); } catch {}
      return next;
    });
  }, []);

  // Check OCR availability
  useEffect(() => {
    window?.api?.ocr?.isAvailable?.()
      .then((available) => setOcrAvailable(available))
      .catch(() => {});
    window?.api?.ocr?.mangaIsReady?.()
      .then((ready) => setMangaReady(ready))
      .catch(() => {});
  }, []);

  // Re-check health when OCR engine switches to manga
  const recheckMangaHealth = useCallback(() => {
    window?.api?.ocr?.mangaIsReady?.()
      .then((ready) => setMangaReady(ready))
      .catch(() => setMangaReady(false));
  }, []);

  // Show toolbars on mount
  useEffect(() => {
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExitReader();
      // ⌘⇧D toggle thumbnail sidebar
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsThumbnailOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExitReader]);

  const handlePageChange = useCallback(
    (page: number, _total: number, progress: number) => {
      setCurrentPage(page);
      onProgressChange?.(progress);
    },
    [onProgressChange]
  );

  const handleZoomChange = useCallback(
    (level: number, mode: ZoomMode) => {
      setZoomLevel(level);
      setZoomMode(mode);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handlePointerMove(e.clientY);
    },
    [handlePointerMove]
  );

  if (!book.filePath || !book.totalPages) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1c1c1e] text-[#e5e5e7]">
        <div className="text-center">
          <p className="text-lg mb-4">无法加载书籍</p>
          <button
            onClick={onExitReader}
            className="px-4 py-2 bg-black/10 hover:bg-black/15 rounded-lg transition-colors text-[#007aff]"
          >
            返回书架
          </button>
        </div>
      </div>
    );
  }

  // Computed initial page (shared by both viewers) — Fix #12
  const initialPage =
    book.progress && book.totalPages
      ? Math.max(1, Math.round((book.progress / 100) * book.totalPages))
      : 1;

  // Sidebar callbacks — Fix #11
  const handleSidebarPageSelect = (page: number) => {
    if (viewMode === "scroll") {
      scrollViewerRef.current?.goToPage(page);
    } else {
      viewerRef.current?.goToPage(page);
    }
  };

  const handleSidebarClose = () => setIsThumbnailOpen(false);

  const handleSidebarLoadThumbnail = async (page: number) => {
    if (viewMode === "scroll") {
      return scrollViewerRef.current?.loadThumbnail(page) ?? null;
    }
    return viewerRef.current?.loadThumbnail(page) ?? null;
  };

  // Active viewer ref shorthand
  const activeViewerRef = viewMode === "scroll" ? scrollViewerRef : viewerRef;

  return (
    <div
      className="h-screen w-screen bg-[#1c1c1e] flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* ── Transparent drag strip (same as EPUB ReaderLayout) ── */}
      <div
        className="fixed top-0 left-0 right-0 z-40 h-7"
        style={{ WebkitAppRegion: isHeaderVisible ? "no-drag" : "drag" } as React.CSSProperties}
      />

      {/* ── Top toolbar — Apple HIG light frosted glass ── */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          border-b border-gray-200/80
          bg-[#fdfdfd]/90 backdrop-blur-md
          transition-transform duration-300 ease-in-out
          ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}
        `}
      >
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          {/* ── Left: navigation (pl-[76px] clears macOS traffic lights) ── */}
          <div className="flex items-center gap-1 pl-[76px]" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <button
              onClick={onExitReader}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium text-gray-600 hover:bg-black/[0.05] hover:text-[#1d1d1f] transition-colors select-none"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="hidden sm:inline text-[13px]">返回</span>
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300 mx-0.5" />

            {/* Thumbnail sidebar toggle */}
            <button
              onClick={() => setIsThumbnailOpen((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium transition-colors select-none ${
                isThumbnailOpen
                  ? "bg-[#007aff]/10 text-[#007aff]"
                  : "text-gray-600 hover:bg-black/[0.05] hover:text-[#1d1d1f]"
              }`}
              title="缩略图 (⌘⇧D)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
          </div>

          {/* ── Center: book title ── */}
          <div className="hidden md:block text-center max-w-[420px] mx-auto">
            <h1 className="truncate text-sm font-semibold text-[#1d1d1f]">
              {book.title}
            </h1>
          </div>

          {/* ── Right: controls ── */}
          <div
            className="flex items-center gap-1.5"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {/* ── Zoom controls ── */}
            <div className="flex items-center gap-0.5 rounded-md bg-black/[0.04] border border-gray-200/60 overflow-hidden">
              <button
                onClick={() => activeViewerRef.current?.zoomOut()}
                className="px-1.5 py-1 text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-all text-sm font-medium"
                title="缩小 (⌘−)"
              >
                −
              </button>
              <span className="px-1.5 py-1 text-[10px] text-gray-500 tabular-nums min-w-[36px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => activeViewerRef.current?.zoomIn()}
                className="px-1.5 py-1 text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-all text-sm font-medium"
                title="放大 (⌘+)"
              >
                +
              </button>
            </div>

            {/* Zoom preset buttons */}
            <div className="flex items-center rounded-md bg-black/[0.04] border border-gray-200/60 overflow-hidden">
              <button
                onClick={() => activeViewerRef.current?.setZoomMode("fit-page")}
                className={`px-2 py-1 text-[10px] font-medium transition-all ${
                  zoomMode === "fit-page" ? "bg-[#007aff]/10 text-[#007aff]" : "text-gray-500 hover:text-[#1d1d1f]"
                }`}
                title="适应页面 (⌘0)"
              >
                适应页面
              </button>
              <button
                onClick={() => activeViewerRef.current?.setZoomMode("fit-width")}
                className={`px-2 py-1 text-[10px] font-medium transition-all ${
                  zoomMode === "fit-width" ? "bg-[#007aff]/10 text-[#007aff]" : "text-gray-500 hover:text-[#1d1d1f]"
                }`}
                title="适应宽度"
              >
                适应宽度
              </button>
              <button
                onClick={() => activeViewerRef.current?.setZoomMode("actual")}
                className={`px-2 py-1 text-[10px] font-medium transition-all ${
                  zoomMode === "actual" ? "bg-[#007aff]/10 text-[#007aff]" : "text-gray-500 hover:text-[#1d1d1f]"
                }`}
                title="实际大小"
              >
                实际
              </button>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300 mx-0.5" />

            {/* View mode toggle */}
            <div className="flex items-center rounded-md bg-black/[0.04] border border-gray-200/60 overflow-hidden">
              <button
                onClick={() => { if (viewMode !== "page") toggleViewMode(); }}
                className={`px-2 py-1 text-[10px] font-medium transition-all ${
                  viewMode === "page" ? "bg-[#007aff]/10 text-[#007aff]" : "text-gray-500 hover:text-[#1d1d1f]"
                }`}
                title="单页模式"
              >
                单页
              </button>
              <button
                onClick={() => { if (viewMode !== "scroll") toggleViewMode(); }}
                className={`px-2 py-1 text-[10px] font-medium transition-all ${
                  viewMode === "scroll" ? "bg-[#007aff]/10 text-[#007aff]" : "text-gray-500 hover:text-[#1d1d1f]"
                }`}
                title="连续滚动"
              >
                滚动
              </button>
            </div>

            {/* Divider between view mode and OCR */}
            <div className="h-4 w-px bg-gray-300 mx-0.5" />

            {/* OCR toggle */}
            <button
              onClick={() => setOcrEnabled((v) => !v)}
              className={`
                px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                ${ocrEnabled
                  ? "bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/30"
                  : "bg-black/[0.04] text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.06] border border-gray-200/60"
                }
              `}
              title={ocrEnabled ? "关闭 OCR" : "开启 OCR"}
            >
              OCR
            </button>

            {/* Engine selector (visible when OCR is on) */}
            {ocrEnabled && (
              <div className="flex items-center rounded-md bg-black/[0.04] border border-gray-200/60 overflow-hidden">
                {ocrAvailable && (
                  <button
                    onClick={() => setOcrEngine("native")}
                    className={`px-2 py-1 text-[10px] font-medium transition-all ${
                      ocrEngine === "native"
                        ? "bg-[#007aff]/10 text-[#007aff]"
                        : "text-gray-500 hover:text-[#1d1d1f]"
                    }`}
                  >
                    普通
                  </button>
                )}
                <button
                  onClick={() => {
                    setOcrEngine("manga");
                    recheckMangaHealth();
                  }}
                  className={`px-2 py-1 text-[10px] font-medium transition-all ${
                    ocrEngine === "manga"
                      ? "bg-[#007aff]/10 text-[#007aff]"
                      : "text-gray-500 hover:text-[#1d1d1f]"
                  }`}
                >
                  漫画
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PaddleOCR service unavailable banner */}
      {ocrEnabled && ocrEngine === "manga" && !mangaReady && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#fdfdfd]/95 backdrop-blur-md rounded-lg px-4 py-3 text-center border border-gray-200/80 shadow-sm max-w-sm">
          <p className="text-gray-600 text-xs">
            PaddleOCR 服务不可用，请检查服务器连接
          </p>
        </div>
      )}

      {/* Viewer: single-page or continuous scroll */}
      {viewMode === "scroll" ? (
        <ImageScrollViewer
          ref={scrollViewerRef}
          bookId={book.id}
          filePath={book.filePath}
          format={book.format}
          totalPages={book.totalPages}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          onZoomChange={handleZoomChange}
          ocrEnabled={ocrEnabled}
          ocrEngine={ocrEngine}
        />
      ) : (
        <ImagePageViewer
          ref={viewerRef}
          bookId={book.id}
          filePath={book.filePath}
          format={book.format}
          totalPages={book.totalPages}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          onZoomChange={handleZoomChange}
          ocrEnabled={ocrEnabled}
          ocrEngine={ocrEngine}
        />
      )}

      {/* Thumbnail sidebar */}
      <ImageThumbnailSidebar
        isOpen={isThumbnailOpen}
        currentPage={currentPage}
        totalPages={book.totalPages}
        onPageSelect={handleSidebarPageSelect}
        onClose={handleSidebarClose}
        loadThumbnail={handleSidebarLoadThumbnail}
      />
    </div>
  );
};

export default ImageReaderPage;
