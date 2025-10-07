import React from "react";
import { SubtitleLineData, CueNode, TokenData } from "../../types/types";
import AnalysisSentence from "./SentenceAnalyzer";

const EMPTY_ANALYZED_TOKENS: TokenData[] = [];

interface SubtitleLineProps {
  cue: CueNode;
  videoId: string;
  subtitleLineData: SubtitleLineData | undefined;
  openAnalysis: boolean;
}

const AnalysisLine: React.FC<SubtitleLineProps> = ({
  cue,
  videoId,
  subtitleLineData,
  openAnalysis,
}) => {
  return (
    <div>
      {openAnalysis ? (
        <AnalysisSentence
          subtitle={cue}
          videoId={videoId}
          analyzedTokens={subtitleLineData?.tokens || EMPTY_ANALYZED_TOKENS}
        />
      ) : (
        cue.data.text
      )}
    </div>
  );
};

// 使用 React.memo 包裹组件，它会对 props 进行浅比较
export default React.memo(AnalysisLine);
