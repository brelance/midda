import React from "react";
import { TokenData } from "../../types/types";
import AnalysisSentence from "./SentenceAnalyzer";

const EMPTY_ANALYZED_TOKENS: TokenData[] = [];

interface SubtitleLineProps {
  text: string;
  bookId: string;
  analyzedTokens?: TokenData[];
  openAnalysis: boolean;
}

const AnalysisLine: React.FC<SubtitleLineProps> = ({
  text,
  bookId,
  analyzedTokens,
  openAnalysis,
}) => {
  return (
    <div>
      {openAnalysis ? (
        <AnalysisSentence
          text={text}
          bookId={bookId}
          analyzedTokens={analyzedTokens || EMPTY_ANALYZED_TOKENS}
        />
      ) : (
        text
      )}
    </div>
  );
};

// 使用 React.memo 包裹组件，它会对 props 进行浅比较
export default React.memo(AnalysisLine);
