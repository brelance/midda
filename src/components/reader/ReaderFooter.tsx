import React from "react";
import ReaderProgress from "./ReaderProgress";

interface ReaderFooterProps {
  isVisible: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  disablePrev: boolean;
  disableNext: boolean;
  progress: number;
}

const ReaderFooter: React.FC<ReaderFooterProps> = ({
  isVisible,
  onPrevChapter,
  onNextChapter,
  disablePrev,
  disableNext,
  progress,
}) => {
  return (
    <footer
      className={`
        fixed bottom-0 left-0 right-0 z-50
        border-t border-gray-200/80
        bg-[#fdfdfd]/90 backdrop-blur-md
        transition-transform duration-300 ease-in-out
        ${isVisible ? "translate-y-0" : "translate-y-full"}
      `}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-3 max-w-6xl mx-auto">
        <button
          onClick={onPrevChapter}
          disabled={disablePrev}
          className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-[#1d1d1f] disabled:opacity-30 transition-colors select-none"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 18l-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">上一章</span>
        </button>

        <ReaderProgress progress={progress} className="flex-grow" />

        <button
          onClick={onNextChapter}
          disabled={disableNext}
          className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-[#1d1d1f] disabled:opacity-30 transition-colors select-none"
        >
          <span className="hidden sm:inline">下一章</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </footer>
  );
};

export default ReaderFooter;
