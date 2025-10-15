import React from "react";
import BrutalistButton from "../ui/BrutalistButton";
import ReaderBookInfo from "./ReaderBookInfo";
import { ReadingMode, ReaderViewMode } from "../../types/reader";

interface ReaderHeaderProps {
  bookTitle: string;
  chapterTitle?: string;
  isVisible: boolean;
  onBack: () => void;
  onOpenToc?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onToggleReadingMode: () => void;
  readingMode: ReadingMode;
  viewMode: ReaderViewMode;
  onEnterAnalysisMode: () => void;
  onExitAnalysisMode: () => void;
  onToggleSentenceAnalysisRunning?: () => void;
  isSentenceAnalysisRunning?: boolean;
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
  onToggleReadingMode,
  readingMode,
  viewMode,
  onEnterAnalysisMode,
  onExitAnalysisMode,
  onToggleSentenceAnalysisRunning,
  isSentenceAnalysisRunning = false,
}) => {
  const isAnalysisMode = viewMode === "analysis";
  const [isAnalysisPlaybackActive, setIsAnalysisPlaybackActive] =
    React.useState(false);

  React.useEffect(() => {
    if (!isAnalysisMode) {
      setIsAnalysisPlaybackActive(false);
    }
  }, [isAnalysisMode]);

  const handleToggleAnalysisPlayback = () => {
    setIsAnalysisPlaybackActive((prev) => !prev);
  };

  const renderModeToggleButton = () => (
    <BrutalistButton
      onClick={isAnalysisMode ? onExitAnalysisMode : onEnterAnalysisMode}
      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2"
      aria-label={isAnalysisMode ? "切换到阅读模式" : "切换到分析模式"}
    >
      <svg
        className="h-5 w-5 sm:h-6 sm:w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M12 5v14" />
      </svg>
      <span className="hidden sm:inline">
        {isAnalysisMode ? "阅读模式" : "分析模式"}
      </span>
    </BrutalistButton>
  );

  const renderReadingControls = () => (
    <>
      {renderModeToggleButton()}

      <BrutalistButton
        onClick={onToggleReadingMode}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2"
        aria-label={
          readingMode === "single" ? "切换到双页模式" : "切换到单页模式"
        }
      >
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {readingMode === "single" ? (
            <>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </>
          ) : (
            <>
              <path d="M5 5h6a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V5z" />
              <path d="M13 7a2 2 0 0 1 2-2h4v12a2 2 0 0 1-2 2h-4V7z" />
              <line x1="7" y1="9" x2="11" y2="9" />
              <line x1="15" y1="9" x2="19" y2="9" />
            </>
          )}
        </svg>
        <span className="hidden sm:inline">
          {readingMode === "single" ? "双页模式" : "单页模式"}
        </span>
      </BrutalistButton>

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
    </>
  );

  const renderAnalysisControls = () => (
    <>
      {renderModeToggleButton()}

      <BrutalistButton
        onClick={onToggleSentenceAnalysisRunning}
        className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 ${
          isSentenceAnalysisRunning ? "border-4 border-[#007AFF]" : ""
        }`}
        disabled={!onToggleSentenceAnalysisRunning}
        aria-label={
          isSentenceAnalysisRunning ? "停止句子分析" : "开始句子分析"
        }
        aria-pressed={isSentenceAnalysisRunning}
        title="逐句分析当前章节"
      >
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 19h16" />
          <rect x="4" y="4" width="16" height="12" rx="2" />
          <path d="M8 8h4" />
          <path d="M8 12h8" />
        </svg>
        <span className="hidden sm:inline">
          {isSentenceAnalysisRunning ? "停止分析" : "开始分析"}
        </span>
      </BrutalistButton>

      <BrutalistButton
        onClick={handleToggleAnalysisPlayback}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2"
        aria-label={
          isAnalysisPlaybackActive ? "暂停句子分析" : "播放句子分析"
        }
        aria-pressed={isAnalysisPlaybackActive}
        title={isAnalysisPlaybackActive ? "暂停句子分析" : "播放句子分析"}
      >
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          {isAnalysisPlaybackActive ? (
            <>
              <line x1="10" y1="9" x2="10" y2="15" />
              <line x1="14" y1="9" x2="14" y2="15" />
            </>
          ) : (
            <path d="M10 9l5 3-5 3z" />
          )}
        </svg>
        <span className="hidden sm:inline">
          {isAnalysisPlaybackActive ? "暂停" : "播放"}
        </span>
      </BrutalistButton>

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
    </>
  );

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
          {isAnalysisMode ? renderAnalysisControls() : renderReadingControls()}
        </div>
      </div>
    </header>
  );
};

export default ReaderHeader;
