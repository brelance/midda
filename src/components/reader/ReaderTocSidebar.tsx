import React, { useEffect, useMemo, useRef } from "react";
import BrutalistButton from "../ui/BrutalistButton";
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

  const overlayClasses = isOpen
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const sidebarClasses = isOpen ? "translate-x-0" : "-translate-x-full";

  const ariaHidden = isOpen ? undefined : true;

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 ${overlayClasses}`}
        aria-hidden={ariaHidden}
        onClick={onClose}
      />
      <aside
        ref={sidebarRef}
        tabIndex={-1}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(92vw,360px)] max-w-sm flex-col border-r-4 border-[#3d2b1f] bg-[#f5f5dc] shadow-[6px_0px_0px_0px_rgba(61,43,31,1)] transition-transform duration-200 focus:outline-none ${sidebarClasses}`}
        aria-hidden={ariaHidden}
        aria-label="章节目录"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b-4 border-[#3d2b1f] px-5 py-4">
          <h2 className="text-2xl font-black text-[#3d2b1f]">目录</h2>
          <BrutalistButton
            onClick={onClose}
            className="p-2 text-base sm:text-lg"
            aria-label="关闭目录"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </BrutalistButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chapterItems.length === 0 ? (
            <div className="px-5 py-6 text-base font-semibold text-[#3d2b1f]">
              暂无章节信息
            </div>
          ) : (
            <nav className="flex-1">
              <ul>
                {chapterItems.map((item) => {
                  const isActive = item.id === currentChapterId;
                  return (
                    <li key={item.id} className="border-b-4 border-[#3d2b1f]">
                      <button
                        type="button"
                        onClick={() => onChapterSelect(item.id)}
                        className={`flex w-full items-center px-5 py-4 text-left text-lg font-bold transition-colors ${
                          isActive
                            ? "bg-[#b3312c] text-white"
                            : "bg-[#f5f5dc] text-[#3d2b1f] hover:bg-[#d4a017] hover:text-white"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="block break-words leading-tight">
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
