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
  onRetry: (sentenceId: string) => void;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

const ReaderSentenceAnalysisPanel = forwardRef<
  HTMLDivElement,
  ReaderSentenceAnalysisPanelProps
>(({ sentences, bookId, chapterId, onRetry, onScroll }, ref) => {
  const hasSentences = sentences.length > 0;

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="reading-content no-scrollbar mx-auto h-full max-w-[780px] overflow-y-auto px-2 text-lg leading-8 text-[#3d2b1f] md:px-4 md:text-xl"
    >
      <h1 className="mb-6 text-4xl font-black">
        {chapterId ? "章节句子分析" : "句子分析"}
      </h1>
      {!hasSentences ? (
        <div className="rounded-lg border-4 border-dashed border-[#3d2b1f]/40 bg-[#fdf8f2] p-6 text-center text-xl font-semibold text-[#3d2b1f]">
          当前章节暂无可分析的句子。
        </div>
      ) : (
        <div className="space-y-6">
          {sentences.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border-4 border-[#3d2b1f]/40 bg-white/90 p-4 shadow-[6px_6px_0_0_#3d2b1f40]"
            >
              <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-semibold text-[#3d2b1f] sm:text-lg">
                  {item.text}
                </p>
                {/* <span className="text-sm text-[#6b5b4b]">
                  句子 {item.sentenceIndex + 1}
                </span> */}
              </header>

              {item.status === "loading" && (
                <div className="flex items-center justify-center py-8 text-[#3d2b1f]">
                  <div className="loading-spinner mr-3" />
                  正在分析中...
                </div>
              )}

              {item.status === "error" && (
                <div className="rounded-md border border-red-400 bg-red-50 p-4 text-sm text-red-700">
                  <p className="mb-3 font-semibold">分析失败</p>
                  <p className="mb-3">{item.error ?? "请稍后重试。"}</p>
                  <button
                    className="rounded bg-[#3d2b1f] px-3 py-1 text-white shadow-md transition hover:bg-[#2c1e14]"
                    onClick={() => onRetry(item.id)}
                  >
                    重新分析
                  </button>
                </div>
              )}

              {item.status === "loaded" &&
                item.tokens &&
                item.tokens.length > 0 && (
                  <SentenceAnalyzer
                    text={item.text}
                    bookId={bookId}
                    analyzedTokens={item.tokens}
                  />
                )}

              {item.status === "loaded" &&
                (!item.tokens || item.tokens.length === 0) && (
                  <div className="rounded-md border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-700">
                    分析已完成，但未获取到有效的分词结果。
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ReaderSentenceAnalysisPanel.displayName = "ReaderSentenceAnalysisPanel";

export default ReaderSentenceAnalysisPanel;
