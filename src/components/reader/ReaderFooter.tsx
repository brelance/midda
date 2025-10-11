import React from "react";
import BrutalistButton from "../ui/BrutalistButton";
import ReaderProgress from "./ReaderProgress";

interface ReaderFooterProps {
  isVisible: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  disablePrev: boolean;
  disableNext: boolean;
  progress: number;
}

const baseClasses =
  "fixed bottom-0 left-0 right-0 z-50 border-t-4 border-[#3d2b1f] bg-[#f5f5dc]/75 backdrop-blur-md";

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
      className={`${baseClasses} transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ boxShadow: "0 -6px 0 0 #3d2b1f" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <BrutalistButton
          onClick={onPrevChapter}
          disabled={disablePrev}
          className="flex items-center gap-2 px-4 py-2 text-base sm:text-lg"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 18l-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">上一章</span>
        </BrutalistButton>

        <ReaderProgress progress={progress} className="flex-grow" />

        <BrutalistButton
          onClick={onNextChapter}
          disabled={disableNext}
          className="flex items-center gap-2 px-4 py-2 text-base sm:text-lg"
        >
          <span className="hidden sm:inline">下一章</span>
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 6l6 6-6 6" />
          </svg>
        </BrutalistButton>
      </div>
    </footer>
  );
};

export default ReaderFooter;
