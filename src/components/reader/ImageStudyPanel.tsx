/**
 * ImageStudyPanel — dual-pane intensive reading (精読) for PDF/manga.
 *
 * Left pane:  the current page image (PDF / CBZ / CBR).
 * Right pane: OCR text → sentence segmentation → morphological analysis
 *             (same token analysis / popover / dictionary as EPUB StudyDoublePanel).
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { OcrEngine } from "../../pages/ImageReaderPage/ImageReaderPage";
import type { PositionedOcrBlock } from "../../types/ocr";
import type { TokenData } from "../../types/types";
import {
  StudySentenceRow,
  StudyPopover,
  type ReaderSentenceAnalysisItem,
  type TokenPopoverState,
  INITIAL_POPOVER,
} from "./StudyDoublePanel";
import {
  lookupDict,
  formatDictResult,
  lookupExamples,
} from "../../services/localDictService";

import { useReaderSettings } from "../../stores/readerSettingsStore";
import { queuedSendTokensRequest, clearQueue } from "../../services/apiQueue";
import { splitIntoSentences } from "../../utils/lang/sentenceSegmenter";
import { detectLanguageForSamples } from "../../utils/lang/detectLanguage";
import { useBlockRefs, type NudgeOffset } from "./useAntiOverlap";
import PageTurnButton from "./PageTurnButton";

// ── Types ───────────────────────────────────────────────────────────────────

interface PageData {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ImageStudyPanelHandle {
  goToPage: (page: number) => void;
  loadThumbnail: (page: number) => Promise<string | null>;
}

interface ImageStudyPanelProps {
  bookId: string;
  filePath: string;
  format: string;
  totalPages: number;
  initialPage?: number;
  onPageChange?: (page: number, total: number, progress: number) => void;
  ocrEngine: OcrEngine;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MANGA_OCR_DEBOUNCE_MS = 300;



/**
 * A group of sentence items that originated from a single OCR text block.
 * Carries the block's spatial metadata so the right panel can mirror
 * the vertical layout of the original page.
 */
interface OcrBlockGroup {
  blockIndex: number;
  /** OCR bbox Y coordinate (in source image pixels) */
  y: number;
  /** OCR bbox X coordinate (in source image pixels) */
  x: number;
  /** OCR bbox height */
  height: number;
  /** OCR bbox width */
  width: number;
  /** Whether this block's text is vertical */
  isVertical: boolean;
  /** Sentence items belonging to this block */
  sentenceIds: string[];
}

/**
 * Detect whether a block is vertical text.
 * Uses the OCR direction field first; falls back to aspect-ratio heuristic.
 */
function isBlockVertical(block: PositionedOcrBlock): boolean {
  if (block.direction === "vertical") return true;
  if (block.direction === "horizontal") return false;
  // Heuristic: if height > width * 1.3. this is typical for vertical text columns
  return block.height > 0 && block.width > 0 && block.height > block.width * 1.3;
}

/**
 * Build block groups from OCR result, preserving spatial layout.
 *
 * For horizontal text pages:
 *   - Sort blocks by Y (top → bottom)
 *   - Calculate Y-based proportional gaps
 *
 * For vertical text pages (manga):
 *   - Sort blocks by X descending (right → left, manga reading order)
 *   - Calculate X-based proportional gaps
 *
 * @returns groups, items, and isPageVertical flag
 */
function buildBlockGroups(
  blocks: PositionedOcrBlock[],
  pageId: string,
  locale?: string
): { groups: OcrBlockGroup[]; items: ReaderSentenceAnalysisItem[]; isPageVertical: boolean } {
  if (!blocks.length) return { groups: [], items: [], isPageVertical: false };

  // Filter out blocks with no text
  const valid = blocks.filter((b) => b.text.trim());
  if (!valid.length) return { groups: [], items: [], isPageVertical: false };

  // Determine page text direction by majority vote
  const verticalCount = valid.filter(isBlockVertical).length;
  const isPageVertical = verticalCount > valid.length / 2;

  // Sort by reading order
  const sorted = isPageVertical
    ? [...valid].sort((a, b) => b.x - a.x) // Right-to-left for vertical/manga
    : [...valid].sort((a, b) => a.y - b.y); // Top-to-bottom for horizontal

  const allItems: ReaderSentenceAnalysisItem[] = [];
  const groups: OcrBlockGroup[] = [];

  sorted.forEach((block, idx) => {
    // Split block text into sentences
    const sentences = splitIntoSentences(block.text, locale).filter((s) => s.trim());
    const sentenceIds: string[] = [];

    sentences.forEach((sent, sIdx) => {
      const id = `${pageId}-b${idx}-s${sIdx}`;
      sentenceIds.push(id);
      allItems.push({
        id,
        text: sent,
        chapterId: pageId,
        paragraphIndex: idx,
        sentenceIndex: sIdx,
        status: "idle",
      });
    });

    if (sentenceIds.length > 0) {
      groups.push({
        blockIndex: idx,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        isVertical: isBlockVertical(block),
        sentenceIds,
      });
    }
  });

  return { groups, items: allItems, isPageVertical };
}

/**
 * Fallback: build a single block group from flat text (for text-only OCR results
 * that lack coordinate data).
 */
function buildFlatSentenceItems(
  text: string,
  pageId: string,
  locale?: string
): ReaderSentenceAnalysisItem[] {
  if (!text.trim()) return [];

  const paragraphs = text.split(/\n+/).filter((p) => p.trim());
  const items: ReaderSentenceAnalysisItem[] = [];

  paragraphs.forEach((para, pIdx) => {
    const sentences = splitIntoSentences(para, locale).filter((s) => s.trim());
    sentences.forEach((sent, sIdx) => {
      items.push({
        id: `${pageId}-${pIdx}-${sIdx}`,
        text: sent,
        chapterId: pageId,
        paragraphIndex: pIdx,
        sentenceIndex: sIdx,
        status: "idle",
      });
    });
  });

  return items;
}

// ── Component ───────────────────────────────────────────────────────────────

const ImageStudyPanel = forwardRef<ImageStudyPanelHandle, ImageStudyPanelProps>(
  (
    {
      bookId,
      filePath,
      format,
      totalPages,
      initialPage = 1,
      onPageChange,
      ocrEngine,
    },
    ref
  ) => {
    // ── Page state ────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [currentImage, setCurrentImage] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pageCacheRef = useRef<Map<number, PageData>>(new Map());
    const pdfDocRef = useRef<any>(null);
    const pdfBytesLoadedRef = useRef<string | null>(null);

    // ── OCR state ─────────────────────────────────────────────────────────
    const [ocrText, setOcrText] = useState("");
    const [isOcrRunning, setIsOcrRunning] = useState(false);
    const [blockGroups, setBlockGroups] = useState<OcrBlockGroup[]>([]);
    const [isPageVertical, setIsPageVertical] = useState(false);
    const [ocrSourceDim, setOcrSourceDim] = useState({ w: 0, h: 0 });
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [rightPanelSize, setRightPanelSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
      if (!rightPanelRef.current) return;
      const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setRightPanelSize({
            w: entry.contentRect.width,
            h: entry.contentRect.height,
          });
        }
      });
      obs.observe(rightPanelRef.current);
      return () => obs.disconnect();
    }, []);

    // ── Sentence analysis state ───────────────────────────────────────────
    const [sentenceItems, setSentenceItems] = useState<ReaderSentenceAnalysisItem[]>([]);
    const sentenceItemsRef = useRef<ReaderSentenceAnalysisItem[]>([]);
    const processingRef = useRef(false);
    const pageGenerationRef = useRef(0);
    const flushTimerRef = useRef<number | null>(null);
    const languageRef = useRef<string | undefined>(undefined);

    // ── Popover state ─────────────────────────────────────────────────────
    const [popover, setPopover] = useState<TokenPopoverState>(INITIAL_POPOVER);
    const [vocabSet, setVocabSet] = useState<Set<string>>(new Set());
    const currentSentenceRef = useRef("");
    const tokenRequestIdRef = useRef(0);
    const popoverRef = useRef(popover);
    popoverRef.current = popover;

    // ── Page jump input state ────────────────────────────────────────────
    const [isPageInputVisible, setIsPageInputVisible] = useState(false);
    const [pageInputValue, setPageInputValue] = useState("");

    // ── Anti-overlap refs ────────────────────────────────────────────
    const { setBlockRef, blockRefsMap } = useBlockRefs();
    const projectionCanvasRef = useRef<HTMLDivElement>(null);
    const [nudgeMap, setNudgeMap] = useState<Map<number, NudgeOffset>>(new Map());

    // ── Split ratio (draggable divider) ─────────────────────────────
    const [splitRatio, setSplitRatio] = useState(() => {
      try {
        const saved = localStorage.getItem("midda-study-split-ratio");
        if (saved) {
          const val = parseFloat(saved);
          if (val >= 0.3 && val <= 0.7) return val;
        }
      } catch {}
      return 0.5;
    });
    const isDraggingRef = useRef(false);
    const dualPaneRef = useRef<HTMLDivElement>(null);

    const handleDividerPointerDown = useCallback((e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const handleDividerPointerMove = useCallback((e: React.PointerEvent) => {
      if (!isDraggingRef.current || !dualPaneRef.current) return;
      const rect = dualPaneRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0.3, Math.min(0.7, x / rect.width));
      setSplitRatio(ratio);
    }, []);

    const handleDividerPointerUp = useCallback((e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      // Persist ratio
      try { localStorage.setItem("midda-study-split-ratio", String(splitRatio)); } catch {}
    }, [splitRatio]);

    // ── Bidirectional block highlight ───────────────────────────────
    const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
    const [hoverSource, setHoverSource] = useState<"left" | "right" | null>(null);
    const [pinnedBlockIndex, setPinnedBlockIndex] = useState<number | null>(null);
    const leftImageRef = useRef<HTMLImageElement>(null);

    // Cache original block rects (before pop-transform) so getPopTransform
    // always computes from the untransformed position, even after re-render.
    const originalBlockRectsRef = useRef<Map<number, DOMRect>>(new Map());

    /** Snapshot all block positions (call before applying pop transforms) */
    const snapshotBlockRects = useCallback(() => {
      const canvas = projectionCanvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const map = new Map<number, DOMRect>();
      blockRefsMap.current.forEach((el, idx) => {
        const r = el.getBoundingClientRect();
        map.set(idx, new DOMRect(
          r.x - canvasRect.x, r.y - canvasRect.y, r.width, r.height
        ));
      });
      originalBlockRectsRef.current = map;
    }, [blockRefsMap]);

    /** Convenience: set both index and source at once */
    const hoverBlock = useCallback((index: number | null, source: "left" | "right" | null) => {
      // When pinned, ignore mouse-leave events but allow hovering a DIFFERENT block
      if (index === null && pinnedBlockIndex !== null) return;
      setHoveredBlockIndex(index);
      setHoverSource(source);
    }, [pinnedBlockIndex]);

    /** Pin a block (click on left SVG rect) */
    const pinBlock = useCallback((index: number) => {
      setPinnedBlockIndex((prev) => {
        if (prev === index) {
          // Unpin: clear everything
          setHoveredBlockIndex(null);
          setHoverSource(null);
          return null;
        }
        // Only snapshot if the block isn't already popped via hover —
        // re-snapshotting while popped would capture the center position.
        const alreadyPopped =
          hoveredBlockIndex === index && hoverSource === "left";
        if (!alreadyPopped) {
          snapshotBlockRects();
        }
        setHoveredBlockIndex(index);
        setHoverSource("left");
        return index;
      });
    }, [snapshotBlockRects, hoveredBlockIndex, hoverSource]);

    /** Unpin (click on background) */
    const unpinBlock = useCallback(() => {
      if (pinnedBlockIndex !== null) {
        setPinnedBlockIndex(null);
        setHoveredBlockIndex(null);
        setHoverSource(null);
      }
    }, [pinnedBlockIndex]);

    /** The "active" block index: pinned takes priority over hovered */
    const activeBlockIndex = pinnedBlockIndex ?? hoveredBlockIndex;
    const activeSource = pinnedBlockIndex !== null ? "left" : hoverSource;

    // Refs tracking active pop state for anti-overlap (avoids stale closures)
    const activeBlockIndexRef = useRef(activeBlockIndex);
    const activeSourceRef = useRef(activeSource);
    activeBlockIndexRef.current = activeBlockIndex;
    activeSourceRef.current = activeSource;

    /**
     * Compute the CSS transform to pop a block card to the center of the
     * projection canvas and scale it up. Only used when activeSource === 'left'.
     *
     * Uses the cached original rect (if available) to avoid drift when the
     * block is already transformed.
     */
    const getPopTransform = useCallback(
      (blockIndex: number, nudge?: { dx: number; dy: number }): string | undefined => {
        if (activeSource !== "left" || activeBlockIndex !== blockIndex) return undefined;

        const canvas = projectionCanvasRef.current;
        if (!canvas) return undefined;

        const canvasRect = canvas.getBoundingClientRect();
        const canvasW = canvasRect.width;
        const canvasH = canvasRect.height;

        // Prefer cached original rect; fall back to live measurement
        const cachedRect = originalBlockRectsRef.current.get(blockIndex);
        const blockEl = blockRefsMap.current.get(blockIndex);
        if (!cachedRect && !blockEl) return undefined;

        let blockRelCx: number;
        let blockRelCy: number;

        if (cachedRect) {
          blockRelCx = cachedRect.x + cachedRect.width / 2;
          blockRelCy = cachedRect.y + cachedRect.height / 2;
        } else {
          const r = blockEl!.getBoundingClientRect();
          blockRelCx = (r.x - canvasRect.x) + r.width / 2;
          blockRelCy = (r.y - canvasRect.y) + r.height / 2;
        }

        const dx = canvasW / 2 - blockRelCx + (nudge?.dx ?? 0);
        const dy = canvasH / 2 - blockRelCy + (nudge?.dy ?? 0);

        return `translate(${dx}px, ${dy}px) scale(1.08)`;
      },
      [activeSource, activeBlockIndex, blockRefsMap]
    );

    const { fontFamily, fontSize, lineHeight, enableTokenHoverTts, analysisTtsLanguage: ttsLanguage } = useReaderSettings();

    const pageProgress = useMemo(
      () => (totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0),
      [currentPage, totalPages]
    );

    // ── Load vocabulary ───────────────────────────────────────────────────
    useEffect(() => {
      window.api.db.vocabulary
        .getBaseForms()
        .then((arr: string[]) => setVocabSet(new Set(arr)))
        .catch(() => {});
    }, [bookId]);

    // ── Flush sentence items to React state (batched) ─────────────────────
    const flushSentenceItemsToState = useCallback(() => {
      if (flushTimerRef.current !== null) return;
      flushTimerRef.current = requestAnimationFrame(() => {
        flushTimerRef.current = null;
        setSentenceItems(sentenceItemsRef.current);
      });
    }, []);

    // ── Page loading ──────────────────────────────────────────────────────
    const loadPage = useCallback(
      async (page: number): Promise<PageData | null> => {
        const cached = pageCacheRef.current.get(page);
        if (cached) return cached;

        try {
          let pageData: PageData;

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
            const result = await window.api.book.getPage(bookId, filePath, format, page);
            pageData = {
              dataUrl: result.dataUrl,
              width: result.width,
              height: result.height,
            };
          }

          pageCacheRef.current.set(page, pageData);

          // Evict old cache entries
          if (pageCacheRef.current.size > 5) {
            for (const key of pageCacheRef.current.keys()) {
              if (Math.abs(key - page) > 2) pageCacheRef.current.delete(key);
            }
          }

          return pageData;
        } catch (err) {
          console.error(`Failed to load page ${page}:`, err);
          return null;
        }
      },
      [bookId, filePath, format]
    );

    // ── Load current page ─────────────────────────────────────────────────
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

        // Preload adjacent
        if (currentPage > 1) void loadPage(currentPage - 1);
        if (currentPage < totalPages) void loadPage(currentPage + 1);
      })();

      return () => { cancelled = true; };
    }, [currentPage, loadPage, totalPages]);

    // ── Notify parent of page changes ──────────────────────────────────
    useEffect(() => {
      onPageChange?.(currentPage, totalPages, pageProgress);
    }, [currentPage, totalPages, pageProgress, onPageChange]);

    // ── OCR — trigger when page changes ──────────────────────────────────
    useEffect(() => {
      if (!currentImage) return;

      const generation = ++pageGenerationRef.current;
      let cancelled = false;
      let timeoutId: number | undefined;

      // Reset state
      setOcrText("");
      setBlockGroups([]);
      setOcrSourceDim({ w: 0, h: 0 });
      setIsOcrRunning(true);
      sentenceItemsRef.current = [];
      setSentenceItems([]);
      clearQueue();
      languageRef.current = undefined;

      if (flushTimerRef.current !== null) {
        cancelAnimationFrame(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      timeoutId = window.setTimeout(async () => {
        try {
          let blocks: PositionedOcrBlock[] = [];
          let sourceHeight = currentImage.height;
          let sourceWidth = currentImage.width;
          let fallbackText = "";

          if (ocrEngine === "manga") {
            if (!window?.api?.ocr?.mangaRecognize) return;
            const result = await window.api.ocr.mangaRecognize({
              requestId: `study-ocr-${generation}`,
              imageInput: currentImage.dataUrl,
            });
            if (cancelled || pageGenerationRef.current !== generation) return;
            blocks = result?.blocks ?? [];
            sourceHeight = result?.sourceHeight || currentImage.height;
            sourceWidth = result?.sourceWidth || currentImage.width;
            if (!blocks.length) fallbackText = result?.text ?? "";
          } else {
            if (!window?.api?.ocr?.recognizeText) return;
            const result = await window.api.ocr.recognizeText(currentImage.dataUrl);
            if (cancelled || pageGenerationRef.current !== generation) return;
            blocks = result?.blocks ?? [];
            if (!blocks.length) fallbackText = result?.text ?? "";
          }

          if (cancelled || pageGenerationRef.current !== generation) return;

          const pageId = `page-${currentPage}`;

          // Check if blocks have valid coordinates
          const hasCoords = blocks.some((b) => b.width > 0 && b.height > 0);

          let items: ReaderSentenceAnalysisItem[];

          if (hasCoords && blocks.length > 0) {
            // Filter out zero-sized blocks (text-only, no bbox)
            const positionedBlocks = blocks.filter((b) => b.width > 0 && b.height > 0);
            const unpositionedText = blocks
              .filter((b) => b.width === 0 || b.height === 0)
              .map((b) => b.text)
              .join("\n");
            const result = buildBlockGroups(positionedBlocks, pageId);
            // Append unpositioned text as flat sentences after positioned blocks
            if (unpositionedText.trim()) {
              const flatItems = buildFlatSentenceItems(unpositionedText, `${pageId}-flat`);
              result.items.push(...flatItems);
            }
            items = result.items;
            setBlockGroups(result.groups);
            setIsPageVertical(result.isPageVertical);
            setOcrSourceDim({ w: sourceWidth, h: sourceHeight });
            setOcrText(blocks.map((b) => b.text).join("\n"));
          } else {
            // Fallback: flat text layout (no coordinate data)
            const text = blocks.map((b) => b.text).join("\n") || fallbackText;
            items = buildFlatSentenceItems(text, pageId);
            setBlockGroups([]);
            setOcrSourceDim({ w: sourceWidth, h: sourceHeight });
            setOcrText(text);
          }

          sentenceItemsRef.current = items;
          setSentenceItems(items);
          setIsOcrRunning(false);

          // Detect language
          if (items.length > 0) {
            const samples = items.slice(0, 25).map((i) => i.text).filter(Boolean);
            if (samples.length > 0) {
              const detection = detectLanguageForSamples(samples);
              languageRef.current = detection.languageCode;
            }
          }

          // Start analysis
          if (items.length > 0) {
            void processAnalysis(generation);
          }
        } catch (err) {
          if (!cancelled && pageGenerationRef.current === generation) {
            const isAbort = err instanceof Error &&
              (err.name === "AbortError" || err.message === "cancelled" || err.message.includes("已取消"));
            if (!isAbort) {
              console.error("OCR failed:", err);
              setOcrText("OCR 识别失败");
            }
            setIsOcrRunning(false);
          }
        }
      }, MANGA_OCR_DEBOUNCE_MS);

      return () => {
        cancelled = true;
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentImage, ocrEngine, currentPage]);

    // ── Sentence analysis loop ────────────────────────────────────────────
    const processAnalysis = useCallback(
      async (generation: number) => {
        if (processingRef.current) return;
        processingRef.current = true;

        try {
          const languageHint = languageRef.current;

          while (true) {
            if (pageGenerationRef.current !== generation) break;

            const nextIdle = sentenceItemsRef.current.find((i) => i.status === "idle");
            if (!nextIdle) break;

            // Mark loading
            sentenceItemsRef.current = sentenceItemsRef.current.map((e) =>
              e.id === nextIdle.id ? { ...e, status: "loading" as const } : e
            );
            flushSentenceItemsToState();

            try {
              // Check cache
              const cached = await window.api.db.sentenceAnalysis.getBySentence(
                bookId,
                nextIdle.text,
                { chapterId: nextIdle.chapterId, sentenceId: nextIdle.id }
              );

              if (cached?.tokens?.length) {
                sentenceItemsRef.current = sentenceItemsRef.current.map((e) =>
                  e.id === nextIdle.id
                    ? { ...e, status: "loaded" as const, tokens: cached.tokens }
                    : e
                );
                flushSentenceItemsToState();
                continue;
              }

              const tokens: TokenData[] = await queuedSendTokensRequest(
                nextIdle.text,
                { language: languageHint }
              );

              if (pageGenerationRef.current !== generation) break;

              sentenceItemsRef.current = sentenceItemsRef.current.map((e) =>
                e.id === nextIdle.id
                  ? { ...e, status: "loaded" as const, tokens }
                  : e
              );
              flushSentenceItemsToState();

              // Persist
              await window.api.db.sentenceAnalysis.upsert({
                bookId,
                text: nextIdle.text,
                tokens,
                chapterId: `page-${currentPage}`,
                sentenceId: nextIdle.id,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "分析失败";
              sentenceItemsRef.current = sentenceItemsRef.current.map((e) =>
                e.id === nextIdle.id
                  ? { ...e, status: "error" as const, error: message }
                  : e
              );
              flushSentenceItemsToState();
            }
          }
        } finally {
          processingRef.current = false;
        }
      },
      [bookId, currentPage, flushSentenceItemsToState]
    );

    // ── Navigation ────────────────────────────────────────────────────────
    const goToPage = useCallback(
      (page: number) => {
        setPinnedBlockIndex(null);
        setHoveredBlockIndex(null);
        setHoverSource(null);
        setCurrentPage(Math.max(1, Math.min(totalPages, page)));
      },
      [totalPages]
    );

    const loadThumbnail = useCallback(
      async (page: number): Promise<string | null> => {
        const clamped = Math.max(1, Math.min(totalPages, page));
        const data = await loadPage(clamped);
        return data?.dataUrl ?? null;
      },
      [loadPage, totalPages]
    );

    const goToNextPage = useCallback(() => {
      if (currentPage < totalPages) setCurrentPage((p) => p + 1);
    }, [currentPage, totalPages]);

    const goToPrevPage = useCallback(() => {
      if (currentPage > 1) setCurrentPage((p) => p - 1);
    }, [currentPage]);

    // ── Page jump handlers ────────────────────────────────────────────
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

    const handleSliderChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        goToPage(Number(e.target.value));
      },
      [goToPage]
    );

    // Keyboard nav
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
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
    }, [goToNextPage, goToPrevPage]);

    useImperativeHandle(ref, () => ({ goToPage, loadThumbnail }), [goToPage, loadThumbnail]);

    // Cleanup
    useEffect(() => {
      return () => {
        // Invalidate any in-flight analysis loop so it stops queuing requests
        pageGenerationRef.current++;
        clearQueue();

        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }
        if (flushTimerRef.current !== null) {
          cancelAnimationFrame(flushTimerRef.current);
        }
      };
    }, []);

    // ── Token click → popover ─────────────────────────────────────────────
    const handleTokenClick = useCallback(
      async (
        e: React.MouseEvent<HTMLSpanElement>,
        token: TokenData,
        sentenceText: string,
        chapterId: string
      ) => {
        e.stopPropagation();
        currentSentenceRef.current = sentenceText;
        const requestId = ++tokenRequestIdRef.current;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const pw = 300;
        let x = rect.left + rect.width / 2 - pw / 2;
        x = Math.max(8, Math.min(x, window.innerWidth - pw - 8));
        const yAbove = rect.top - 240;
        const y = yAbove < 80 ? rect.bottom + 8 : yAbove;

        const basePopover: TokenPopoverState = {
          visible: true,
          x,
          y,
          word: token.word,
          reading: token.furigana ?? "",
          pos: token.pos,
          romaji: token.romaji ?? "",
          baseForm:
            token.baseForm && token.baseForm !== token.word ? token.baseForm : "",
          dictLoading: true,
          dictData: null,
          examples: [],
          examplesLoading: false,
          aiMeaning: "",
          aiLoading: false,
        };

        setPopover(basePopover);

        const emptyDict = {
          found: false,
          headword: "",
          reading: "",
          pos: [] as string[],
          glosses: [] as string[],
          senses: [] as import("../../types/localDict").DictSense[],
          allEntries: [] as import("../../types/localDict").DictEntry[],
        };

        try {
          const hasBaseForm = !!token.baseForm;
          const isAlreadyDictForm = !token.baseForm || token.baseForm === token.word;

          if (!hasBaseForm) {
            if (tokenRequestIdRef.current !== requestId) return;
            setPopover((prev) => ({ ...prev, dictLoading: false, dictData: emptyDict }));
          } else {
            const dictResult = await lookupDict(token.baseForm!);
            if (tokenRequestIdRef.current !== requestId) return;
            let dictData = dictResult ? formatDictResult(dictResult) : emptyDict;

            if (!dictData.found && isAlreadyDictForm) {
              const surfaceResult = await lookupDict(token.word);
              if (tokenRequestIdRef.current !== requestId) return;
              dictData = surfaceResult ? formatDictResult(surfaceResult) : emptyDict;
            }

            setPopover((prev) => ({ ...prev, dictLoading: false, dictData }));

            if (dictData.found && dictData.allEntries.length > 0) {
              const bestEntryId = dictData.allEntries[0].id;
              setPopover((prev) => ({ ...prev, examplesLoading: true }));
              lookupExamples(bestEntryId, 5)
                .then((examples) => {
                  if (tokenRequestIdRef.current !== requestId) return;
                  setPopover((prev) => ({
                    ...prev,
                    examplesLoading: false,
                    examples: examples ?? [],
                  }));
                })
                .catch(() => {
                  if (tokenRequestIdRef.current !== requestId) return;
                  setPopover((prev) => ({ ...prev, examplesLoading: false }));
                });
            }
          }
        } catch {
          setPopover((prev) => ({ ...prev, dictLoading: false, dictData: emptyDict }));
        }

        // Auto-save to vocabulary
        if (token.pos !== "記号") {
          const bf = token.baseForm || token.word;
          void window.api.db.vocabulary.upsert({
            word: token.word,
            baseForm: bf,
            hasLemma: !!token.baseForm,
            reading: token.furigana,
            romaji: token.romaji,
            pos: token.pos,
            sourceBookId: bookId,
            sentenceText,
            sentenceBookId: bookId,
            sentenceChapterId: chapterId,
          });
          setVocabSet((prev) => {
            if (prev.has(bf)) return prev;
            const next = new Set(prev);
            next.add(bf);
            return next;
          });
        }
      },
      [bookId]
    );

    // ── AI lookup ─────────────────────────────────────────────────────────
    const handleRequestAi = useCallback(async () => {
      setPopover((prev) => {
        if (prev.aiLoading || prev.aiMeaning) return prev;
        return { ...prev, aiLoading: true };
      });

      try {
        const p = popoverRef.current;
        const detail = await window.api.wordDetail.sendWordDetailRequest(
          p.word,
          p.pos,
          currentSentenceRef.current,
          p.reading,
          p.romaji
        );
        setPopover((prev) => ({
          ...prev,
          aiLoading: false,
          aiMeaning: detail?.chineseTranslation
            ? `${detail.chineseTranslation}${detail.explanation ? `\n${detail.explanation}` : ""}`
            : "无释义",
        }));
      } catch {
        setPopover((prev) => ({
          ...prev,
          aiLoading: false,
          aiMeaning: "AI 查询失败",
        }));
      }
    }, []);

    const closePopover = useCallback(() => setPopover(INITIAL_POPOVER), []);

    // ── Computed ──────────────────────────────────────────────────────────
    const sentencesLoaded = useMemo(
      () => sentenceItems.filter((s) => s.status === "loaded" && s.tokens?.length).length,
      [sentenceItems]
    );
    const sentencesTotal = sentenceItems.length;

    // ── Source dimensions for 2D projection ─────────────────────────────
    // Fallback to currentImage if ocrSourceDim is not yet available,
    // though ocrSourceDim is preferred as it reflects the OCR's coordinate space.
    const sourceWidth = ocrSourceDim.w || (currentImage?.width ?? 0);
    const sourceHeight = ocrSourceDim.h || (currentImage?.height ?? 0);

    const panelW = rightPanelSize.w;
    const panelH = rightPanelSize.h;
    let renderW = 0;
    let renderH = 0;

    if (panelW > 0 && panelH > 0 && sourceWidth > 0 && sourceHeight > 0) {
      const imageAspect = sourceWidth / sourceHeight;
      const panelAspect = panelW / panelH;
      if (imageAspect > panelAspect) {
        renderW = panelW;
        renderH = panelW / imageAspect;
      } else {
        renderH = panelH;
        renderW = panelH * imageAspect;
      }
    }

    // ── Anti-overlap: measure blocks and resolve collisions ─────────────
    // Track the number of loaded sentences as a dependency for re-measurement
    const loadedTokenCount = useMemo(
      () => sentenceItems.filter((s) => s.status === "loaded" && s.tokens?.length).length,
      [sentenceItems]
    );

    useEffect(() => {
      if (blockGroups.length === 0 || !projectionCanvasRef.current) {
        setNudgeMap(new Map());
        return;
      }

      // Debounce: wait for next animation frame after layout settles
      const rafId = requestAnimationFrame(() => {
        const canvas = projectionCanvasRef.current;
        if (!canvas || blockRefsMap.current.size === 0) {
          setNudgeMap(new Map());
          return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const MIN_GAP = 6;

        // Collect block rects relative to canvas
        type BlockRect = { index: number; rect: DOMRect };
        const measured: BlockRect[] = [];
        // Determine which block is currently popped (pinned or left-hovered)
        const poppedIdx = activeSourceRef.current === "left" ? activeBlockIndexRef.current : null;

        blockRefsMap.current.forEach((el, index) => {
          if (index === poppedIdx) {
            // Use cached original rect for the popped block to avoid
            // measuring its center-of-canvas visual position
            const cached = originalBlockRectsRef.current.get(index);
            if (cached) {
              measured.push({ index, rect: cached });
            }
            return;
          }
          const r = el.getBoundingClientRect();
          measured.push({
            index,
            rect: new DOMRect(
              r.x - canvasRect.x,
              r.y - canvasRect.y,
              r.width,
              r.height
            ),
          });
        });

        if (measured.length <= 1) {
          setNudgeMap(new Map());
          return;
        }

        // Sort by reading order (block index preserves reading order)
        measured.sort((a, b) => a.index - b.index);

        // Greedy sweep: for each block, push it away from all previous blocks
        const nudges: { index: number; dx: number; dy: number }[] = measured.map((m) => ({
          index: m.index,
          dx: 0,
          dy: 0,
        }));

        for (let i = 1; i < measured.length; i++) {
          let curX = measured[i].rect.x + nudges[i].dx;
          let curY = measured[i].rect.y + nudges[i].dy;
          const curW = measured[i].rect.width;
          const curH = measured[i].rect.height;

          for (let j = 0; j < i; j++) {
            const prevX = measured[j].rect.x + nudges[j].dx;
            const prevY = measured[j].rect.y + nudges[j].dy;
            const prevW = measured[j].rect.width;
            const prevH = measured[j].rect.height;

            // Check overlap
            const overlapsX = curX < prevX + prevW + MIN_GAP && curX + curW > prevX - MIN_GAP;
            const overlapsY = curY < prevY + prevH + MIN_GAP && curY + curH > prevY - MIN_GAP;

            if (overlapsX && overlapsY) {
              if (isPageVertical) {
                // Vertical text: nudge left
                const needed = curX + curW + MIN_GAP - prevX;
                if (needed > 0) {
                  nudges[i].dx -= needed;
                  curX = measured[i].rect.x + nudges[i].dx;
                }
              } else {
                // Horizontal text: nudge down
                const needed = prevY + prevH + MIN_GAP - curY;
                if (needed > 0) {
                  nudges[i].dy += needed;
                  curY = measured[i].rect.y + nudges[i].dy;
                }
              }
            }
          }
        }

        // Build nudge map (only non-zero entries)
        const newMap = new Map<number, NudgeOffset>();
        for (const n of nudges) {
          if (Math.abs(n.dx) > 0.5 || Math.abs(n.dy) > 0.5) {
            newMap.set(n.index, { dx: n.dx, dy: n.dy });
          }
        }

        setNudgeMap((prev) => {
          // Avoid re-render if nothing changed
          if (prev.size === 0 && newMap.size === 0) return prev;
          return newMap;
        });
      });

      return () => cancelAnimationFrame(rafId);
    }, [blockGroups, loadedTokenCount, renderW, renderH, isPageVertical, blockRefsMap]);

    // ── Render ────────────────────────────────────────────────────────────
    return (
      <div className="flex flex-col h-full w-full bg-[#1c1c1e] overflow-hidden">
        {/* ── Dual-pane area ── */}
        <div ref={dualPaneRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left pane: page image ── */}
        <div
          className="flex items-center justify-center bg-[#1a1a1a] overflow-hidden relative select-none min-w-0"
          style={{ width: `${splitRatio * 100}%`, flexShrink: 0 }}
          onClick={unpinBlock}
        >
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 text-red-400">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!isLoading && !error && currentImage && (
            <img
              ref={leftImageRef}
              src={currentImage.dataUrl}
              alt={`Page ${currentPage}`}
              className="max-w-full max-h-full object-contain block"
              draggable={false}
            />
          )}

          {/* Click-to-turn page-turn buttons (same as EPUB paged mode) */}
          <PageTurnButton direction="prev" onClick={goToPrevPage} disabled={currentPage <= 1} absolute zIndex={10} />
          <PageTurnButton direction="next" onClick={goToNextPage} disabled={currentPage >= totalPages} absolute zIndex={10} />

          {/* SVG overlay: interactive hover zones + highlight (z-20, above turn zones) */}
          {!isLoading && !error && currentImage && blockGroups.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full z-20"
              viewBox={`0 0 ${sourceWidth} ${sourceHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ pointerEvents: "none" }}
            >
              {/* Layer 1: Transparent interactive rects — only block areas capture events */}
              {blockGroups.map((g) => (
                <rect
                  key={`hit-${g.blockIndex}`}
                  x={g.x}
                  y={g.y}
                  width={g.width}
                  height={g.height}
                  fill="transparent"
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onMouseEnter={() => { snapshotBlockRects(); hoverBlock(g.blockIndex, "left"); }}
                  onMouseLeave={() => hoverBlock(null, null)}
                  onClick={(e) => { e.stopPropagation(); pinBlock(g.blockIndex); }}
                />
              ))}

              {/* Layer 2: Visible highlight for the hovered/pinned block */}
              {activeBlockIndex !== null &&
                blockGroups
                  .filter((g) => g.blockIndex === activeBlockIndex)
                  .map((g) => (
                    <rect
                      key={`hl-${g.blockIndex}`}
                      x={g.x}
                      y={g.y}
                      width={g.width}
                      height={g.height}
                      rx={4}
                      fill="rgba(0, 122, 255, 0.12)"
                      stroke="rgba(0, 122, 255, 0.6)"
                      strokeWidth={2}
                      style={{ pointerEvents: "none" }}
                    />
                  ))}
            </svg>
          )}


        </div>

        {/* ── Draggable divider ── */}
        <div
          className="flex-shrink-0 flex items-center justify-center cursor-col-resize group z-10"
          style={{ width: 6, touchAction: "none" }}
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onPointerUp={handleDividerPointerUp}
        >
          <div className="w-px h-full bg-white/10 group-hover:bg-[#007aff]/40 group-active:bg-[#007aff]/60 transition-colors" />
        </div>

        {/* ── Right pane: OCR text analysis ── */}
        <div
          ref={rightPanelRef}
          className="min-w-0 overflow-y-auto overscroll-contain bg-[#fdfdfd] relative flex items-center justify-center p-2"
          style={{
            width: `${(1 - splitRatio) * 100}%`,
            flexShrink: 0,
            scrollbarWidth: "none",
            fontFamily: fontFamily || "inherit",
            fontSize: `${fontSize}px`,
            lineHeight,
          }}
          onClick={unpinBlock}
        >
          {/* Status Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-50">
            {isOcrRunning && (
              <>
                {/* Skeleton placeholder blocks */}
                <div className="absolute inset-0 p-6 flex flex-col gap-4 justify-start items-center pt-[15%]">
                  {[0.75, 0.55, 0.85, 0.45, 0.65].map((w, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-gray-200/60 animate-pulse"
                      style={{
                        width: `${w * 100}%`,
                        height: 32 + (i % 2) * 12,
                        animationDelay: `${i * 150}ms`,
                      }}
                    />
                  ))}
                </div>
                {/* Floating status badge */}
                <div className="flex items-center gap-2 py-3 px-5 bg-white/90 backdrop-blur-sm rounded-full shadow-md text-gray-600 z-10">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#007aff] rounded-full animate-spin" />
                  <span className="text-sm font-medium">
                    {ocrEngine === "manga" ? "PaddleOCR 识别中..." : "OCR 识别中..."}
                  </span>
                </div>
              </>
            )}

            {!isOcrRunning && !ocrText && (
              <div className="py-4 px-6 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-gray-500">
                <span className="text-sm">当前页面暂无可识别的文字</span>
              </div>
            )}
            
            {!isOcrRunning && ocrText && sentencesTotal > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 mt-4 text-center pointer-events-auto">
                <span className="inline-block px-3 py-1 bg-black/5 backdrop-blur-sm rounded-full text-xs text-gray-500 tabular-nums shadow-sm">
                  {sentencesLoaded}/{sentencesTotal} 句已分析
                </span>
              </div>
            )}
          </div>

          {/* 2D Projection Canvas */}
          {renderW > 0 && renderH > 0 && (
            <div
              ref={projectionCanvasRef}
              className="relative shadow-[0_0_15px_rgba(0,0,0,0.03)] bg-white/20"
              style={{ width: renderW, height: renderH }}
            >
              {/* Block-aware absolute layout */}
              {blockGroups.length > 0 ? (
                blockGroups.map((group) => {
                  const groupItems = sentenceItems.filter((item) =>
                    group.sentenceIds.includes(item.id)
                  );
                  if (!groupItems.length) return null;

                  const pctX = (group.x / sourceWidth) * 100;
                  const pctY = (group.y / sourceHeight) * 100;
                  const pctWidth = (group.width / sourceWidth) * 100;

                  // Anti-overlap nudge offset
                  const nudge = nudgeMap.get(group.blockIndex);
                  const isPopTarget = activeSource === "left" && activeBlockIndex === group.blockIndex;
                  const popTransform = isPopTarget
                    ? getPopTransform(group.blockIndex, nudge)
                    : undefined;
                  const nudgeTransform = !isPopTarget && nudge
                    ? `translate(${nudge.dx}px, ${nudge.dy}px)`
                    : undefined;

                  return (
                    <div
                      key={group.blockIndex}
                      ref={setBlockRef(group.blockIndex)}
                      className={`absolute group transition-all backdrop-blur-md rounded-xl p-2 shadow-sm border ${
                        activeBlockIndex === group.blockIndex
                          ? "bg-white/95 border-[#007aff]/40 shadow-lg ring-1 ring-[#007aff]/20"
                          : "bg-white/85 hover:bg-white/95 border-gray-200/50 hover:shadow-lg"
                      }`}
                      style={{
                        top: `${pctY}%`,
                        ...(group.isVertical
                          ? {
                              right: `${100 - (pctX + pctWidth)}%`,
                              writingMode: "vertical-rl",
                              maxHeight: `${100 - pctY}%`,
                            }
                          : {
                              left: `${pctX}%`,
                              maxWidth: `${100 - pctX}%`,
                            }),
                        zIndex: isPopTarget ? 100 : undefined,
                        transform: popTransform ?? nudgeTransform ?? undefined,
                        transition: isPopTarget
                          ? "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms"
                          : nudgeTransform
                            ? "transform 250ms ease-out"
                            : "transform 200ms ease-out",
                      }}
                      onMouseEnter={() => hoverBlock(group.blockIndex, "right")}
                      onMouseLeave={() => hoverBlock(null, null)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {groupItems.map((item) => (
                        <StudySentenceRow
                          key={item.id}
                          item={item}
                          onTokenClick={handleTokenClick}
                          enableHoverTts={enableTokenHoverTts}
                          ttsLanguage={ttsLanguage}
                          vocabSet={vocabSet}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                /* Flat fallback: no coordinate data */
                sentenceItems.length > 0 && (
                  <div className="absolute inset-x-0 top-0 p-4 space-y-2 overflow-y-auto max-h-full">
                    <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-sm border border-gray-200/50">
                      {sentenceItems.map((item) => (
                        <StudySentenceRow
                          key={item.id}
                          item={item}
                          onTokenClick={handleTokenClick}
                          enableHoverTts={enableTokenHoverTts}
                          ttsLanguage={ttsLanguage}
                          vocabSet={vocabSet}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        </div>{/* end dual-pane area */}

        {/* ── Bottom progress bar (same Apple HIG style as normal mode) ── */}
        <div className="flex-shrink-0 w-full px-6 py-3 bg-[#fdfdfd]/90 backdrop-blur-md border-t border-gray-200/80 flex items-center gap-3">
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

        {/* Popover */}
        <StudyPopover
          state={popover}
          sentenceText={currentSentenceRef.current}
          onClose={closePopover}
          onRequestAi={handleRequestAi}
        />
      </div>
    );
  }
);

ImageStudyPanel.displayName = "ImageStudyPanel";
export default ImageStudyPanel;
