import React, { useEffect, useMemo, useRef } from "react";
import { Chapter } from "../../types/types";

interface ReaderTocSidebarProps {
  chapters: Chapter[];
  currentChapterId: string;
  isOpen: boolean;
  onChapterSelect: (chapterId: string) => void;
  onClose: () => void;
}

const ReaderTocSidebar: React.FC<ReaderTocSidebarProps> = ({
  chapters,
  currentChapterId,
  isOpen,
  onChapterSelect,
  onClose,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const chapterItems = useMemo(() => {
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return [];
    }
    return chapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title || `章节 ${index + 1}`,
    }));
  }, [chapters]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timeout = window.setTimeout(() => {
      sidebarRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  // Auto-scroll to the active chapter when sidebar opens
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (isOpen && activeRef.current) {
      const timeout = window.setTimeout(() => {
        activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 200);
      return () => window.clearTimeout(timeout);
    }
  }, [isOpen, currentChapterId]);

  const overlayClasses = isOpen
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const sidebarClasses = isOpen ? "translate-x-0" : "-translate-x-full";

  const ariaHidden = isOpen ? undefined : true;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-250 ${overlayClasses}`}
        aria-hidden={ariaHidden}
        onClick={onClose}
      />
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        tabIndex={-1}
        className={`
          fixed inset-y-0 left-0 z-[70]
          flex w-[min(88vw,340px)] flex-col
          bg-[#f9f9f9]/95 backdrop-blur-xl
          border-r border-gray-200/60
          shadow-xl shadow-black/8
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          focus:outline-none
          ${sidebarClasses}
        `}
        aria-hidden={ariaHidden}
        aria-label="章节目录"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 pt-14 pb-3">
          <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">目录</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭目录"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-gray-500 transition-colors hover:bg-black/[0.1] hover:text-gray-700 active:scale-95"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Separator */}
        <div className="mx-5 h-px bg-gray-200/80" />

        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {chapterItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-[15px] text-gray-400">
              暂无章节信息
            </div>
          ) : (
            <nav className="py-2">
              <ul>
                {chapterItems.map((item) => {
                  const isActive = item.id === currentChapterId;
                  return (
                    <li
                      key={item.id}
                      ref={isActive ? activeRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => onChapterSelect(item.id)}
                        className={`
                          flex w-full items-center px-5 py-3 text-left text-[15px]
                          transition-colors duration-100
                          ${isActive
                            ? "bg-[#007aff]/10 text-[#007aff] font-semibold"
                            : "text-[#1d1d1f] hover:bg-black/[0.04] active:bg-black/[0.08]"
                          }
                        `}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {isActive && (
                          <span className="mr-2.5 h-5 w-0.5 flex-shrink-0 rounded-full bg-[#007aff]" />
                        )}
                        <span className="break-words leading-snug">
                          {item.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </aside>
    </>
  );
};

export default ReaderTocSidebar;
