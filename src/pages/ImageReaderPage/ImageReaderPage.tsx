/**
 * ImageReaderPage — lightweight reader for image-based book formats (CBZ/CBR/PDF).
 *
 * Unlike the full ReaderPage (which handles EPUB HTML chapters, sentence analysis,
 * TTS, roleplay, etc.), this page focuses on simple image page navigation.
 *
 * Chrome (toolbar / footer / sidebar) follows the same Apple HIG light-frosted-glass
 * design language as the EPUB ReaderPage, while the content area stays dark.
 *
 * Supports two modes:
 * - Normal: single-page or scroll viewer with optional OCR overlay
 * - Study (精読): dual-pane layout with PDF on left, OCR text analysis on right
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ImagePageViewer, {
  type ImagePageViewerHandle,
} from "../../components/reader/ImagePageViewer";
import ImageScrollViewer, {
  type ImageScrollViewerHandle,
} from "../../components/reader/ImageScrollViewer";
import ImageThumbnailSidebar from "../../components/reader/ImageThumbnailSidebar";
import ImageReaderSettingsModal from "../../components/reader/ImageReaderSettingsModal";
import ImageStudyPanel, {
  type ImageStudyPanelHandle,
} from "../../components/reader/ImageStudyPanel";
import type { ZoomMode } from "../../hooks/useImageReaderZoom";
import { useReaderToolbarVisibility } from "../../hooks/useReaderToolbarVisibility";
import { deriveImageReaderMode } from "./imageReaderModeSelectors";
import type { ReadingMode } from "./imageReaderModeSelectors";
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
  const studyPanelRef = useRef<ImageStudyPanelHandle>(null);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>("manga");
  const [mangaReady, setMangaReady] = useState(false);

  // Zoom state (synced from viewer)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-page");

  // Thumbnail sidebar
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(false);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Reading mode: browse (plain) / text (OCR overlay) / study (intensive reading)
  const [readingMode, setReadingMode] = useState<ReadingMode>("browse");

  // Current page & progress (synced from viewer)
  const [currentPage, setCurrentPage] = useState(1);
  // Toolbar visibility — same hook as EPUB reader
  const {
    isHeaderVisible,
    isFooterVisible,
    handlePointerMove,
    showToolbarsTemporarily,
  } = useReaderToolbarVisibility();

  // View mode: single-page or continuous scroll
  const [viewMode, setViewMode] = useState<"page" | "scroll">(() => {
    try { return (localStorage.getItem("midda-reader-viewMode") as "page" | "scroll") || "page"; }
    catch { return "page"; }
  });
  const {
    activeReader,
    effectiveViewMode,
    ocrEnabled,
  } = deriveImageReaderMode({ readingMode, viewMode });

  const handleViewModeChange = useCallback((mode: "page" | "scroll") => {
    setViewMode(mode);
    try { localStorage.setItem("midda-reader-viewMode", mode); } catch {}
  }, []);

  // Check Manga OCR health on mount
  useEffect(() => {
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
      if (e.key === "Escape" && !isSettingsOpen) onExitReader();
      // ⌘⇧D toggle thumbnail sidebar
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsThumbnailOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExitReader, isSettingsOpen]);

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

  // Settings modal callbacks
  const handleZoomModeChange = useCallback((mode: ZoomMode) => {
    if (mode === "custom") return; // custom is not a settable mode
    const ref = effectiveViewMode === "scroll" ? scrollViewerRef : viewerRef;
    ref.current?.setZoomMode(mode);
  }, [effectiveViewMode]);

  const handleReadingModeChange = useCallback((mode: ReadingMode) => {
    setReadingMode(mode);
  }, []);

  const handleOcrEngineChange = useCallback((engine: OcrEngine) => {
    setOcrEngine(engine);
    if (engine === "manga") {
      recheckMangaHealth();
    }
  }, [recheckMangaHealth]);

  if (!book.filePath || !book.totalPages) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f5f7] text-[#1d1d1f]">
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
    if (activeReader === "study") {
      studyPanelRef.current?.goToPage(page);
    } else if (activeReader === "scroll") {
      scrollViewerRef.current?.goToPage(page);
    } else {
      viewerRef.current?.goToPage(page);
    }
  };

  const handleSidebarClose = () => setIsThumbnailOpen(false);

  const handleSidebarLoadThumbnail = async (page: number) => {
    if (activeReader === "study") {
      return studyPanelRef.current?.loadThumbnail(page) ?? null;
    }
    if (activeReader === "scroll") {
      return scrollViewerRef.current?.loadThumbnail(page) ?? null;
    }
    return viewerRef.current?.loadThumbnail(page) ?? null;
  };

  return (
    <div
      className="h-screen w-screen bg-[#f5f5f7] flex flex-col"
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

          {/* ── Right: settings gear + zoom controls ── */}
          <div
            className="flex items-center gap-1.5"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {/* Reading mode badge */}
            {readingMode !== "browse" && (
              <span className="px-2 py-0.5 rounded-md bg-[#007aff]/10 text-[#007aff] text-[11px] font-medium">
                {readingMode === "study" ? "精读" : "文字"}
              </span>
            )}

            {/* Zoom +/- (only in non-study mode) */}
            {readingMode !== "study" && (
              <div className="flex items-center gap-0.5 rounded-md bg-black/[0.04] border border-gray-200/60 overflow-hidden">
                <button
                  onClick={() => (effectiveViewMode === "scroll" ? scrollViewerRef : viewerRef).current?.zoomOut()}
                  className="px-1.5 py-1 text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-all text-sm font-medium"
                  title="缩小 (⌘−)"
                >
                  −
                </button>
                <span className="px-1.5 py-1 text-[10px] text-gray-500 tabular-nums min-w-[36px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => (effectiveViewMode === "scroll" ? scrollViewerRef : viewerRef).current?.zoomIn()}
                  className="px-1.5 py-1 text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-all text-sm font-medium"
                  title="放大 (⌘+)"
                >
                  +
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300 mx-0.5" />

            {/* Settings gear */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium text-gray-600 hover:bg-black/[0.05] hover:text-[#1d1d1f] transition-colors select-none"
              title="设置"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.325 4.317c.426-1.756 3.324-1.756 3.75 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 3.324 0 3.75a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-3.324 1.756-3.75 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-3.324 0-3.75a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
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

      {/* ── Content area ── */}
      {activeReader === "study" ? (
        /* Study mode: dual-pane layout */
        <ImageStudyPanel
          ref={studyPanelRef}
          bookId={book.id}
          filePath={book.filePath}
          format={book.format}
          totalPages={book.totalPages}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          ocrEngine={ocrEngine}
        />
      ) : activeReader === "scroll" ? (
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
          isFooterVisible={isFooterVisible}
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
          isFooterVisible={isFooterVisible}
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

      {/* Settings modal */}
      <ImageReaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        zoomMode={zoomMode}
        onZoomModeChange={handleZoomModeChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        readingMode={readingMode}
        onReadingModeChange={handleReadingModeChange}
        ocrEngine={ocrEngine}
        onOcrEngineChange={handleOcrEngineChange}
      />
    </div>
  );
};

export default ImageReaderPage;
