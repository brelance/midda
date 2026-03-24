/**
 * ImageReaderPage — lightweight reader for image-based book formats (CBZ/CBR/PDF).
 *
 * Unlike the full ReaderPage (which handles EPUB HTML chapters, sentence analysis,
 * TTS, roleplay, etc.), this page focuses on simple image page navigation.
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
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>("manga");
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const [mangaReady, setMangaReady] = useState(false);
  const [mangaDownloading, setMangaDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const hideTimerRef = useRef<number | null>(null);

  // Zoom state (synced from viewer)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-page");

  // Thumbnail sidebar
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(false);

  // Current page (synced from viewer)
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleDownloadManga = useCallback(async () => {
    setMangaDownloading(true);
    setDownloadProgress("准备下载...");
    const unsub = window.api.ocr.onMangaDownloadProgress((data) => {
      setDownloadProgress(`下载中: ${data.file} (${data.current}/${data.total})`);
    });
    try {
      await window.api.ocr.mangaDownload();
      setMangaReady(true);
      setDownloadProgress("");
    } catch (err) {
      console.error("模型下载失败:", err);
      setDownloadProgress("下载失败");
    } finally {
      setMangaDownloading(false);
      unsub();
    }
  }, []);

  const scheduleHideToolbar = useCallback(() => {
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsToolbarVisible(false);
    }, 3000);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const y = e.clientY;
      const h = window.innerHeight;
      if (y < 60 || y > h - 60) {
        setIsToolbarVisible(true);
        scheduleHideToolbar();
      }
    },
    [scheduleHideToolbar]
  );

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

  useEffect(() => {
    scheduleHideToolbar();
    return () => {
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHideToolbar]);

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

  if (!book.filePath || !book.totalPages) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a] text-white">
        <div className="text-center">
          <p className="text-lg mb-4">无法加载书籍</p>
          <button
            onClick={onExitReader}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
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

  return (
    <div
      className="h-screen w-screen bg-[#1a1a1a] flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Top toolbar */}
      <div
        className={`
          absolute top-0 left-0 right-0 z-50
          flex items-center justify-between px-6 h-[52px]
          bg-[rgba(30,30,30,0.75)] backdrop-blur-[20px] backdrop-saturate-[180%]
          border-b border-white/[0.08]
          transition-all duration-300
          ${isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}
        `}
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* Back button */}
          <button
            onClick={onExitReader}
            className="flex items-center gap-1.5 text-white/70 hover:text-white hover:bg-white/[0.1] rounded-md px-2 py-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[13px] font-medium">返回</span>
          </button>

          {/* Divider */}
          <div className="h-4 w-px bg-white/15" />

          {/* Thumbnail sidebar toggle */}
          <button
            onClick={() => setIsThumbnailOpen((v) => !v)}
            className={`p-1.5 rounded-md transition-colors ${
              isThumbnailOpen
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white hover:bg-white/[0.1]"
            }`}
            title="缩略图 (⌘⇧D)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
        </div>

        <h1 className="text-white/90 text-sm font-medium truncate max-w-[40%]">
          {book.title}
        </h1>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {/* ── Zoom controls ── */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/10 border border-white/10 overflow-hidden">
            <button
              onClick={() => (viewMode === "scroll" ? scrollViewerRef : viewerRef).current?.zoomOut()}
              className="px-1.5 py-1 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
              title="缩小 (⌘−)"
            >
              −
            </button>
            <span className="px-1.5 py-1 text-[10px] text-white/70 tabular-nums min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => (viewMode === "scroll" ? scrollViewerRef : viewerRef).current?.zoomIn()}
              className="px-1.5 py-1 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
              title="放大 (⌘+)"
            >
              +
            </button>
          </div>

          {/* Zoom preset buttons */}
          <div className="flex items-center rounded-md bg-white/10 border border-white/10 overflow-hidden">
            <button
              onClick={() => (viewMode === "scroll" ? scrollViewerRef : viewerRef).current?.setZoomMode("fit-page")}
              className={`px-2 py-1 text-[10px] font-medium transition-all ${
                zoomMode === "fit-page" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
              }`}
              title="适应页面 (⌘0)"
            >
              适应页面
            </button>
            <button
              onClick={() => (viewMode === "scroll" ? scrollViewerRef : viewerRef).current?.setZoomMode("fit-width")}
              className={`px-2 py-1 text-[10px] font-medium transition-all ${
                zoomMode === "fit-width" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
              }`}
              title="适应宽度"
            >
              适应宽度
            </button>
            <button
              onClick={() => (viewMode === "scroll" ? scrollViewerRef : viewerRef).current?.setZoomMode("actual")}
              className={`px-2 py-1 text-[10px] font-medium transition-all ${
                zoomMode === "actual" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
              }`}
              title="实际大小"
            >
              实际
            </button>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-white/15 mx-0.5" />

          {/* View mode toggle */}
          <div className="flex items-center rounded-md bg-white/10 border border-white/10 overflow-hidden">
            <button
              onClick={() => { if (viewMode !== "page") toggleViewMode(); }}
              className={`px-2 py-1 text-[10px] font-medium transition-all ${
                viewMode === "page" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
              }`}
              title="单页模式"
            >
              单页
            </button>
            <button
              onClick={() => { if (viewMode !== "scroll") toggleViewMode(); }}
              className={`px-2 py-1 text-[10px] font-medium transition-all ${
                viewMode === "scroll" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
              }`}
              title="连续滚动"
            >
              滚动
            </button>
          </div>

          {/* Divider between view mode and OCR */}
          <div className="h-4 w-px bg-white/15 mx-0.5" />

          {/* OCR toggle — always visible, manga engine works on all platforms */}
          <button
            onClick={() => setOcrEnabled((v) => !v)}
            className={`
              px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
              ${ocrEnabled
                ? "bg-white/25 text-white border border-white/30"
                : "bg-white/10 text-white/60 hover:text-white/80 hover:bg-white/15 border border-transparent"
              }
            `}
            title={ocrEnabled ? "关闭 OCR" : "开启 OCR"}
          >
            OCR
          </button>

          {/* Engine selector (visible when OCR is on) */}
          {ocrEnabled && (
            <div className="flex items-center rounded-md bg-white/10 border border-white/10 overflow-hidden">
              {ocrAvailable && (
                <button
                  onClick={() => setOcrEngine("native")}
                  className={`px-2 py-1 text-[10px] font-medium transition-all ${
                    ocrEngine === "native"
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  普通
                </button>
              )}
              <button
                onClick={() => {
                  setOcrEngine("manga");
                  if (!mangaReady && !mangaDownloading) {
                    // Don't auto-download, user will see the download prompt
                  }
                }}
                className={`px-2 py-1 text-[10px] font-medium transition-all ${
                  ocrEngine === "manga"
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                漫画
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manga model download banner */}
      {ocrEnabled && ocrEngine === "manga" && !mangaReady && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md rounded-lg px-4 py-3 text-center border border-white/10 max-w-sm">
          {mangaDownloading ? (
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              <span>{downloadProgress}</span>
            </div>
          ) : (
            <>
              <p className="text-white/80 text-xs mb-2">
                漫画 OCR 需要下载模型文件（约 140 MB）
              </p>
              <button
                onClick={handleDownloadManga}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-xs font-medium transition-colors"
              >
                下载模型
              </button>
            </>
          )}
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
