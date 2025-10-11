import React from "react";
import BrutalistButton from "../ui/BrutalistButton";
import ReaderBookInfo from "./ReaderBookInfo";

interface ReaderHeaderProps {
  bookTitle: string;
  chapterTitle?: string;
  isVisible: boolean;
  onBack: () => void;
  onOpenToc?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
}

const baseClasses =
  "fixed top-0 left-0 right-0 z-50 border-b-4 border-[#3d2b1f] bg-[#f5f5dc]/75 backdrop-blur-md";

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  bookTitle,
  chapterTitle,
  isVisible,
  onBack,
  onOpenToc,
  onOpenSearch,
  onOpenSettings,
}) => {
  return (
    <header
      className={`${baseClasses} transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ boxShadow: "0 6px 0 0 #3d2b1f" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <BrutalistButton
            variant="primary"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-base sm:text-lg"
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">返回书架</span>
          </BrutalistButton>

          <BrutalistButton
            onClick={onOpenToc}
            className="flex items-center gap-2 px-4 py-2 text-base sm:text-lg"
            disabled={!onOpenToc}
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">目录</span>
          </BrutalistButton>
        </div>

        <ReaderBookInfo bookTitle={bookTitle} chapterTitle={chapterTitle} />

        <div className="flex items-center gap-3 sm:gap-4">
          <BrutalistButton
            onClick={onOpenSearch}
            className="flex items-center px-3 py-2 sm:px-4 sm:py-2"
            disabled={!onOpenSearch}
            aria-label="搜索"
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 21l-5.6-5.6" />
              <circle cx="10.5" cy="10.5" r="6.5" />
            </svg>
          </BrutalistButton>
          <BrutalistButton
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2 text-base sm:text-lg"
            disabled={!onOpenSettings}
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.325 4.317c.426-1.756 3.324-1.756 3.75 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 3.324 0 3.75a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-3.324 1.756-3.75 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-3.324 0-3.75a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="hidden sm:inline">显示设置</span>
          </BrutalistButton>
        </div>
      </div>
    </header>
  );
};

export default ReaderHeader;
