import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from "react";
import { ReadingMode } from "../../types/reader";
import { usePagination } from "../../hooks/usePagination";
import PageTurnButton from "./PageTurnButton";

export interface ReaderContentPagedHandle {
  goToNextPage: () => boolean;
  goToPrevPage: () => boolean;
  goToPageContaining: (element: Element) => void;
  recalculate: () => void;
  currentPage: number;
  totalPages: number;
  pageProgress: number;
}

interface ReaderContentPagedProps {
  chapterTitle: string;
  contentHtml: string;
  cssContent?: string;
  readingMode: ReadingMode;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onPageChange?: (page: number, total: number, progress: number) => void;
}

/**
 * Page-turn reading mode content container.
 *
 * Layout:
 *   <viewport div>          ← overflow:hidden, fills available space
 *     <style>               ← scoped EPUB CSS (already prefixed)
 *     <inner div>           ← CSS columns, will-change:transform, transition
 *       <div.epub-content>  ← chapter content
 *     </inner div>
 *     <PageTurnButton prev />
 *     <PageTurnButton next />
 *   </viewport div>
 *
 * The inner div expands horizontally as CSS columns push content sideways.
 * We translate it left by (currentPage * viewportWidth) to show the right page.
 */
const ReaderContentPaged = forwardRef<
  ReaderContentPagedHandle,
  ReaderContentPagedProps
>(
  (
    {
      chapterTitle,
      contentHtml,
      cssContent,
      readingMode,
      onNextChapter,
      onPrevChapter,
      onPageChange,
    },
    ref
  ) => {
    const columnsPerPage = readingMode === "double" ? 2 : 1;

    const {
      currentPage,
      totalPages,
      canGoPrev,
      canGoNext,
      goToNextPage,
      goToPrevPage,
      goToPageContaining,
      recalculate,
      viewportRef,
      innerRef,
      pageProgress,
    } = usePagination({
      onNextChapter,
      onPrevChapter,
      columnsPerPage,
    });

    // Expose imperative handle for ReaderPage to call (TTS, chapter nav)
    useImperativeHandle(
      ref,
      () => ({
        goToNextPage,
        goToPrevPage,
        goToPageContaining,
        recalculate,
        currentPage,
        totalPages,
        pageProgress,
      }),
      [
        goToNextPage,
        goToPrevPage,
        goToPageContaining,
        recalculate,
        currentPage,
        totalPages,
        pageProgress,
      ]
    );

    // Notify parent when page changes
    useEffect(() => {
      onPageChange?.(currentPage, totalPages, pageProgress);
    }, [currentPage, totalPages, pageProgress, onPageChange]);

    // Recalculate pages after content changes (new chapter loaded)
    useEffect(() => {
      // Two frames: first for HTML parse, second for layout
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          recalculate();
        });
      });
      return () => cancelAnimationFrame(id);
    }, [contentHtml, readingMode, recalculate]);

    // Only set properties that change dynamically or are animation-specific.
    // columnFill, columnGap, column-width are handled by CSS class.
    const innerStyle = useMemo((): React.CSSProperties => ({
      height: "100%",
      willChange: "transform",
      transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
    }), []);

    const innerClassName =
      readingMode === "double"
        ? "page-inner page-columns-double"
        : "page-inner page-columns-single";

    return (
      <div
        ref={viewportRef}
        className="page-viewport relative h-full w-full overflow-hidden"
        style={{ isolation: "isolate" }}
      >
        {/* Scoped EPUB CSS — already prefixed by scopeEpubCss() */}
        {cssContent && (
          // eslint-disable-next-line react/no-danger
          <style dangerouslySetInnerHTML={{ __html: cssContent }} />
        )}

        {/* Inner scrolling container — CSS columns lay out here */}
        <div ref={innerRef} className={innerClassName} style={innerStyle}>
          <div className="epub-content">
            <h1 className="mb-6 break-inside-avoid text-4xl font-black">
              {chapterTitle}
            </h1>
            {/* eslint-disable-next-line react/no-danger */}
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </div>
        </div>

        {/* Hover-reveal page turn buttons */}
        <PageTurnButton
          direction="prev"
          onClick={goToPrevPage}
          disabled={!canGoPrev}
        />
        <PageTurnButton
          direction="next"
          onClick={goToNextPage}
          disabled={!canGoNext}
        />
      </div>
    );
  }
);

ReaderContentPaged.displayName = "ReaderContentPaged";
export default ReaderContentPaged;
