import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReaderLayout from "../../components/reader/ReaderLayout";
import ReaderHeader from "../../components/reader/ReaderHeader";
import ReaderFooter from "../../components/reader/ReaderFooter";
import ReaderContent from "../../components/reader/ReaderContent";
import ReaderSentenceAnalysisPanel, {
  ReaderSentenceAnalysisItem,
} from "../../components/reader/ReaderSentenceAnalysisPanel";
import ReaderSettingsModal from "../../components/reader/ReaderSettingsModal";
import ReaderTocSidebar from "../../components/reader/ReaderTocSidebar";
import { Book, Chapter, TokenData } from "../../types/types";
import { ReadingMode, ReaderViewMode } from "../../types/reader";
import type {
  TtsPlaybackStatus,
  TtsSentencePayload,
  TtsStateUpdate,
} from "../../types/tts";
import {
  findChapterIndex,
  getNextChapterId,
  getPrevChapterId,
  isFirstChapter,
  isLastChapter,
} from "../../utils/reader/chapterUtils";
import {
  calculateScrollProgress,
  deriveBookProgressFromChapter,
} from "../../utils/reader/progressUtils";
import { useReaderToolbarVisibility } from "../../hooks/useReaderToolbarVisibility";
import { useReaderShortcuts } from "../../hooks/useReaderShortcuts";
import { queuedSendGeminiRequest } from "../../services/apiQueue";
import { getPrompt } from "../../services/analyzeSentence";

interface ReaderPageProps {
  book: Book;
  initialChapterId?: string;
  onExitReader: () => void;
  onOpenToc?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onChapterChange?: (chapterId: string) => void;
  onProgressChange?: (progress: number) => void;
}

const buildFallbackContent = (): string => {
  const paragraphs = [
    "这是一个示例文本，用于展示阅读页面的基础排版效果。你可以在这里阅读书籍内容，工具栏会在靠近屏幕顶部或底部时自动出现。",
    "Tailwind CSS 与昭和复古粗野主义风格结合，带来厚重的边框与醒目的色彩。阅读器后续会接入 EPUB 解析，让章节内容动态渲染。",
    "请使用键盘方向键或底部按钮切换章节，ESC 键可以返回书架。该占位文本稍后会被真实章节内容替换。",
  ];

  return paragraphs.map((text) => `<p>${text}</p>`).join("");
};

interface SentenceSeed {
  id: string;
  text: string;
  chapterId: string;
  paragraphIndex: number;
  sentenceIndex: number;
}

interface AnalysisPlaybackState {
  status: TtsPlaybackStatus;
  currentIndex: number | null;
  currentSentenceId: string | null;
}

const SENTENCE_SPLIT_REGEX = /(?<=[。！？!?\.．])/u;

const PARAGRAPH_TAGS = new Set([
  "p",
  "pre",
  "li",
  "dd",
  "dt",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

const BLOCK_CONTAINER_TAGS = new Set([
  "div",
  "section",
  "article",
  "aside",
  "main",
  "header",
  "footer",
  "nav",
  "blockquote",
  "figure",
  "figcaption",
  "ul",
  "ol",
  "table",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "body",
]);

const OPENING_QUOTE_CHARS = new Set([
  "「",
  "『",
  "“",
  "‘",
  "‹",
  "«",
  "〈",
  "《",
  "｢",
  "（",
  "(",
  "［",
  "【",
  "〔",
]);

const CLOSING_TO_OPENING_QUOTE = new Map<string, string>([
  ["」", "「"],
  ["』", "『"],
  ["”", "“"],
  ["’", "‘"],
  ["›", "‹"],
  ["»", "«"],
  ["〉", "〈"],
  ["》", "《"],
  ["｣", "｢"],
  ["）", "（"],
  [")", "("],
  ["］", "［"],
  ["】", "【"],
  ["〕", "〔"],
]);

const TTS_LANGUAGE_OPTIONS = [
  { value: "system", label: "跟随系统（默认语音）" },
  { value: "ja-JP", label: "日语" },
  { value: "en-US", label: "英语" },
];

const extractSentencesFromHtml = (
  html: string,
  chapterId: string
): SentenceSeed[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  const collapseAsciiWhitespace = (value: string): string =>
    value.replace(/\u00A0/g, " ").replace(/[\t\f\v\r ]+/g, " ");

  const trimAsciiWhitespace = (value: string): string =>
    value.replace(/^[\t\f\v\r \u00A0]+/, "").replace(/[\t\f\v\r \u00A0]+$/, "");

  const normalizeParagraphText = (element: Element): string => {
    const raw = element.textContent ?? "";
    if (!raw) {
      return "";
    }

    const sanitized = raw.replace(/\r\n?/g, "\n");
    const lines = sanitized
      .split("\n")
      .map((line) => trimAsciiWhitespace(collapseAsciiWhitespace(line)))
      .filter(Boolean);

    if (lines.length === 0) {
      return "";
    }

    return lines.join(" ");
  };

  const sentences: SentenceSeed[] = [];
  let paragraphIndex = 0;

  const mergeSegmentsByQuotes = (segments: string[]): string[] => {
    if (segments.length <= 1) {
      return segments;
    }

    const result: string[] = [];
    let pending = "";
    const stack: string[] = [];

    const processChar = (char: string) => {
      if (OPENING_QUOTE_CHARS.has(char)) {
        stack.push(char);
        return;
      }
      const opener = CLOSING_TO_OPENING_QUOTE.get(char);
      if (!opener) {
        return;
      }
      if (stack.length > 0 && stack[stack.length - 1] === opener) {
        stack.pop();
        return;
      }
      const index = stack.lastIndexOf(opener);
      if (index !== -1) {
        stack.splice(index, 1);
      }
    };

    segments.forEach((segment) => {
      pending = pending ? pending + segment : segment;

      for (const char of segment) {
        processChar(char);
      }

      if (stack.length === 0) {
        result.push(pending);
        pending = "";
      }
    });

    if (pending) {
      result.push(pending);
    }

    return result;
  };

  const processParagraph = (text: string) => {
    const rawSegments = text
      .split(SENTENCE_SPLIT_REGEX)
      .map((segment) => trimAsciiWhitespace(collapseAsciiWhitespace(segment)))
      .filter(Boolean);

    const segments = mergeSegmentsByQuotes(rawSegments);

    if (segments.length === 0) {
      return;
    }

    segments.forEach((segment, sentenceIndex) => {
      sentences.push({
        id: `${chapterId}-${paragraphIndex}-${sentenceIndex}`,
        text: segment,
        chapterId,
        paragraphIndex,
        sentenceIndex,
      });
    });
    paragraphIndex += 1;
  };

  const inlineBuffer: string[] = [];

  const appendToBuffer = (value: string | null | undefined) => {
    if (!value) {
      return;
    }
    inlineBuffer.push(value);
  };

  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) {
      return;
    }
    const combined = inlineBuffer.join("");
    inlineBuffer.length = 0;

    const normalized = combined
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => trimAsciiWhitespace(collapseAsciiWhitespace(line)))
      .filter(Boolean)
      .join(" ");

    if (normalized) {
      processParagraph(normalized);
    }
  };

  const traverseNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendToBuffer(node.textContent);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (tagName === "br") {
      appendToBuffer("\n");
      return;
    }

    if (PARAGRAPH_TAGS.has(tagName)) {
      flushInlineBuffer();
      const normalized = normalizeParagraphText(element);
      if (normalized) {
        processParagraph(normalized);
      }
      return;
    }

    Array.from(element.childNodes).forEach(traverseNode);

    if (BLOCK_CONTAINER_TAGS.has(tagName)) {
      flushInlineBuffer();
    }
  };

  Array.from(container.childNodes).forEach(traverseNode);
  flushInlineBuffer();

  if (sentences.length > 0) {
    return sentences;
  }

  const fallbackText = trimAsciiWhitespace(
    collapseAsciiWhitespace(container.textContent ?? "")
  );

  if (!fallbackText) {
    return [];
  }

  const fallbackSegments = fallbackText
    .split(SENTENCE_SPLIT_REGEX)
    .map((segment) => trimAsciiWhitespace(collapseAsciiWhitespace(segment)))
    .filter(Boolean);

  const mergedFallbackSegments = mergeSegmentsByQuotes(fallbackSegments);

  return mergedFallbackSegments.map((text, index) => ({
    id: `${chapterId}-0-${index}`,
    text,
    chapterId,
    paragraphIndex: 0,
    sentenceIndex: index,
  }));
};

const ReaderPage: React.FC<ReaderPageProps> = ({
  book,
  initialChapterId,
  onExitReader,
  onOpenToc,
  onOpenSearch,
  onOpenSettings: onOpenSettingsProp,
  onChapterChange,
  onProgressChange,
}) => {
  const chapters: Chapter[] = useMemo(() => book.chapters ?? [], [book]);

  const defaultChapterId = useMemo(() => {
    if (
      initialChapterId &&
      chapters.some((item) => item.id === initialChapterId)
    ) {
      return initialChapterId;
    }
    if (
      book.currentChapterId &&
      chapters.some((item) => item.id === book.currentChapterId)
    ) {
      return book.currentChapterId;
    }
    if (
      book.lastReadChapterId &&
      chapters.some((item) => item.id === book.lastReadChapterId)
    ) {
      return book.lastReadChapterId;
    }
    return chapters.length > 0 ? chapters[0].id : "";
  }, [
    book.currentChapterId,
    book.lastReadChapterId,
    chapters,
    initialChapterId,
  ]);

  const [currentChapterId, setCurrentChapterId] = useState(defaultChapterId);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [readingMode, setReadingMode] = useState<ReadingMode>("single");
  const [viewMode, setViewMode] = useState<ReaderViewMode>("reading");
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSentenceAnalysisRunning, setIsSentenceAnalysisRunning] =
    useState(false);
  const [isShowingExistingAnalysis, setIsShowingExistingAnalysis] =
    useState(false);
  const [existingAnalysisResults, setExistingAnalysisResults] = useState<{
    byId: Record<string, TokenData[]>;
    byText: Record<string, TokenData[]>;
  }>({ byId: {}, byText: {} });
  const showExistingAnalysisRequestIdRef = useRef(0);
  const clearExistingAnalysisOverlay = useCallback(() => {
    showExistingAnalysisRequestIdRef.current += 1;
    setIsShowingExistingAnalysis(false);
    setExistingAnalysisResults({ byId: {}, byText: {} });
  }, []);

  const [sentenceItems, setSentenceItems] = useState<
    ReaderSentenceAnalysisItem[]
  >([]);
  const sentenceItemsRef = useRef<ReaderSentenceAnalysisItem[]>([]);
  const sentenceItemsChapterRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const analysisRunningRef = useRef(isSentenceAnalysisRunning);
  const [analysisPlaybackState, setAnalysisPlaybackState] =
    useState<AnalysisPlaybackState>({
      status: "idle",
      currentIndex: null,
      currentSentenceId: null,
    });
  const analysisSentencesQueue = useMemo<TtsSentencePayload[]>(
    () =>
      sentenceItems.map((item) => ({
        id: item.id,
        text: item.text,
      })),
    [sentenceItems]
  );
  const displaySentenceItems = useMemo(() => {
    if (!isShowingExistingAnalysis) {
      return sentenceItems;
    }
    return sentenceItems.map((item) => {
      const tokens =
        existingAnalysisResults.byId[item.id] ??
        existingAnalysisResults.byText[item.text];
      if (!tokens) {
        return item;
      }
      if (item.status === "loaded" && item.tokens && item.tokens.length > 0) {
        return item;
      }
      return {
        ...item,
        status: "loaded",
        tokens,
        error: undefined,
      };
    });
  }, [existingAnalysisResults, isShowingExistingAnalysis, sentenceItems]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [analysisTtsLanguage, setAnalysisTtsLanguage] =
    useState<string>("ja-JP");

  const resetAnalysisPlaybackState = useCallback(() => {
    setAnalysisPlaybackState({
      status: "idle",
      currentIndex: null,
      currentSentenceId: null,
    });
  }, []);

  const stopAnalysisPlayback = useCallback(() => {
    resetAnalysisPlaybackState();
    if (window?.api?.tts?.stop) {
      void window.api.tts
        .stop()
        .catch((error) => console.error("停止TTS失败:", error));
    }
  }, [resetAnalysisPlaybackState]);

  useEffect(() => {
    setCurrentChapterId(defaultChapterId);
  }, [defaultChapterId]);

  const contentRef = useRef<HTMLDivElement>(null);

  const currentIndex = useMemo(
    () => findChapterIndex(chapters, currentChapterId),
    [chapters, currentChapterId]
  );
  const currentChapter =
    currentIndex >= 0 && chapters[currentIndex] ? chapters[currentIndex] : null;

  const chapterTitle = currentChapter?.title ?? "章节内容";
  const chapterContentHtml = useMemo(
    () => currentChapter?.content ?? buildFallbackContent(),
    [currentChapter]
  );
  const activeChapterId = currentChapter?.id ?? "";
  useEffect(() => {
    setChapterProgress(0);
    const node = contentRef.current;
    if (node) {
      node.scrollTop = 0;
    }
  }, [currentChapterId]);

  const totalChapters = chapters.length;

  const bookProgress = useMemo(() => {
    if (totalChapters === 0 || currentIndex < 0) {
      return 0;
    }
    return deriveBookProgressFromChapter(
      currentIndex,
      totalChapters,
      chapterProgress
    );
  }, [chapterProgress, currentIndex, totalChapters]);

  useEffect(() => {
    onProgressChange?.(bookProgress);
  }, [bookProgress, onProgressChange]);

  const {
    isHeaderVisible,
    isFooterVisible,
    handlePointerMove,
    showToolbarsTemporarily,
  } = useReaderToolbarVisibility();

  const toggleReadingMode = useCallback(() => {
    setReadingMode((prev) => (prev === "single" ? "double" : "single"));
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  const resetSentenceAnalysisItems = useCallback(() => {
    setSentenceItems(() => {
      sentenceItemsRef.current = [];
      sentenceItemsChapterRef.current = null;
      return [];
    });
    resetAnalysisPlaybackState();
  }, [resetAnalysisPlaybackState]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
    showToolbarsTemporarily(1800);
    onOpenSettingsProp?.();
  }, [onOpenSettingsProp, showToolbarsTemporarily]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  const handleTtsLanguageChange = useCallback(
    (language: string) => {
      setAnalysisTtsLanguage(language);
      stopAnalysisPlayback();
    },
    [stopAnalysisPlayback]
  );

  const handleEnterAnalysisMode = useCallback(() => {
    setViewMode("analysis");
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  const handleExitAnalysisMode = useCallback(() => {
    stopAnalysisPlayback();
    setIsSentenceAnalysisRunning(false);
    clearExistingAnalysisOverlay();
    setViewMode("reading");
    showToolbarsTemporarily(1800);
  }, [
    clearExistingAnalysisOverlay,
    showToolbarsTemporarily,
    stopAnalysisPlayback,
  ]);

  const handleShowExistingSentenceAnalysis = useCallback(() => {
    if (isShowingExistingAnalysis) {
      clearExistingAnalysisOverlay();
      showToolbarsTemporarily(1800);
      return;
    }

    if (
      viewMode !== "analysis" ||
      !activeChapterId ||
      !window?.api?.db?.sentenceAnalysis?.listByContext
    ) {
      return;
    }

    const requestId = ++showExistingAnalysisRequestIdRef.current;

    void (async () => {
      try {
        const records =
          (await window.api.db.sentenceAnalysis.listByContext(book.id, {
            chapterId: activeChapterId,
          })) ?? [];

        if (records.length === 0) {
          return;
        }

        const byId: Record<string, TokenData[]> = {};
        const byText: Record<string, TokenData[]> = {};

        records.forEach((record) => {
          if (record.tokens && record.tokens.length > 0) {
            if (record.sentenceId) {
              byId[record.sentenceId] = record.tokens;
            }
            byText[record.text] = record.tokens;
          }
        });

        if (
          Object.keys(byId).length === 0 &&
          Object.keys(byText).length === 0
        ) {
          return;
        }

        if (showExistingAnalysisRequestIdRef.current !== requestId) {
          return;
        }

        setExistingAnalysisResults({ byId, byText });
        setIsShowingExistingAnalysis(true);
      } catch (error) {
        console.error("加载已存储的句子分析失败:", error);
      }
    })();

    showToolbarsTemporarily(1800);
  }, [
    activeChapterId,
    book.id,
    clearExistingAnalysisOverlay,
    isShowingExistingAnalysis,
    showToolbarsTemporarily,
    viewMode,
  ]);

  const handleToggleSentenceAnalysisRunning = useCallback(() => {
    setIsSentenceAnalysisRunning((prev) => {
      const next = !prev;
      if (!next) {
        stopAnalysisPlayback();
        resetSentenceAnalysisItems();
      }
      return next;
    });
    showToolbarsTemporarily(1800);
  }, [
    resetSentenceAnalysisItems,
    showToolbarsTemporarily,
    stopAnalysisPlayback,
  ]);

  const handleAnalysisPlaybackToggle = useCallback(async () => {
    if (viewMode !== "analysis" || sentenceItems.length === 0) {
      return;
    }

    const ttsApi = window?.api?.tts;
    if (!ttsApi) {
      return;
    }

    try {
      if (analysisPlaybackState.status === "playing") {
        await ttsApi.pause();
      } else if (analysisPlaybackState.status === "paused") {
        await ttsApi.resume();
      } else {
        const startIndex = analysisPlaybackState.currentIndex ?? 0;
        const languageOption =
          analysisTtsLanguage === "system" ? undefined : analysisTtsLanguage;
        await ttsApi.start(analysisSentencesQueue, {
          startIndex,
          language: languageOption,
        });
      }
      showToolbarsTemporarily(1800);
    } catch (error) {
      console.error("TTS控制失败:", error);
    }
  }, [
    analysisPlaybackState.currentIndex,
    analysisPlaybackState.status,
    analysisTtsLanguage,
    analysisSentencesQueue,
    sentenceItems.length,
    showToolbarsTemporarily,
    viewMode,
  ]);

  const handleSentenceSelect = useCallback(
    async (sentenceId: string) => {
      if (viewMode !== "analysis") {
        return;
      }

      const sentenceIndex = sentenceItems.findIndex(
        (item) => item.id === sentenceId
      );

      if (sentenceIndex === -1) {
        return;
      }

      const ttsApi = window?.api?.tts;
      if (!ttsApi) {
        return;
      }

      setAnalysisPlaybackState((prev) => ({
        ...prev,
        currentIndex: sentenceIndex,
        currentSentenceId: sentenceId,
      }));

      try {
        if (analysisPlaybackState.status === "idle") {
          if (analysisSentencesQueue.length === 0) {
            return;
          }
          const languageOption =
            analysisTtsLanguage === "system" ? undefined : analysisTtsLanguage;
          await ttsApi.start(analysisSentencesQueue, {
            startIndex: sentenceIndex,
            language: languageOption,
          });
        } else {
          await ttsApi.jumpTo(sentenceIndex);
        }

        showToolbarsTemporarily(1800);
      } catch (error) {
        console.error("跳转TTS失败:", error);
      }
    },
    [
      analysisPlaybackState.status,
      analysisTtsLanguage,
      analysisSentencesQueue,
      sentenceItems,
      showToolbarsTemporarily,
      viewMode,
    ]
  );

  const isTtsAvailable =
    typeof window !== "undefined" && Boolean(window.api?.tts);
  const isAnalysisPlaybackDisabled =
    !isTtsAvailable || viewMode !== "analysis" || sentenceItems.length === 0;
  const sentenceSelectionHandler = isAnalysisPlaybackDisabled
    ? undefined
    : handleSentenceSelect;

  useEffect(() => {
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  useEffect(() => {
    sentenceItemsRef.current = sentenceItems;
  }, [sentenceItems]);

  useEffect(() => {
    analysisRunningRef.current = isSentenceAnalysisRunning;
  }, [isSentenceAnalysisRunning]);

  useEffect(() => {
    clearExistingAnalysisOverlay();
  }, [activeChapterId, clearExistingAnalysisOverlay, viewMode]);

  useEffect(() => {
    return () => {
      showExistingAnalysisRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (viewMode !== "analysis") {
      stopAnalysisPlayback();
    }
  }, [stopAnalysisPlayback, viewMode]);

  useEffect(() => {
    stopAnalysisPlayback();
  }, [currentChapterId, stopAnalysisPlayback]);

  useEffect(() => {
    const ttsApi = window?.api?.tts;
    if (!ttsApi?.onStateChange) {
      return;
    }

    const unsubscribe = ttsApi.onStateChange((state: TtsStateUpdate) => {
      setAnalysisPlaybackState((prev) => {
        if (
          prev.status === state.status &&
          prev.currentIndex === state.currentIndex &&
          prev.currentSentenceId === state.currentSentenceId
        ) {
          return prev;
        }

        return {
          status: state.status,
          currentIndex: state.currentIndex,
          currentSentenceId: state.currentSentenceId,
        };
      });

      if (state.error) {
        console.error("TTS错误:", state.error);
      }
    });

    return () => {
      unsubscribe?.();
      ttsApi.cleanup?.();
    };
  }, []);

  const processPendingSentences = useCallback(async () => {
    if (
      viewMode !== "analysis" ||
      !isSentenceAnalysisRunning ||
      !analysisRunningRef.current ||
      !activeChapterId ||
      processingRef.current ||
      !window?.api?.db?.sentenceAnalysis ||
      !window?.api?.ai?.sendGeminiRequest
    ) {
      return;
    }

    processingRef.current = true;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (!analysisRunningRef.current) {
          break;
        }

        const nextIdle = sentenceItemsRef.current.find(
          (item) => item.status === "idle"
        );

        if (!nextIdle) {
          break;
        }

        setSentenceItems((prev) => {
          const next = prev.map((entry) =>
            entry.id === nextIdle.id
              ? { ...entry, status: "loading", error: undefined }
              : entry
          );
          sentenceItemsRef.current = next;
          return next;
        });

        try {
          const context = {
            chapterId: activeChapterId,
            sentenceId: nextIdle.id,
          };
          const cached = await window.api.db.sentenceAnalysis.getBySentence(
            book.id,
            nextIdle.text,
            context
          );

          if (cached && cached.tokens && cached.tokens.length > 0) {
            setSentenceItems((prev) => {
              const next = prev.map((entry) =>
                entry.id === nextIdle.id
                  ? {
                      ...entry,
                      status: "loaded",
                      tokens: cached.tokens,
                      error: undefined,
                    }
                  : entry
              );
              sentenceItemsRef.current = next;
              return next;
            });
            continue;
          }

          const prompt = getPrompt(nextIdle.text);
          const tokens: TokenData[] = await queuedSendGeminiRequest(prompt);

          setSentenceItems((prev) => {
            const next = prev.map((entry) =>
              entry.id === nextIdle.id
                ? {
                    ...entry,
                    status: "loaded",
                    tokens,
                    error: undefined,
                  }
                : entry
            );
            sentenceItemsRef.current = next;
            return next;
          });

          await window.api.db.sentenceAnalysis.upsert({
            bookId: book.id,
            text: nextIdle.text,
            tokens,
            chapterId: activeChapterId,
            sentenceId: nextIdle.id,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "分析过程中出现未知错误";

          setSentenceItems((prev) => {
            const next = prev.map((entry) =>
              entry.id === nextIdle.id
                ? {
                    ...entry,
                    status: "error",
                    error: message,
                    tokens: undefined,
                  }
                : entry
            );
            sentenceItemsRef.current = next;
            return next;
          });
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [viewMode, isSentenceAnalysisRunning, activeChapterId, book.id]);

  const handleRetrySentence = useCallback(
    (sentenceId: string) => {
      setSentenceItems((prev) => {
        const next = prev.map((item) =>
          item.id === sentenceId
            ? { ...item, status: "idle", tokens: undefined, error: undefined }
            : item
        );
        sentenceItemsRef.current = next;
        return next;
      });
      if (analysisRunningRef.current) {
        void processPendingSentences();
      }
    },
    [processPendingSentences]
  );

  useEffect(() => {
    const normalizedChapterId = activeChapterId ?? null;
    if (viewMode !== "analysis") {
      if (
        sentenceItemsChapterRef.current &&
        sentenceItemsChapterRef.current !== normalizedChapterId
      ) {
        sentenceItemsChapterRef.current = null;
        if (sentenceItemsRef.current.length > 0) {
          sentenceItemsRef.current = [];
          setSentenceItems([]);
        }
      }
      return;
    }

    if (!activeChapterId) {
      if (sentenceItemsRef.current.length > 0) {
        sentenceItemsRef.current = [];
        sentenceItemsChapterRef.current = null;
        setSentenceItems([]);
      }
      return;
    }

    const sentences = extractSentencesFromHtml(
      chapterContentHtml,
      activeChapterId
    );

    const previous = sentenceItemsRef.current;
    const previousById = new Map(previous.map((item) => [item.id, item]));
    let needsUpdate = previous.length !== sentences.length;
    const nextState = sentences.map((sentence) => {
      const existing = previousById.get(sentence.id);
      if (existing) {
        if (
          !needsUpdate &&
          existing.paragraphIndex === sentence.paragraphIndex &&
          existing.sentenceIndex === sentence.sentenceIndex &&
          existing.text === sentence.text
        ) {
          return existing;
        }
        needsUpdate = true;
        return existing;
      }
      needsUpdate = true;
      return {
        ...sentence,
        status: "idle" as ReaderSentenceAnalysisItem["status"],
      };
    });

    if (!needsUpdate) {
      if (
        !processingRef.current &&
        analysisRunningRef.current &&
        previous.some((item) => item.status === "idle")
      ) {
        void processPendingSentences();
      }
      return;
    }

    sentenceItemsRef.current = nextState;
    sentenceItemsChapterRef.current = activeChapterId;
    setSentenceItems(nextState);
    if (analysisRunningRef.current) {
      void processPendingSentences();
    }
  }, [viewMode, chapterContentHtml, activeChapterId, processPendingSentences]);

  useEffect(() => {
    if (isSentenceAnalysisRunning && viewMode === "analysis") {
      void processPendingSentences();
    }
  }, [isSentenceAnalysisRunning, viewMode, processPendingSentences]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const progress = calculateScrollProgress(target);
    setChapterProgress(progress);
  }, []);

  const prevChapterId = useMemo(
    () => getPrevChapterId(chapters, currentIndex),
    [chapters, currentIndex]
  );

  const nextChapterId = useMemo(
    () => getNextChapterId(chapters, currentIndex),
    [chapters, currentIndex]
  );

  const goToChapter = useCallback(
    (chapterId: string | null) => {
      if (!chapterId) {
        return;
      }
      setCurrentChapterId(chapterId);
      onChapterChange?.(chapterId);
      showToolbarsTemporarily();
    },
    [onChapterChange, showToolbarsTemporarily]
  );

  const handlePrevChapter = useCallback(() => {
    goToChapter(prevChapterId);
  }, [goToChapter, prevChapterId]);

  const handleNextChapter = useCallback(() => {
    goToChapter(nextChapterId);
  }, [goToChapter, nextChapterId]);

  const handleOpenToc = useCallback(() => {
    setIsTocOpen((prev) => {
      if (prev) {
        return prev;
      }
      onOpenToc?.();
      return true;
    });
    showToolbarsTemporarily(1800);
  }, [onOpenToc, showToolbarsTemporarily]);

  const handleCloseToc = useCallback(() => {
    setIsTocOpen(false);
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  const handleToggleToc = useCallback(() => {
    setIsTocOpen((prev) => {
      const next = !prev;
      if (next) {
        onOpenToc?.();
      }
      return next;
    });
    showToolbarsTemporarily(1800);
  }, [onOpenToc, showToolbarsTemporarily]);

  const handleChapterSelectFromToc = useCallback(
    (chapterId: string) => {
      setIsTocOpen(false);
      goToChapter(chapterId);
    },
    [goToChapter]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      handlePointerMove(event.clientY);
    },
    [handlePointerMove]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (touch) {
        handlePointerMove(touch.clientY);
      }
    },
    [handlePointerMove]
  );

  useReaderShortcuts({
    onExit: onExitReader,
    onNextChapter: handleNextChapter,
    onPrevChapter: handlePrevChapter,
    onToggleToc: handleToggleToc,
    enabled: totalChapters > 0,
  });

  return (
    <>
      <ReaderLayout
        header={
          <ReaderHeader
            bookTitle={book.title}
            chapterTitle={chapterTitle}
            isVisible={isHeaderVisible}
            onBack={onExitReader}
            onOpenToc={handleOpenToc}
            onOpenSearch={onOpenSearch}
            onOpenSettings={handleOpenSettings}
            viewMode={viewMode}
            onEnterAnalysisMode={handleEnterAnalysisMode}
            onExitAnalysisMode={handleExitAnalysisMode}
            onShowExistingAnalysis={handleShowExistingSentenceAnalysis}
            isShowingExistingAnalysis={isShowingExistingAnalysis}
            onToggleSentenceAnalysisRunning={handleToggleSentenceAnalysisRunning}
            isSentenceAnalysisRunning={isSentenceAnalysisRunning}
            onToggleAnalysisPlayback={handleAnalysisPlaybackToggle}
            analysisPlaybackStatus={analysisPlaybackState.status}
            isAnalysisPlaybackDisabled={isAnalysisPlaybackDisabled}
          />
        }
        content={
          viewMode === "analysis" ? (
            <ReaderSentenceAnalysisPanel
              ref={contentRef}
              sentences={displaySentenceItems}
              bookId={book.id}
              chapterId={activeChapterId}
              chapterTitle={chapterTitle}
              onRetry={handleRetrySentence}
              onScroll={handleScroll}
              activeSentenceId={analysisPlaybackState.currentSentenceId}
              onSentenceSelect={sentenceSelectionHandler}
            />
          ) : (
            <ReaderContent
              ref={contentRef}
              chapterTitle={chapterTitle}
              contentHtml={chapterContentHtml}
              onScroll={handleScroll}
              readingMode={readingMode}
            />
          )
        }
        footer={
          <ReaderFooter
            isVisible={isFooterVisible}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
            disablePrev={
              totalChapters === 0 ||
              currentIndex < 0 ||
              isFirstChapter(currentIndex)
            }
            disableNext={
              totalChapters === 0 ||
              currentIndex < 0 ||
              isLastChapter(chapters, currentIndex)
            }
            progress={bookProgress}
          />
        }
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
      />

      <ReaderTocSidebar
        chapters={chapters}
        currentChapterId={activeChapterId}
        isOpen={isTocOpen}
        onChapterSelect={handleChapterSelectFromToc}
        onClose={handleCloseToc}
      />

      <ReaderSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
        ttsLanguage={analysisTtsLanguage}
        onTtsLanguageChange={handleTtsLanguageChange}
        ttsLanguageOptions={TTS_LANGUAGE_OPTIONS}
      />
    </>
  );
};

export default ReaderPage;
