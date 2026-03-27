/**
 * OcrTextOverlay — transparent overlay that shows OCR-recognized text
 * blocks positioned over the corresponding image areas.
 *
 * Supports two engines:
 * - "native": OS-level OCR (Vision/WinRT) — returns positioned text blocks
 * - "manga": PaddleOCR-VL 1.5 via vLLM — returns positioned text blocks
 *
 * Both engines now return the same block format, sharing the same render path.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { OcrEngine } from "../../pages/ImageReaderPage/ImageReaderPage";

export interface OcrBlock {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
    setIsRecognizing(true);
    setBlocks([]);

    (async () => {
      try {
        if (ocrEngine === "manga") {
          // PaddleOCR-VL 1.5 via vLLM
          if (!window?.api?.ocr?.mangaRecognize) {
            console.warn("PaddleOCR API not available");
            return;
          }
          const result = await window.api.ocr.mangaRecognize(imageSource);
          if (!cancelled && result?.blocks) {
            setBlocks(result.blocks);
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
        console.error("OCR failed:", error);
      } finally {
        if (!cancelled) setIsRecognizing(false);
      }
    })();

    return () => {
      cancelled = true;
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

  const scaleX =
    overlayStyle.width && imageWidth
      ? (overlayStyle.width as number) / imageWidth
      : 1;
  const scaleY =
    overlayStyle.height && imageHeight
      ? (overlayStyle.height as number) / imageHeight
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

      {/* Positioned text blocks (same for both engines) */}
      {blocks.map((block, i) => (
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
            style={{
              fontSize: Math.max(8, block.height * scaleY * 0.8),
              lineHeight: `${block.height * scaleY}px`,
              color: "transparent",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              userSelect: "text",
              WebkitUserSelect: "text",
            }}
          >
            {block.text}
          </span>
        </div>
      ))}
    </div>
  );
};

export default OcrTextOverlay;
