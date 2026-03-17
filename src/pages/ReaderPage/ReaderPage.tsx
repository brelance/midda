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
import ReaderChatSidebar from "../../components/reader/ReaderChatSidebar";
import { Book, Chapter, TokenData } from "../../types/types";
import { ReadingMode, ReaderViewMode } from "../../types/reader";
import type {
  TtsPlaybackStatus,
  TtsSentencePayload,
  TtsStateUpdate,
} from "../../types/tts";
import type {
  RoleplayAnalysisState,
  RoleplayChatHistoryMessage,
} from "../../types/roleplay";
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
import { queuedSendTokensRequest } from "../../services/apiQueue";
import {
  analyzeChapterForRoleplay,
  sendRoleplayMessage,
} from "../../services/interactiveRoleplay";
import { detectLanguageForSamples } from "../../utils/lang/detectLanguage";

interface ReaderPageProps {
  book: Book;
  initialChapterId?: string;
  onExitReader: () => void;
  onOpenToc?: () => void;
  onOpenChat?: () => void;
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

const htmlToPlainText = (html: string): string => {
  if (!html) {
    return "";
  }
  const withoutTags = html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return withoutTags.replace(/\s+/g, " ").trim();
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
  onOpenChat,
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
  const [readingMode] = useState<ReadingMode>("single");
  const [viewMode, setViewMode] = useState<ReaderViewMode>("reading");
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [roleplayAnalysisByChapter, setRoleplayAnalysisByChapter] = useState<
    Record<string, RoleplayAnalysisState>
  >({});
  const [
    selectedRoleplayCharacterByChapter,
    setSelectedRoleplayCharacterByChapter,
  ] = useState<Record<string, string | null>>({});
  const [chatMessagesBySession, setChatMessagesBySession] = useState<
    Record<string, RoleplayChatHistoryMessage[]>
  >({});
  const [chatErrorBySession, setChatErrorBySession] = useState<
    Record<string, string | undefined>
  >({});
  const [isChatSending, setIsChatSending] = useState(false);
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
  const clearAnalysisLanguage = useCallback(() => {
    analysisLanguageRef.current = undefined;
  }, []);
  const ensureAnalysisLanguageReady = useCallback(async () => {
    if (analysisLanguageRef.current || sentenceItemsRef.current.length === 0) {
      return analysisLanguageRef.current;
    }
    if (!analysisLanguageDetectionPromiseRef.current) {
      const samples = sentenceItemsRef.current
        .slice(0, 25)
        .map((item) => item.text)
        .filter((text) => typeof text === "string" && text.trim().length > 0);
      if (samples.length === 0) {
        return undefined;
      }
      const detectionPromise = Promise.resolve().then(() => {
        const detection = detectLanguageForSamples(samples);
        analysisLanguageRef.current = detection.languageCode;
        return analysisLanguageRef.current;
      });
      analysisLanguageDetectionPromiseRef.current = detectionPromise.finally(
        () => {
          analysisLanguageDetectionPromiseRef.current = null;
        }
      );
    }
    return analysisLanguageDetectionPromiseRef.current;
  }, []);

  const [sentenceItems, setSentenceItems] = useState<
    ReaderSentenceAnalysisItem[]
  >([]);
  const sentenceItemsRef = useRef<ReaderSentenceAnalysisItem[]>([]);
  const sentenceItemsChapterRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const analysisRunningRef = useRef(isSentenceAnalysisRunning);
  const analysisLanguageRef = useRef<string | undefined>(undefined);
  const analysisLanguageDetectionPromiseRef =
    useRef<Promise<string | undefined> | null>(null);
  const roleplayAnalysisRequestIdRef = useRef(0);
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
        status: "loaded" as ReaderSentenceAnalysisItem["status"],
        tokens,
        error: undefined,
      };
    });
  }, [existingAnalysisResults, isShowingExistingAnalysis, sentenceItems]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [analysisTtsLanguage, setAnalysisTtsLanguage] =
    useState<string>("ja-JP");
  const [enableTokenHoverTts, setEnableTokenHoverTts] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.localStorage.getItem("reader.enableTokenHoverTts") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "reader.enableTokenHoverTts",
        String(enableTokenHoverTts)
      );
    } catch {
      // ignore persistence errors
    }
  }, [enableTokenHoverTts]);

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

  useEffect(() => {
    setRoleplayAnalysisByChapter({});
    setSelectedRoleplayCharacterByChapter({});
    roleplayAnalysisRequestIdRef.current = 0;
    setIsChatSidebarOpen(false);
    setChatMessagesBySession({});
    setChatErrorBySession({});
    setIsChatSending(false);
  }, [book.id]);

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
  const chapterCssContent = currentChapter?.cssContent;
  const chapterPlainText = useMemo(
    () => htmlToPlainText(chapterContentHtml),
    [chapterContentHtml]
  );
  const activeChapterId = currentChapter?.id ?? "";
  const roleplayAnalysisState: RoleplayAnalysisState =
    roleplayAnalysisByChapter[activeChapterId] ?? {
      status: "idle",
      characters: [],
      error: undefined,
    };
  const selectedRoleplayCharacter =
    selectedRoleplayCharacterByChapter[activeChapterId] ?? null;
  const chatSessionKey =
    activeChapterId && selectedRoleplayCharacter
      ? `${activeChapterId}::${selectedRoleplayCharacter}`
      : null;
  const chatMessages: RoleplayChatHistoryMessage[] = useMemo(() => {
    if (!chatSessionKey) {
      return [];
    }
    return chatMessagesBySession[chatSessionKey] ?? [];
  }, [chatMessagesBySession, chatSessionKey]);
  const chatError = chatSessionKey ? chatErrorBySession[chatSessionKey] : undefined;
  useEffect(() => {
    setIsChatSending(false);
  }, [chatSessionKey]);
  useEffect(() => {
    const node = contentRef.current;
    const bookId = book.id;
    const chapterId = currentChapterId;

    if (!bookId || !chapterId) {
      if (node) node.scrollTop = 0;
      setChapterProgress(0);
      return;
    }

    // Reset scroll immediately for fast visual feedback
    if (node) node.scrollTop = 0;
    setChapterProgress(0);

    // Then asynchronously restore saved position (if any)
    const readingPositionsApi = window?.api?.db?.readingPositions;
    if (!readingPositionsApi?.get) return;

    let cancelled = false;
    readingPositionsApi.get(bookId, chapterId).then((record) => {
      if (cancelled || !record) return;
      const savedOffset = record.scrollOffset ?? 0;
      if (savedOffset <= 0) return;
      // Wait for DOM to finish rendering the new chapter before restoring
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled && contentRef.current) {
            contentRef.current.scrollTop = savedOffset;
          }
        });
      });
    }).catch(() => {
      // Ignore restore errors; user just starts from the top
    });

    return () => { cancelled = true; };
  }, [currentChapterId, book.id]);

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

  useEffect(() => {
    if (
      roleplayAnalysisState.status !== "ready" ||
      !activeChapterId ||
      roleplayAnalysisState.characters.length === 0
    ) {
      return;
    }
    if (
      !selectedRoleplayCharacter ||
      !roleplayAnalysisState.characters.some(
        (item) => item.name === selectedRoleplayCharacter
      )
    ) {
      setSelectedRoleplayCharacterByChapter((prev) => ({
        ...prev,
        [activeChapterId]:
          roleplayAnalysisState.characters[0]?.name ?? selectedRoleplayCharacter,
      }));
    }
  }, [
    activeChapterId,
    roleplayAnalysisState,
    selectedRoleplayCharacter,
    setSelectedRoleplayCharacterByChapter,
  ]);

  const {
    isHeaderVisible,
    isFooterVisible,
    handlePointerMove,
    showToolbarsTemporarily,
  } = useReaderToolbarVisibility();

  const ensureRoleplayAnalysis = useCallback(
    async (options?: { force?: boolean }) => {
      if (!activeChapterId) {
        return;
      }

      const existing = roleplayAnalysisByChapter[activeChapterId];
      if (
        !options?.force &&
        existing &&
        (existing.status === "loading" || existing.status === "ready")
      ) {
        return;
      }

      const requestId = ++roleplayAnalysisRequestIdRef.current;

      setRoleplayAnalysisByChapter((prev) => ({
        ...prev,
        [activeChapterId]: {
          status: "loading",
          characters: existing?.characters ?? [],
          error: undefined,
        },
      }));

      try {
        const characters = await analyzeChapterForRoleplay({
          bookId: book.id,
          bookTitle: book.title,
          chapterId: activeChapterId,
          chapterTitle,
          bookContent: chapterPlainText,
        });

        if (roleplayAnalysisRequestIdRef.current !== requestId) {
          return;
        }

        setRoleplayAnalysisByChapter((prev) => ({
          ...prev,
          [activeChapterId]: {
            status: "ready",
            characters,
            error: undefined,
          },
        }));

        setSelectedRoleplayCharacterByChapter((prev) => {
          const current = prev[activeChapterId];
          if (current && characters.some((item) => item.name === current)) {
            return prev;
          }
          return { ...prev, [activeChapterId]: characters[0]?.name ?? null };
        });
      } catch (error) {
        if (roleplayAnalysisRequestIdRef.current !== requestId) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "交互式聊天初始化失败，请稍后重试";

        setRoleplayAnalysisByChapter((prev) => ({
          ...prev,
          [activeChapterId]: {
            status: "error",
            characters: [],
            error: message,
          },
        }));
      }
    },
    [
      activeChapterId,
      book.id,
      book.title,
      chapterPlainText,
      chapterTitle,
      roleplayAnalysisByChapter,
    ]
  );

  useEffect(() => {
    if (!isChatSidebarOpen) {
      return;
    }
    void ensureRoleplayAnalysis();
  }, [activeChapterId, ensureRoleplayAnalysis, isChatSidebarOpen]);

  const handleOpenChatSidebar = useCallback(() => {
    setIsChatSidebarOpen(true);
    setIsTocOpen(false);
    showToolbarsTemporarily(1800);
    onOpenChat?.();
    void ensureRoleplayAnalysis();
  }, [ensureRoleplayAnalysis, onOpenChat, showToolbarsTemporarily]);

  const handleCloseChatSidebar = useCallback(() => {
    setIsChatSidebarOpen(false);
  }, []);

  const handleSelectRoleplayCharacter = useCallback(
    (name: string) => {
      if (!activeChapterId) {
        return;
      }
      setSelectedRoleplayCharacterByChapter((prev) => ({
        ...prev,
        [activeChapterId]: name,
      }));
    },
    [activeChapterId]
  );

  const handleRetryRoleplayAnalysis = useCallback(() => {
    void ensureRoleplayAnalysis({ force: true });
  }, [ensureRoleplayAnalysis]);

  const handleSendChatMessage = useCallback(
    async (text: string) => {
      if (
        !selectedRoleplayCharacter ||
        !chatSessionKey ||
        roleplayAnalysisState.status !== "ready"
      ) {
        return;
      }

      const character = roleplayAnalysisState.characters.find(
        (item) => item.name === selectedRoleplayCharacter
      );

      if (!character) {
        setChatErrorBySession((prev) => ({
          ...prev,
          [chatSessionKey]: "未找到角色，请重新选择。",
        }));
        return;
      }

      const userMessage: RoleplayChatHistoryMessage = {
        role: "user",
        content: text,
      };
      const existingMessages = chatMessages;
      const nextHistory = [...existingMessages, userMessage];

      setChatMessagesBySession((prev) => ({
        ...prev,
        [chatSessionKey]: nextHistory,
      }));
      setChatErrorBySession((prev) => ({
        ...prev,
        [chatSessionKey]: undefined,
      }));
      setIsChatSending(true);

      try {
        const response = await sendRoleplayMessage({
          character,
          bookTitle: book.title,
          chapterTitle,
          chapterContentOrSummary: chapterPlainText,
          targetLanguage: "ja-JP",
          userProficiencyLevel: "B1 - Intermediate",
          message: text,
          history: existingMessages,
        });

        const assistantMessage: RoleplayChatHistoryMessage = {
          role: "assistant",
          content: response.reply,
        };

        setChatMessagesBySession((prev) => ({
          ...prev,
          [chatSessionKey]: [...nextHistory, assistantMessage],
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "发送消息失败，请稍后重试";
        setChatErrorBySession((prev) => ({
          ...prev,
          [chatSessionKey]: message,
        }));
      } finally {
        setIsChatSending(false);
      }
    },
    [
      book.title,
      chapterPlainText,
      chapterTitle,
      chatMessages,
      chatSessionKey,
      roleplayAnalysisState,
      selectedRoleplayCharacter,
      sendRoleplayMessage,
    ]
  );

  const resetSentenceAnalysisItems = useCallback(() => {
    setSentenceItems(() => {
      sentenceItemsRef.current = [];
      sentenceItemsChapterRef.current = null;
      return [];
    });
    clearAnalysisLanguage();
    resetAnalysisPlaybackState();
  }, [clearAnalysisLanguage, resetAnalysisPlaybackState]);

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
      } else {
        void ensureAnalysisLanguageReady();
      }
      return next;
    });
    showToolbarsTemporarily(1800);
  }, [
    ensureAnalysisLanguageReady,
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
    if (
      viewMode === "analysis" &&
      sentenceItems.length > 0 &&
      !analysisLanguageRef.current &&
      !analysisLanguageDetectionPromiseRef.current
    ) {
      void ensureAnalysisLanguageReady();
    }
  }, [ensureAnalysisLanguageReady, sentenceItems, viewMode]);

  useEffect(() => {
    analysisRunningRef.current = isSentenceAnalysisRunning;
  }, [isSentenceAnalysisRunning]);

  useEffect(() => {
    clearExistingAnalysisOverlay();
  }, [activeChapterId, clearExistingAnalysisOverlay, viewMode]);

  useEffect(() => {
    clearAnalysisLanguage();
  }, [activeChapterId, clearAnalysisLanguage]);

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
      !window?.api?.ai?.sendTokensRequest
    ) {
      return;
    }

    processingRef.current = true;

    try {
      await ensureAnalysisLanguageReady();
      const languageHint = analysisLanguageRef.current;
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
              ? {
                  ...entry,
                  status: "loading" as ReaderSentenceAnalysisItem["status"],
                  error: undefined,
                }
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
                      status: "loaded" as ReaderSentenceAnalysisItem["status"],
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

          const tokens: TokenData[] = await queuedSendTokensRequest(
            nextIdle.text,
            { language: languageHint }
          );

          setSentenceItems((prev) => {
            const next = prev.map((entry) =>
              entry.id === nextIdle.id
                ? {
                    ...entry,
                    status: "loaded" as ReaderSentenceAnalysisItem["status"],
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
                    status: "error" as ReaderSentenceAnalysisItem["status"],
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
  }, [
    viewMode,
    isSentenceAnalysisRunning,
    activeChapterId,
    book.id,
    ensureAnalysisLanguageReady,
  ]);

  const handleRetrySentence = useCallback(
    (sentenceId: string) => {
      setSentenceItems((prev) => {
        const next = prev.map((item) =>
          item.id === sentenceId
            ? {
                ...item,
                status: "idle" as ReaderSentenceAnalysisItem["status"],
                tokens: undefined,
                error: undefined,
              }
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

  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const progress = calculateScrollProgress(target);
    setChapterProgress(progress);

    // Debounced save of scroll offset to DB (500 ms)
    if (!activeChapterId || !book.id) return;
    if (scrollSaveTimerRef.current !== null) {
      clearTimeout(scrollSaveTimerRef.current);
    }
    const capturedScrollTop = target.scrollTop;
    const capturedHeight = target.clientHeight;
    scrollSaveTimerRef.current = setTimeout(() => {
      scrollSaveTimerRef.current = null;
      if (!window?.api?.db?.readingPositions?.upsert) return;
      void window.api.db.readingPositions.upsert({
        bookId: book.id,
        chapterId: activeChapterId,
        scrollProgress: progress,
        scrollOffset: capturedScrollTop,
        viewportHeight: capturedHeight,
      }).catch((err) => console.error("保存阅读位置失败:", err));
    }, 500);
  }, [activeChapterId, book.id]);

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
            onOpenChat={handleOpenChatSidebar}
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
              enableTokenHoverTts={enableTokenHoverTts}
              ttsLanguage={analysisTtsLanguage}
            />
          ) : (
            <ReaderContent
              ref={contentRef}
              chapterTitle={chapterTitle}
              contentHtml={chapterContentHtml}
              cssContent={chapterCssContent}
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

      <ReaderChatSidebar
        isOpen={isChatSidebarOpen}
        chapterTitle={chapterTitle}
        analysisState={roleplayAnalysisState}
        selectedCharacter={selectedRoleplayCharacter}
        onSelectCharacter={handleSelectRoleplayCharacter}
        onRetryAnalysis={handleRetryRoleplayAnalysis}
        onClose={handleCloseChatSidebar}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        isSending={isChatSending}
        chatError={chatError}
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
        enableTokenHoverTts={enableTokenHoverTts}
        onEnableTokenHoverTtsChange={setEnableTokenHoverTts}
      />
    </>
  );
};

export default ReaderPage;
