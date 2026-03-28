/**
 * ImageThumbnailSidebar — Preview.app-style thumbnail navigation panel.
 *
 * Shows lazy-loaded page thumbnails in a left sidebar. Current page is
 * highlighted with a blue border. Clicking a thumbnail jumps to that page.
 *
 * Uses the same light frosted-glass design language as ReaderTocSidebar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ImageThumbnailSidebarProps {
  isOpen: boolean;
  currentPage: number;
  totalPages: number;
  onPageSelect: (page: number) => void;
  onClose: () => void;
  /** Load a page thumbnail. Returns a dataUrl or null. */
  loadThumbnail: (page: number) => Promise<string | null>;
}

const THUMB_WIDTH = 140;

const ImageThumbnailSidebar: React.FC<ImageThumbnailSidebarProps> = ({
  isOpen,
  currentPage,
  totalPages,
  onPageSelect,
  onClose,
  loadThumbnail,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const thumbRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const requestedPagesRef = useRef<Set<number>>(new Set());

  // ── Lazy-load thumbnails via IntersectionObserver ───────────────────
  useEffect(() => {
    if (!isOpen) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (isNaN(page) || requestedPagesRef.current.has(page)) return;

          requestedPagesRef.current.add(page);
          loadThumbnail(page).then((url) => {
            if (url) {
              setThumbnails((prev) => new Map(prev).set(page, url));
            }
          });
        });
      },
      { root: scrollRef.current, rootMargin: "200px 0px" }
    );

    // Observe all placeholder elements
    thumbRefsMap.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [isOpen, loadThumbnail]);

  // ── Scroll to current page when sidebar opens ──────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const currentEl = thumbRefsMap.current.get(currentPage);
    if (currentEl) {
      currentEl.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [isOpen, currentPage]);

  // ── Register ref for a thumbnail slot ──────────────────────────────
  const setThumbRef = useCallback(
    (page: number) => (el: HTMLDivElement | null) => {
      if (el) {
        thumbRefsMap.current.set(page, el);
        observerRef.current?.observe(el);
      } else {
        thumbRefsMap.current.delete(page);
      }
    },
    []
  );

  // ── Keyboard: Escape to close ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);

  // Generate page numbers
  const pages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

  return (
    <div
      className={`
        absolute top-0 left-0 bottom-0 z-40
        w-[200px] flex flex-col
        bg-[#f9f9f9]/95 backdrop-blur-xl
        border-r border-gray-200/60
        shadow-xl shadow-black/8
        transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-14 pb-3 border-b border-gray-200/80 flex-shrink-0">
        <span className="text-[#1d1d1f] text-sm font-semibold tracking-tight">缩略图</span>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] text-gray-500 transition-colors hover:bg-black/[0.1] hover:text-gray-700 active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Thumbnail list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
        {pages.map((page) => {
          const isActive = page === currentPage;
          const thumbUrl = thumbnails.get(page);

          return (
            <div
              key={page}
              ref={setThumbRef(page)}
              data-page={page}
              className={`
                cursor-pointer rounded-md overflow-hidden transition-all duration-150
                ${isActive
                  ? "ring-2 ring-[#007aff] ring-offset-1 ring-offset-white"
                  : "hover:ring-1 hover:ring-gray-300"
                }
              `}
              onClick={() => onPageSelect(page)}
            >
              {/* Thumbnail image or placeholder */}
              <div
                className="bg-gray-100 flex items-center justify-center"
                style={{ width: THUMB_WIDTH, aspectRatio: "3/4" }}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Page ${page}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="flex items-center justify-center text-gray-400 text-xs">
                    {page}
                  </div>
                )}
              </div>

              {/* Page number label */}
              <div className={`text-center py-1 text-[10px] tabular-nums ${
                isActive ? "text-[#007aff] font-medium" : "text-gray-500"
              }`}>
                {page}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageThumbnailSidebar;
