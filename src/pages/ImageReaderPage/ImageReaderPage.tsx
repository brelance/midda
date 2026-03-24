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
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>("manga");
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const [mangaReady, setMangaReady] = useState(false);
  const [mangaDownloading, setMangaDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const hideTimerRef = useRef<number | null>(null);

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
    (_page: number, _total: number, progress: number) => {
      onProgressChange?.(progress);
    },
    [onProgressChange]
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

  return (
    <div
      className="h-screen w-screen bg-[#1a1a1a] flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Top toolbar */}
      <div
        className={`
          absolute top-0 left-0 right-0 z-50
          flex items-center justify-between px-6 py-3
          bg-gradient-to-b from-black/70 to-transparent
          transition-all duration-300
          ${isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}
        `}
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <button
          onClick={onExitReader}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">返回</span>
        </button>

        <h1 className="text-white/90 text-sm font-medium truncate max-w-[40%]">
          {book.title}
        </h1>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
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

      {/* Image viewer */}
      <ImagePageViewer
        ref={viewerRef}
        bookId={book.id}
        filePath={book.filePath}
        format={book.format}
        totalPages={book.totalPages}
        initialPage={
          book.progress && book.totalPages
            ? Math.max(1, Math.round((book.progress / 100) * book.totalPages))
            : 1
        }
        onPageChange={handlePageChange}
        ocrEnabled={ocrEnabled}
        ocrEngine={ocrEngine}
      />
    </div>
  );
};

export default ImageReaderPage;


