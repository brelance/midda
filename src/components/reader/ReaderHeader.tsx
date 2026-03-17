import React from "react";
import ReaderBookInfo from "./ReaderBookInfo";
import { ReaderViewMode } from "../../types/reader";
import type { TtsPlaybackStatus } from "../../types/tts";

interface ReaderHeaderProps {
  bookTitle: string;
  chapterTitle?: string;
  isVisible: boolean;
  onBack: () => void;
  onOpenToc?: () => void;
  onOpenChat?: () => void;
  onOpenSettings?: () => void;
  viewMode: ReaderViewMode;
  onEnterAnalysisMode: () => void;
  onExitAnalysisMode: () => void;
  onShowExistingAnalysis?: () => void;
  isShowingExistingAnalysis?: boolean;
  onToggleSentenceAnalysisRunning?: () => void;
  isSentenceAnalysisRunning?: boolean;
  onToggleAnalysisPlayback?: () => void;
  analysisPlaybackStatus?: TtsPlaybackStatus;
  isAnalysisPlaybackDisabled?: boolean;
}

/** Small toolbar icon-button */
const IconBtn: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
  children: React.ReactNode;
  text?: string;
}> = ({ onClick, disabled, label, active, children, text }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={active}
    className={`
      flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium select-none
      transition-colors duration-100
      ${active
        ? "bg-[#007aff]/10 text-[#007aff]"
        : "text-gray-600 hover:bg-black/[0.05] hover:text-[#1d1d1f]"}
      ${disabled ? "opacity-40 pointer-events-none" : ""}
    `}
  >
    {children}
    {text && <span className="hidden sm:inline">{text}</span>}
  </button>
);

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  bookTitle,
  chapterTitle,
  isVisible,
  onBack,
  onOpenToc,
  onOpenChat,
  onOpenSettings,
  viewMode,
  onEnterAnalysisMode,
  onExitAnalysisMode,
  onShowExistingAnalysis,
  isShowingExistingAnalysis = false,
  onToggleSentenceAnalysisRunning,
  isSentenceAnalysisRunning = false,
  onToggleAnalysisPlayback,
  analysisPlaybackStatus = "idle",
  isAnalysisPlaybackDisabled = false,
}) => {
  const isAnalysisMode = viewMode === "analysis";
  const isAnalysisPlaybackActive = analysisPlaybackStatus === "playing";

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        border-b border-gray-200/80
        bg-[#fdfdfd]/90 backdrop-blur-md
        transition-transform duration-300 ease-in-out
        ${isVisible ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <div className="flex items-center justify-between px-4 py-2 max-w-6xl mx-auto">
        {/* Left controls */}
        <div className="flex items-center gap-1">
          <IconBtn onClick={onBack} label="返回书架">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline text-[13px]">返回</span>
          </IconBtn>

          <IconBtn onClick={onOpenToc} disabled={!onOpenToc} label="目录">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </IconBtn>
        </div>

        {/* Center: book info */}
        <ReaderBookInfo bookTitle={bookTitle} chapterTitle={chapterTitle} />

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Mode toggle */}
          <IconBtn
            onClick={isAnalysisMode ? onExitAnalysisMode : onEnterAnalysisMode}
            label={isAnalysisMode ? "阅读模式" : "分析模式"}
            text={isAnalysisMode ? "阅读" : "分析"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {isAnalysisMode ? (
                <path d="M15 18l-6-6 6-6" />
              ) : (
                <>
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M12 5v14" />
                </>
              )}
            </svg>
          </IconBtn>

          {/* Analysis-mode extra controls */}
          {isAnalysisMode && (
            <>
              <IconBtn
                onClick={onShowExistingAnalysis}
                disabled={!onShowExistingAnalysis}
                label={isShowingExistingAnalysis ? "隐藏分析" : "显示分析"}
                active={isShowingExistingAnalysis}
                text={isShowingExistingAnalysis ? "隐藏" : "显示"}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </IconBtn>

              <IconBtn
                onClick={onToggleSentenceAnalysisRunning}
                disabled={!onToggleSentenceAnalysisRunning}
                label={isSentenceAnalysisRunning ? "停止分析" : "开始分析"}
                active={isSentenceAnalysisRunning}
                text={isSentenceAnalysisRunning ? "停止" : "分析"}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19h16" />
                  <rect x="4" y="4" width="16" height="12" rx="2" />
                </svg>
              </IconBtn>

              <IconBtn
                onClick={onToggleAnalysisPlayback}
                disabled={!onToggleAnalysisPlayback || isAnalysisPlaybackDisabled}
                label={isAnalysisPlaybackActive ? "暂停" : "播放"}
                active={isAnalysisPlaybackActive}
                text={isAnalysisPlaybackActive ? "暂停" : analysisPlaybackStatus === "paused" ? "继续" : "播放"}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
              </IconBtn>
            </>
          )}

          <IconBtn onClick={onOpenChat} disabled={!onOpenChat} label="聊天" text="聊天">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </IconBtn>

          <IconBtn onClick={onOpenSettings} disabled={!onOpenSettings} label="设置">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.325 4.317c.426-1.756 3.324-1.756 3.75 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 3.324 0 3.75a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-3.324 1.756-3.75 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-3.324 0-3.75a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </IconBtn>
        </div>
      </div>
    </header>
  );
};

export default ReaderHeader;
