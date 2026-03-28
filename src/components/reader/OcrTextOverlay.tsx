/**
 * OcrTextOverlay — transparent overlay that shows OCR-recognized text
 * blocks positioned over the corresponding image areas.
 *
 * Supports two engines:
 * - "native": OS-level OCR (Vision/WinRT) — returns positioned text blocks
 * - "manga": PaddleOCR-VL 1.5 — returns text (positioned blocks or full-page text)
 *
 * When blocks have valid coordinates, they are rendered at their positions.
 * When blocks have zero dimensions (e.g. from PaddleOCR official API),
 * text is shown as a selectable overlay at the bottom of the image.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { OcrEngine } from "../../pages/ImageReaderPage/ImageReaderPage";
import type { MangaOcrResult, PositionedOcrBlock } from "../../types/ocr";
import { getOcrBlockTextStyle } from "./ocrOverlayUtils";

type OcrBlock = PositionedOcrBlock;

interface PendingMangaOcrEntry {
  cancel: () => void;
  consumers: number;
  promise: Promise<MangaOcrResult>;
  requestId: string;
}

const MANGA_OCR_DEBOUNCE_MS = 200;
const mangaOcrResultCache = new Map<string, MangaOcrResult>();
const pendingMangaOcrRequests = new Map<string, PendingMangaOcrEntry>();
let mangaOcrRequestSeq = 0;

function isOcrCancelledError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "PaddleOcrCancelledError" ||
      error.message === "cancelled" ||
      error.message.includes("已取消"))
  );
}

function createPendingMangaOcrRequest(
  sourceKey: string,
  imageSource: string
): PendingMangaOcrEntry {
  const existing = pendingMangaOcrRequests.get(sourceKey);
  if (existing) return existing;

  const requestId = `manga-ocr-${++mangaOcrRequestSeq}`;
  let timeoutId: number | undefined;
  let rejectPromise: ((reason?: unknown) => void) | undefined;
  let settled = false;
  let requestStarted = false;

  const promise = new Promise<MangaOcrResult>((resolve, reject) => {
    rejectPromise = reject;
    timeoutId = window.setTimeout(async () => {
      timeoutId = undefined;
      requestStarted = true;

      try {
        const result = await window.api.ocr.mangaRecognize({
          requestId,
          imageInput: imageSource,
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, MANGA_OCR_DEBOUNCE_MS);
  })
    .then((result) => {
      mangaOcrResultCache.set(sourceKey, result);
      return result;
    })
    .finally(() => {
      settled = true;
      const current = pendingMangaOcrRequests.get(sourceKey);
      if (current?.requestId === requestId) {
        pendingMangaOcrRequests.delete(sourceKey);
      }
    });

  const entry: PendingMangaOcrEntry = {
    requestId,
    consumers: 0,
    promise,
    cancel: () => {
      if (settled) return;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
        rejectPromise?.(new Error("cancelled"));
        return;
      }

      if (requestStarted) {
        void window.api.ocr.cancelMangaRecognize(requestId);
      }
    },
  };

  pendingMangaOcrRequests.set(sourceKey, entry);
  return entry;
}

function releasePendingMangaOcrRequest(sourceKey: string, requestId: string): void {
  const entry = pendingMangaOcrRequests.get(sourceKey);
  if (!entry || entry.requestId !== requestId) return;

  entry.consumers -= 1;
  if (entry.consumers <= 0) {
    entry.cancel();
  }
}

interface OcrTextOverlayProps {
  imageWidth: number;
  imageHeight: number;
  imageRef: React.RefObject<HTMLImageElement | null>;
  imageSource: string;
  enabled: boolean;
  languageHint?: string;
  ocrEngine?: OcrEngine;
}

const OcrTextOverlay: React.FC<OcrTextOverlayProps> = ({
  imageWidth,
  imageHeight,
  imageRef,
  imageSource,
  enabled,
  languageHint,
  ocrEngine = "native",
}) => {
  const [blocks, setBlocks] = useState<OcrBlock[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  // Source dimensions from PaddleOCR (the coordinate space bbox values are relative to)
  const [ocrSourceWidth, setOcrSourceWidth] = useState<number | undefined>();
  const [ocrSourceHeight, setOcrSourceHeight] = useState<number | undefined>();
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const lastSourceRef = useRef<string>("");
  const lastEngineRef = useRef<string>("");

  // Update overlay position to match the rendered image
  const updateOverlayPosition = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const parentRect = img.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    setOverlayStyle({
      position: "absolute",
      left: rect.left - parentRect.left,
      top: rect.top - parentRect.top,
      width: rect.width,
      height: rect.height,
      pointerEvents: "none",
    });
  }, [imageRef]);

  // Observe image size changes
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const observer = new ResizeObserver(() => updateOverlayPosition());
    observer.observe(img);
    updateOverlayPosition();

    return () => observer.disconnect();
  }, [imageRef, updateOverlayPosition]);

  // Perform OCR when source or engine changes
  useEffect(() => {
    const sourceKey = `${ocrEngine}:${imageSource}`;
    if (!enabled || !imageSource || sourceKey === `${lastEngineRef.current}:${lastSourceRef.current}`) return;
    lastSourceRef.current = imageSource;
    lastEngineRef.current = ocrEngine;

    let cancelled = false;
    let pendingRequestId: string | null = null;
    setIsRecognizing(true);
    setBlocks([]);
    setOcrSourceWidth(undefined);
    setOcrSourceHeight(undefined);

    (async () => {
      try {
        if (ocrEngine === "manga") {
          if (!window?.api?.ocr?.mangaRecognize) {
            console.warn("PaddleOCR API not available");
            return;
          }

          const cachedResult = mangaOcrResultCache.get(sourceKey);
          if (cachedResult) {
            if (!cancelled) {
              setBlocks(cachedResult.blocks);
              setOcrSourceWidth(cachedResult.sourceWidth);
              setOcrSourceHeight(cachedResult.sourceHeight);
            }
            return;
          }

          const pendingRequest = createPendingMangaOcrRequest(sourceKey, imageSource);
          pendingRequest.consumers += 1;
          pendingRequestId = pendingRequest.requestId;

          const result = await pendingRequest.promise;
          if (!cancelled && result?.blocks) {
            setBlocks(result.blocks);
            setOcrSourceWidth(result.sourceWidth);
            setOcrSourceHeight(result.sourceHeight);
          }
        } else {
          // Native OCR
          if (!window?.api?.ocr?.recognizeText) {
            console.warn("OCR API not available");
            return;
          }
          const result = await window.api.ocr.recognizeText(imageSource, languageHint);
          if (!cancelled && result?.blocks) {
            setBlocks(result.blocks);
          }
        }
      } catch (error) {
        if (!isOcrCancelledError(error)) {
          console.error("OCR failed:", error);
        }
      } finally {
        if (!cancelled) setIsRecognizing(false);
      }
    })();

    return () => {
      cancelled = true;
      if (ocrEngine === "manga" && pendingRequestId) {
        releasePendingMangaOcrRequest(sourceKey, pendingRequestId);
      }
    };
  }, [imageSource, enabled, languageHint, ocrEngine]);

  // Clear when disabled
  useEffect(() => {
    if (!enabled) {
      setBlocks([]);
      lastSourceRef.current = "";
      lastEngineRef.current = "";
    }
  }, [enabled]);

  const hasContent = blocks.length > 0;
  if (!enabled || (!hasContent && !isRecognizing)) return null;

  // Split blocks into positioned (have coordinates) and text-only (no coordinates)
  const positionedBlocks = blocks.filter((b) => b.width > 0 && b.height > 0);
  const textOnlyBlocks = blocks.filter((b) => b.width === 0 || b.height === 0);
  const textOnlyContent = textOnlyBlocks.map((b) => b.text).join("\n");

  // Use PaddleOCR's source dimensions (the coordinate space of the bboxes)
  // when available, otherwise fall back to the original image dimensions
  const refWidth = ocrSourceWidth || imageWidth;
  const refHeight = ocrSourceHeight || imageHeight;

  const scaleX =
    overlayStyle.width && refWidth
      ? (overlayStyle.width as number) / refWidth
      : 1;
  const scaleY =
    overlayStyle.height && refHeight
      ? (overlayStyle.height as number) / refHeight
      : 1;

  return (
    <div style={overlayStyle} className="z-10">
      {/* OCR status indicator */}
      {isRecognizing && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 backdrop-blur-sm">
          <div className="w-3 h-3 border border-white/60 border-t-white rounded-full animate-spin" />
          <span className="text-white/80 text-[10px]">
            {ocrEngine === "manga" ? "漫画识别中..." : "识别中..."}
          </span>
        </div>
      )}

      {/* Positioned text blocks (blocks with valid coordinates) */}
      {positionedBlocks.map((block, i) => {
        return (
          <div
            key={i}
            className="absolute cursor-text"
            style={{
              left: block.x * scaleX,
              top: block.y * scaleY,
              width: block.width * scaleX,
              height: block.height * scaleY,
              pointerEvents: "auto",
            }}
          >
            <span
              className="block w-full h-full select-text"
              style={getOcrBlockTextStyle(block, scaleX, scaleY)}
            >
              {block.text}
            </span>
          </div>
        );
      })}

      {/* Text-only fallback (blocks without coordinates — e.g. from PaddleOCR official API) */}
      {textOnlyContent && (
        <div
          className="absolute bottom-2 left-2 right-2 max-h-[40%] overflow-y-auto p-2 rounded bg-black/60 backdrop-blur-sm"
          style={{ pointerEvents: "auto" }}
        >
          <p
            className="text-white/90 text-sm leading-relaxed select-text whitespace-pre-wrap"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          >
            {textOnlyContent}
          </p>
        </div>
      )}
    </div>
  );
};

export default OcrTextOverlay;
