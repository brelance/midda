import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePaginationOptions {
  /** Called when the user tries to go past the last page */
  onNextChapter?: () => void;
  /** Called when the user tries to go before the first page */
  onPrevChapter?: () => void;
  /** Number of columns displayed per "page flip" (1 = single, 2 = double) */
  columnsPerPage?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  goToPage: (page: number) => void;
  /** Returns false if already on last page (triggers onNextChapter) */
  goToNextPage: () => boolean;
  /** Returns false if already on first page (triggers onPrevChapter) */
  goToPrevPage: () => boolean;
  /** Scroll the column view so a given DOM element is visible */
  goToPageContaining: (element: Element) => void;
  /** Call after content changes to recompute totalPages */
  recalculate: () => void;
  /** Attach to the clipping outer container */
  viewportRef: React.RefObject<HTMLDivElement>;
  /** Attach to the scrolling inner container (has CSS columns) */
  innerRef: React.RefObject<HTMLDivElement>;
  /** Current page progress (0-1) within this chapter */
  pageProgress: number;
}

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { onNextChapter, onPrevChapter, columnsPerPage = 1 } = options;

  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── Page size computation ───────────────────────────────────────────────
  const getPageWidth = useCallback((): number => {
    const viewport = viewportRef.current;
    if (!viewport) return window.innerWidth;
    return viewport.clientWidth;
  }, []);

  const recalculate = useCallback(() => {
    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner) return;

    const pageWidth = getPageWidth();
    if (pageWidth === 0) return;

    // Set CSS variable so column-width rule tracks the live viewport size
    viewport.style.setProperty("--page-col-width", `${pageWidth}px`);

    // Wait one frame for layout to settle after content render
    requestAnimationFrame(() => {
      if (!inner) return;
      const scrollWidth = inner.scrollWidth;
      const computed = Math.max(1, Math.round(scrollWidth / pageWidth));
      setTotalPages(computed);
    });
  }, [getPageWidth]);

  // ── Apply translation ───────────────────────────────────────────────────
  const applyTranslation = useCallback(
    (page: number) => {
      const inner = innerRef.current;
      if (!inner) return;
      const pageWidth = getPageWidth();
      inner.style.transform = `translateX(-${page * pageWidth}px)`;
    },
    [getPageWidth]
  );

  // ── Navigation ──────────────────────────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => {
      const total = totalPages;
      const clamped = Math.max(0, Math.min(page, total - 1));
      setCurrentPage(clamped);
      applyTranslation(clamped);
    },
    [totalPages, applyTranslation]
  );

  const goToNextPage = useCallback((): boolean => {
    setCurrentPage((prev) => {
      if (prev >= totalPages - 1) {
        onNextChapter?.();
        return prev;
      }
      const next = prev + 1;
      applyTranslation(next);
      return next;
    });
    return currentPage < totalPages - 1;
  }, [currentPage, totalPages, applyTranslation, onNextChapter]);

  const goToPrevPage = useCallback((): boolean => {
    setCurrentPage((prev) => {
      if (prev <= 0) {
        onPrevChapter?.();
        return prev;
      }
      const next = prev - 1;
      applyTranslation(next);
      return next;
    });
    return currentPage > 0;
  }, [currentPage, applyTranslation, onPrevChapter]);

  /** Find which page a DOM element lives on and jump there. Used by TTS. */
  const goToPageContaining = useCallback(
    (element: Element) => {
      const viewport = viewportRef.current;
      const inner = innerRef.current;
      if (!viewport || !inner) return;

      const pageWidth = getPageWidth();
      if (pageWidth === 0) return;

      // Temporarily remove transform to measure true offset from left
      const prevTransform = inner.style.transform;
      inner.style.transform = "none";
      const elRect = element.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      inner.style.transform = prevTransform;

      const offsetFromInnerLeft = elRect.left - innerRect.left;
      const page = Math.floor(offsetFromInnerLeft / pageWidth);
      goToPage(page);
    },
    [getPageWidth, goToPage]
  );

  // ── ResizeObserver ──────────────────────────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const ro = new ResizeObserver(() => {
      recalculate();
      // Re-apply translation so current page stays correct after resize
      applyTranslation(currentPage);
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [recalculate, applyTranslation, currentPage]);

  // ── Reset on columnsPerPage change ──────────────────────────────────────
  useEffect(() => {
    setCurrentPage(0);
    applyTranslation(0);
    // Delay recalculate so CSS columns can settle
    const id = setTimeout(() => recalculate(), 100);
    return () => clearTimeout(id);
  }, [columnsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageProgress = totalPages <= 1 ? 1 : currentPage / (totalPages - 1);

  return {
    currentPage,
    totalPages,
    canGoPrev: currentPage > 0,
    canGoNext: currentPage < totalPages - 1,
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToPageContaining,
    recalculate,
    viewportRef,
    innerRef,
    pageProgress,
  };
}
