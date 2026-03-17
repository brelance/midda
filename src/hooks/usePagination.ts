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

/**
 * Column-based pagination hook.
 *
 * Strategy: Instead of relying on CSS `column-width` (which is only a hint),
 * we explicitly set `column-width` to the viewport width and then measure
 * `scrollWidth` to derive the total number of "pages". Each page is exactly
 * one viewport-width of columns. The inner container is translated left by
 * `currentPage * viewportWidth` to show the correct page.
 *
 * The column gap is set to a comfortable reading padding (e.g. 48px) and the
 * column-width is adjusted to account for this gap so that content plus gap
 * perfectly tiles the viewport.
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { onNextChapter, onPrevChapter, columnsPerPage = 1 } = options;

  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── Stable refs so callbacks never go stale ─────────────────────────────
  const currentPageRef = useRef(0);
  const totalPagesRef = useRef(1);
  const onNextChapterRef = useRef(onNextChapter);
  const onPrevChapterRef = useRef(onPrevChapter);

  useEffect(() => { onNextChapterRef.current = onNextChapter; }, [onNextChapter]);
  useEffect(() => { onPrevChapterRef.current = onPrevChapter; }, [onPrevChapter]);

  // Keep refs in sync with state
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);

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

    // Set the CSS variable that column-width reads from
    viewport.style.setProperty("--page-col-width", `${pageWidth}px`);

    // Temporarily let columns flow naturally so we can measure total width
    inner.style.width = "max-content";

    // Force a synchronous layout so scrollWidth is up-to-date
    // Access offsetHeight to flush pending layout
    void inner.offsetHeight;

    const scrollWidth = inner.scrollWidth;
    const computed = Math.max(1, Math.round(scrollWidth / pageWidth));

    // Lock inner width to exact multiple of viewport width.
    // This forces CSS column boundaries to perfectly align with
    // the translateX page offsets, preventing content bleed.
    inner.style.width = `${computed * pageWidth}px`;

    totalPagesRef.current = computed;
    setTotalPages(computed);

    // Clamp current page if content shrank (e.g. window resize)
    const cur = currentPageRef.current;
    if (cur >= computed) {
      const clamped = Math.max(0, computed - 1);
      currentPageRef.current = clamped;
      setCurrentPage(clamped);
      inner.style.transform = `translateX(-${clamped * pageWidth}px)`;
    } else {
      // Re-apply transform in case width change shifted columns
      inner.style.transform = `translateX(-${cur * pageWidth}px)`;
    }
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
      const total = totalPagesRef.current;
      const clamped = Math.max(0, Math.min(page, total - 1));
      currentPageRef.current = clamped;
      setCurrentPage(clamped);
      applyTranslation(clamped);
    },
    [applyTranslation]
  );

  const goToNextPage = useCallback((): boolean => {
    const cur = currentPageRef.current;
    const total = totalPagesRef.current;
    if (cur >= total - 1) {
      onNextChapterRef.current?.();
      return false;
    }
    const next = cur + 1;
    currentPageRef.current = next;
    setCurrentPage(next);
    applyTranslation(next);
    return true;
  }, [applyTranslation]);

  const goToPrevPage = useCallback((): boolean => {
    const cur = currentPageRef.current;
    if (cur <= 0) {
      onPrevChapterRef.current?.();
      return false;
    }
    const next = cur - 1;
    currentPageRef.current = next;
    setCurrentPage(next);
    applyTranslation(next);
    return true;
  }, [applyTranslation]);

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

  // ── ResizeObserver — registered ONCE, uses refs for current page ────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const ro = new ResizeObserver(() => {
      recalculate();
      // Re-apply translation so current page stays correct after resize
      applyTranslation(currentPageRef.current);
    });
    ro.observe(viewport);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — uses refs; recalculate/applyTranslation are stable

  // ── Reset on columnsPerPage change ──────────────────────────────────────
  useEffect(() => {
    currentPageRef.current = 0;
    setCurrentPage(0);
    applyTranslation(0);
    // Delay recalculate so CSS columns can settle
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recalculate();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [columnsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageProgress =
    totalPages <= 1 ? 1 : currentPage / (totalPages - 1);

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
