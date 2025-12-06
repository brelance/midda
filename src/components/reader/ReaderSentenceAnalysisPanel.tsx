import React, { forwardRef } from "react";
import SentenceAnalyzer from "../sentenceAnalyzer/SentenceAnalyzer";
import type { TokenData } from "../../types/types";

export type ReaderSentenceAnalysisStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "error";

export interface ReaderSentenceAnalysisItem {
  id: string;
  text: string;
  chapterId: string;
  paragraphIndex: number;
  sentenceIndex: number;
  status: ReaderSentenceAnalysisStatus;
  tokens?: TokenData[];
  error?: string;
}

interface ReaderSentenceAnalysisPanelProps {
  sentences: ReaderSentenceAnalysisItem[];
  bookId: string;
  chapterId?: string;
  chapterTitle?: string;
  onRetry: (sentenceId: string) => void;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  activeSentenceId?: string | null;
  onSentenceSelect?: (sentenceId: string) => void;
}

const ReaderSentenceAnalysisPanel = forwardRef<
  HTMLDivElement,
  ReaderSentenceAnalysisPanelProps
>(
  (
    {
      sentences,
      bookId,
      chapterId,
      chapterTitle,
      onRetry,
      onScroll,
      activeSentenceId,
      onSentenceSelect,
    },
    ref
  ) => {
  const hasSentences = sentences.length > 0;

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="reading-content no-scrollbar mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6 text-lg leading-8 text-[#3d2b1f] md:px-8 md:py-10 md:text-xl"
    >
      <h1 className="mb-6 text-3xl font-extrabold tracking-wide md:text-4xl">
        {chapterTitle ?? (chapterId ? "章节句子分析" : "句子分析")}
      </h1>
      {!hasSentences ? (
        <div className="rounded-lg border border-dashed border-[#d8cfc4] bg-[#fdf8f2] p-6 text-center text-base text-[#6b5b4b]">
          当前章节暂无可分析的句子。
        </div>
      ) : (
        <div className="space-y-4">
          {sentences.map((item) => (
            <div key={item.id} className="sentence-block">
              <button
                type="button"
                disabled={!onSentenceSelect}
                aria-pressed={item.id === activeSentenceId}
                onClick={
                  onSentenceSelect ? () => onSentenceSelect(item.id) : undefined
                }
                className={`w-full rounded-xl border border-transparent px-3 py-2 text-left text-base leading-snug transition sm:text-lg ${
                  item.id === activeSentenceId
                    ? "border-[#15803d] bg-[#d1fadf] text-[#14532d]"
                    : "text-[#1f2a44]"
                } ${
                  onSentenceSelect
                    ? "hover:bg-[#d1fadf]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0fdf4]"
                    : ""
                } ${!onSentenceSelect ? "cursor-default" : ""}`}
              >
                {item.text}
              </button>
              {item.status === "loading" && (
                <div className="mt-2 flex items-center gap-3 rounded-md border border-dashed border-[#a7d3ae] bg-[#f0fdf4]/80 px-3 py-2 text-xs text-[#1f2a44] sm:text-sm">
                  <div className="loading-spinner h-5 w-5 border-[3px] border-[#a7d3ae] border-t-[#15803d]" />
                  正在分析中...
                </div>
              )}

              {item.status === "error" && (
                <div className="mt-2 rounded-md border border-[#f4d4d1] bg-[#fdf0ef] p-3 text-xs text-[#b3312c] sm:text-sm shadow-inner">
                  <p className="mb-1 text-sm font-semibold text-[#3d2b1f] sm:text-base">
                    分析失败
                  </p>
                  <p className="mb-3 leading-relaxed text-[#6b5b4b]">
                    {item.error ?? "请稍后重试。"}
                  </p>
                  <button
                    className="inline-flex items-center rounded bg-[#3d2b1f] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#2c1e14] sm:text-sm"
                    onClick={() => onRetry(item.id)}
                  >
                    重新分析
                  </button>
                </div>
              )}

              {item.status === "loaded" &&
                item.tokens &&
                item.tokens.length > 0 && (
                  <div className="mt-2">
                    <SentenceAnalyzer
                      text={item.text}
                      bookId={bookId}
                      analyzedTokens={item.tokens}
                    />
                  </div>
                )}

              {item.status === "loaded" &&
                (!item.tokens || item.tokens.length === 0) && (
                  <div className="mt-2 rounded-md border border-[#f3e2b6] bg-[#fff9e6] p-2 text-xs text-[#6b5b4b] sm:text-sm shadow-inner">
                    分析已完成，但未获取到有效的分词结果。
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  }
);

ReaderSentenceAnalysisPanel.displayName = "ReaderSentenceAnalysisPanel";

export default ReaderSentenceAnalysisPanel;
