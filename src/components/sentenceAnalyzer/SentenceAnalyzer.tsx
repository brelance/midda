import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  containsKanji,
  getPosClass,
  posChineseMap,
  speakJapanese,
} from "../../utils/helper";
import { TokenData, WordDetail } from "../../types/types";
import { queuedSendTokensRequest } from "../../services/apiQueue";
import { detectLanguageForSamples } from "../../utils/lang/detectLanguage";
import DraggablePopup from "../DraggablePopup";

interface AnalysisSentenceProps {
  text: string;
  bookId: string;
  analyzedTokens: TokenData[];
  useStream?: boolean;
  enableTokenHoverTts?: boolean;
  ttsLanguage?: string;
}
export default function AnalysisSentence({
  text,
  bookId,
  analyzedTokens = [],
  useStream = false,
  enableTokenHoverTts = false,
  ttsLanguage,
}: AnalysisSentenceProps) {
  // const [currentSentence, setCurrentSentence] = useState('')
  const [tokens, setTokens] = useState<TokenData[]>(analyzedTokens);
  // const [isAnalyzing, setIsAnalyzing] = useState(false)
  // const [analysisError, setAnalysisError] = useState('')
  // const [isJsonParseError, setIsJsonParseError] = useState(false)
  // const [translationTrigger, setTranslationTrigger] = useState(0)
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [activeWordToken, setActiveWordToken] = useState<HTMLElement | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isWordDetailOpen, setIsWordDetailOpen] = useState(false);
  const [hoveredTokenIndices, setHoveredTokenIndices] = useState<number[]>([]);
  const [currentHoveredIndex, setCurrentHoveredIndex] = useState<number | null>(
    null
  );
  const hoverSpeakTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setTokens(analyzedTokens);
  }, [analyzedTokens]);

  useEffect(() => {
    if (enableTokenHoverTts) {
      return;
    }
    setHoveredTokenIndices([]);
    setCurrentHoveredIndex(null);
  }, [enableTokenHoverTts]);

  useEffect(() => {
    return () => {
      if (hoverSpeakTimerRef.current !== null) {
        window.clearTimeout(hoverSpeakTimerRef.current);
      }
    };
  }, []);

  const originalSentence = text;

  useEffect(() => {
    const fetchData = async () => {
      // 如果 props 中已有 tokens，直接使用它们并返回
      if (analyzedTokens.length > 0) {
        setTokens(analyzedTokens);
        return;
      }
      // 如果当前 state 中已有 tokens（例如，通过之前的请求加载的），也直接返回
      if (tokens.length > 0) {
        return;
      }

        setIsLoading(true);
      try {
        const detected = detectLanguageForSamples([originalSentence]);
        // 使用新的、经过队列处理的请求函数，并等待其结果
        const receivedTokens = await queuedSendTokensRequest(
          originalSentence,
          { language: detected.languageCode }
        ); // 确保 useStream 不是 undefined
        // 更新组件状态
        setTokens(receivedTokens);

        console.log("[SentenceAnalyzer]: " + receivedTokens);
      } catch (error) {
        console.error(
          `LLM API Error for sentence "${originalSentence}":`,
          error
        );
        // 可以在这里设置一个错误状态，以便在 UI 上向用户显示错误信息
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // 依赖项数组应包含 effect 中使用的所有外部变量
    // 添加 `tokens` 是为了防止在某些边缘情况下（例如 props 改变为空数组）发生不必要的重发请求
  }, [originalSentence, bookId, analyzedTokens, useStream]);

  const handleWordClick = async (
    e: React.MouseEvent<HTMLSpanElement>,
    token: TokenData
  ) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;

    // 如果点击的是当前活动词，切换关闭
    if (activeWordToken === target) {
      setActiveWordToken(null);
      setWordDetail(null);
      setIsWordDetailOpen(false);
      return;
    }

    // 设置新活动词
    if (activeWordToken) {
      activeWordToken.classList.remove("active-word");
    }
    target.classList.add("active-word");
    setActiveWordToken(target);

    // 如果是移动端，先打开模态窗口，显示加载动画
    setIsWordDetailOpen(true);
    await fetchWordDetails(
      token.word,
      token.pos,
      originalSentence,
      token.furigana,
      token.romaji
    );
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const target = e.currentTarget;
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleMouseLeave = () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
  };

  const fetchWordDetails = useCallback(
    async (
      word: string,
      pos: string,
      sentence: string,
      furigana?: string,
      romaji?: string
    ) => {
      setIsLoading(true);

      try {
        const details = await window.api.wordDetail.sendWordDetailRequest(
          word,
          pos,
          sentence,
          furigana || "",
          romaji || ""
        );
        setWordDetail(details);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error("Error fetching word details:", message);
        setWordDetail({
          originalWord: word,
          pos: pos,
          furigana:
            furigana && furigana !== word && containsKanji(word)
              ? furigana
              : "",
          romaji: romaji || "",
          dictionaryForm: "",
          chineseTranslation: "错误",
          explanation: `查询释义时发生错误: ${message}。`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleCloseWordDetail = useCallback(() => {
    if (activeWordToken) {
      activeWordToken.classList.remove("active-word");
      setActiveWordToken(null);
    }
    setWordDetail(null);
    setIsWordDetailOpen(false);
  }, [activeWordToken]);

  const speakTokenText = useCallback(
    (tokenText: string) => {
      const textToSpeak = tokenText.trim();
      if (!textToSpeak) {
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (ttsLanguage && ttsLanguage !== "system") {
        utterance.lang = ttsLanguage;
      }
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [ttsLanguage]
  );

  const handleTokenMouseEnter = useCallback(
    (index: number, token: TokenData) => {
      if (!enableTokenHoverTts) {
        return;
      }

      setHoveredTokenIndices((previous) => {
        if (previous.length === 0) {
          return [index];
        }
        const lastIndex = previous[previous.length - 1];
        if (index === lastIndex) {
          return previous;
        }
        if (index === lastIndex + 1) {
          return [...previous, index];
        }
        return [index];
      });
      setCurrentHoveredIndex(index);

      if (hoverSpeakTimerRef.current !== null) {
        window.clearTimeout(hoverSpeakTimerRef.current);
      }
      hoverSpeakTimerRef.current = window.setTimeout(() => {
        speakTokenText(token.word);
      }, 60);
    },
    [enableTokenHoverTts, speakTokenText]
  );

  const handleSentenceMouseLeave = useCallback(() => {
    if (hoverSpeakTimerRef.current !== null) {
      window.clearTimeout(hoverSpeakTimerRef.current);
      hoverSpeakTimerRef.current = null;
    }
    setHoveredTokenIndices([]);
    setCurrentHoveredIndex(null);
  }, []);

  const hoveredIndexSet = useMemo(
    () => new Set(hoveredTokenIndices),
    [hoveredTokenIndices]
  );

  // 朗读单词的函数
  const handleWordSpeak = async (word: string) => {
    try {
      // 词汇详解中统一使用系统TTS，速度更快
      speakJapanese(word);
    } catch (error) {
      console.error("朗读失败:", error);
    }
  };

  // 词语详情内容组件
  const WordDetailContent = () => (
    <>
      <h3 className="text-xl font-semibold text-[#007AFF] mb-3">词汇详解</h3>
      <p className="mb-1">
        <strong>原文:</strong>
        <span className="font-mono text-lg text-gray-800">
          {wordDetail?.originalWord}
        </span>
        <button
          className="read-aloud-button"
          title="朗读此词汇"
          onClick={() => handleWordSpeak(wordDetail?.originalWord || "")}
        >
          {/* <FaVolumeUp /> */}
        </button>
      </p>

      {wordDetail?.furigana && (
        <p className="mb-1">
          <strong>读音 (Furigana):</strong>
          <span className="text-sm text-purple-700">{wordDetail.furigana}</span>
        </p>
      )}

      {wordDetail?.romaji && (
        <p className="mb-1">
          <strong>罗马音 (Romaji):</strong>
          <span className="text-sm text-cyan-700">{wordDetail.romaji}</span>
        </p>
      )}

      {wordDetail?.dictionaryForm &&
        wordDetail.dictionaryForm !== wordDetail.originalWord && (
          <p className="mb-2">
            <strong>辞书形:</strong>
            <span className="text-md text-blue-700 font-medium">
              {wordDetail.dictionaryForm}
            </span>
          </p>
        )}

      <p className="mb-2">
        <strong>词性:</strong>
        <span
          className={`detail-pos-tag ${getPosClass(wordDetail?.pos || "")}`}
        >
          {wordDetail?.pos} (
          {posChineseMap[wordDetail?.pos.split("-")[0] || ""] ||
            posChineseMap["default"]}
          )
        </span>
      </p>

      <p className="mb-2">
        <strong>中文译文:</strong>
        <span className="text-lg text-green-700 font-medium">
          {wordDetail?.chineseTranslation}
        </span>
      </p>

      <div className="mb-1">
        <strong>解释:</strong>
      </div>
      <p className="text-gray-700 bg-gray-50 p-3 rounded-md text-base leading-relaxed">
        {wordDetail?.explanation}
      </p>
    </>
  );

  if (!tokens || tokens.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        id="analyzedSentenceOutput"
        className="text-gray-800 mb-2 p-3 min-h-[70px]"
        onMouseLeave={handleSentenceMouseLeave}
      >
        {tokens.map((token, index) => {
          const isHoveredSpoken = hoveredIndexSet.has(index);
          const isCurrent = currentHoveredIndex === index;
          return (
          <span
            key={index}
            className="word-unit-wrapper tooltip"
            onClick={(e) => handleWordClick(e, token)}
            onMouseEnter={() => handleTokenMouseEnter(index, token)}
          >
            <span
              className={`word-token ${getPosClass(token.pos)}${
                isHoveredSpoken ? " hover-tts-spoken" : ""
              }${isCurrent ? " hover-tts-current" : ""}`}
            >
              <span className="ruby-container">
                <span
                  className="ruby-base"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {token.word}
                </span>
                {token.furigana &&
                  token.furigana !== token.word &&
                  containsKanji(token.word) &&
                  token.pos !== "記号" && (
                    <span className="ruby-text">{token.furigana}</span>
                  )}
              </span>
              {token.romaji && token.pos !== "記号" && (
                <span className="romaji-text">{token.romaji}</span>
              )}
            </span>

            <span className="tooltiptext">
              {posChineseMap[token.pos.split("-")[0]] ||
                posChineseMap["default"]}
            </span>
          </span>
          );
        })}
      </div>

      {isWordDetailOpen && (
        <DraggablePopup
          isOpen={isWordDetailOpen}
          onClose={handleCloseWordDetail}
          title="词汇详解"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-5">
              <div className="loading-spinner"></div>
              <span className="ml-2 text-gray-600">正在查询释义...</span>
            </div>
          ) : (
            wordDetail && <WordDetailContent />
          )}
        </DraggablePopup>
      )}
    </div>
  );
}
