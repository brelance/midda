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
import ReaderSettingsModal from "../../components/reader/ReaderSettingsModal";
import ReaderTocSidebar from "../../components/reader/ReaderTocSidebar";
import ReaderChatSidebar from "../../components/reader/ReaderChatSidebar";
import { Book, Chapter, TokenData } from "../../types/types";
import { useReaderSettings } from "../../stores/readerSettingsStore";
import { useTtsStateSync } from "../../stores/ttsStore";
import {
  useRoleplayStore,
  useChapterAnalysis,
  useSelectedCharacter,
  useChatMessages,
  useChatError,
  useRoleplayActions,
} from "../../stores/roleplayStore";
import type { ReaderContentHandle } from "../../components/reader/ReaderContent";
import type { ReaderSentenceAnalysisItem } from "../../components/reader/StudyDoublePanel";
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
import { queuedSendTokensRequest, clearQueue } from "../../services/apiQueue";
import { detectLanguageForSamples } from "../../utils/lang/detectLanguage";
import { splitIntoSentences } from "../../utils/lang/sentenceSegmenter";

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
  chapterId: string,
  locale?: string
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
    // Clone so we don't mutate the live DOM
    const clone = element.cloneNode(true) as Element;
    // Strip ruby annotation nodes — rt (reading text) and rp (fallback parentheses)
    clone.querySelectorAll("rt, rp").forEach((n) => n.remove());
    const raw = clone.textContent ?? "";
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
    const rawSegments = splitIntoSentences(text, locale)
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
      // Skip text nodes that are inside <rt> or <rp> (ruby annotation)
      const parent = node.parentElement;
      if (parent) {
        const pTag = parent.tagName.toLowerCase();
        if (pTag === "rt" || pTag === "rp") {
          return;
        }
      }
      appendToBuffer(node.textContent);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (tagName === "br") {
      // Treat <br> as a paragraph boundary so that EPUBs using <br> instead
      // of <p> don't collapse the entire chapter into one paragraph.
      flushInlineBuffer();
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
    container.innerHTML = "";
    return sentences;
  }

  const fallbackContainer = container.cloneNode(true) as Element;
  fallbackContainer.querySelectorAll("rt, rp").forEach((n) => n.remove());
  const fallbackText = trimAsciiWhitespace(
    collapseAsciiWhitespace(fallbackContainer.textContent ?? "")
  );

  if (!fallbackText) {
    return [];
  }

  const fallbackSegments = splitIntoSentences(fallbackText, locale)
    .map((segment) => trimAsciiWhitespace(collapseAsciiWhitespace(segment)))
    .filter(Boolean);

  const mergedFallbackSegments = mergeSegmentsByQuotes(fallbackSegments);

  container.innerHTML = "";
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
  // ── Reader settings from Zustand store (persisted to localStorage) ──
  const { readingMode, scrollMode } = useReaderSettings();

  // Keep TTS Zustand store in sync with native playback events.
  // Mounted here (reader-scoped) so the subscription survives reading-mode switches.
  useTtsStateSync();

  // Page tracking state for footer display
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const isChatSidebarOpen = useRoleplayStore((s) => s.isChatSidebarOpen);
  const isChatSending = useRoleplayStore((s) => s.isChatSending);
  const { resetForBook, openChatSidebar, closeChatSidebar } = useRoleplayStore();
  const roleplayActions = useRoleplayActions();
  const [isSentenceAnalysisRunning, setIsSentenceAnalysisRunning] =
    useState(false);

  const [sentenceItems, setSentenceItems] = useState<ReaderSentenceAnalysisItem[]>([]);
  const sentenceItemsRef = useRef<ReaderSentenceAnalysisItem[]>([]);
  const sentenceItemsChapterRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const chapterGenerationRef = useRef(0);
  const analysisRunningRef = useRef(isSentenceAnalysisRunning);
  const flushTimerRef = useRef<number | null>(null);

  /**
   * Schedule a batched sync of sentenceItemsRef.current → React state.
   * Collapses many rapid ref updates into a single setSentenceItems call
   * per animation frame, preventing React's internal update queue from
   * retaining hundreds of intermediate array copies.
   */
  const flushSentenceItemsToState = useCallback(() => {
    if (flushTimerRef.current !== null) return; // already scheduled
    flushTimerRef.current = requestAnimationFrame(() => {
      flushTimerRef.current = null;
      setSentenceItems(sentenceItemsRef.current);
    });
  }, []);
  const analysisLanguageRef = useRef<string | undefined>(undefined);
  const analysisLanguageDetectionPromiseRef =
    useRef<Promise<string | undefined> | null>(null);

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


  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);




  useEffect(() => {
    setCurrentChapterId((prev) => (prev === defaultChapterId ? prev : defaultChapterId));
  }, [defaultChapterId]);

  useEffect(() => {
    resetForBook();
  }, [book.id, resetForBook]);

  const contentRef = useRef<ReaderContentHandle>(null);

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
  const roleplayAnalysisState = useChapterAnalysis(activeChapterId);
  const selectedRoleplayCharacter = useSelectedCharacter(activeChapterId);
  const chatSessionKey =
    activeChapterId && selectedRoleplayCharacter
      ? `${activeChapterId}::${selectedRoleplayCharacter}`
      : null;
  const chatMessages = useChatMessages(chatSessionKey);
  const chatError = useChatError(chatSessionKey);
  useEffect(() => {
    const node = contentRef.current;
    const bookId = book.id;
    const chapterId = currentChapterId;

    if (!bookId || !chapterId) {
      if (node instanceof HTMLDivElement) node.scrollTop = 0;
      setChapterProgress(0);
      return;
    }

    // Reset scroll immediately for fast visual feedback
    if (node instanceof HTMLDivElement) node.scrollTop = 0;
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
          const cur = contentRef.current;
          if (!cancelled && cur instanceof HTMLDivElement) {
            cur.scrollTop = savedOffset;
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

  // Auto-select first character when analysis becomes ready
  useEffect(() => {
    if (activeChapterId) {
      useRoleplayStore.getState().autoSelectFirstCharacter(activeChapterId);
    }
  }, [activeChapterId, roleplayAnalysisState]);

  const {
    isHeaderVisible,
    isFooterVisible,
    handlePointerMove,
    showToolbarsTemporarily,
  } = useReaderToolbarVisibility();

  const analysisParams = useMemo(
    () => ({
      chapterId: activeChapterId,
      bookId: book.id,
      bookTitle: book.title,
      chapterTitle,
      chapterPlainText,
    }),
    [activeChapterId, book.id, book.title, chapterTitle, chapterPlainText]
  );

  // Auto-trigger analysis when chat sidebar is open and chapter changes
  useEffect(() => {
    if (!isChatSidebarOpen || !activeChapterId) return;
    void roleplayActions.ensureAnalysis(analysisParams);
  }, [activeChapterId, isChatSidebarOpen, roleplayActions, analysisParams]);

  const handleOpenChatSidebar = useCallback(() => {
    openChatSidebar();
    setIsTocOpen(false);
    showToolbarsTemporarily(1800);
    onOpenChat?.();
    void roleplayActions.ensureAnalysis(analysisParams);
  }, [roleplayActions, analysisParams, openChatSidebar, onOpenChat, showToolbarsTemporarily]);

  const handleCloseChatSidebar = useCallback(() => {
    closeChatSidebar();
  }, [closeChatSidebar]);

  const handleSelectRoleplayCharacter = useCallback(
    (name: string) => {
      if (!activeChapterId) return;
      roleplayActions.setSelectedCharacter(activeChapterId, name);
    },
    [activeChapterId, roleplayActions]
  );

  const handleRetryRoleplayAnalysis = useCallback(() => {
    void roleplayActions.retryAnalysis(analysisParams);
  }, [roleplayActions, analysisParams]);

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
        (c) => c.name === selectedRoleplayCharacter
      );
      if (!character) return;
      await roleplayActions.sendMessage({
        chatSessionKey,
        character,
        bookTitle: book.title,
        chapterTitle,
        chapterPlainText,
        text,
      });
    },
    [
      selectedRoleplayCharacter,
      chatSessionKey,
      roleplayAnalysisState,
      roleplayActions,
      book.title,
      chapterTitle,
      chapterPlainText,
    ]
  );

  const resetSentenceAnalysisItems = useCallback(() => {
    analysisLanguageRef.current = undefined;
    setSentenceItems(() => {
      sentenceItemsRef.current = [];
      sentenceItemsChapterRef.current = null;
      return [];
    });
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
    showToolbarsTemporarily(1800);
    onOpenSettingsProp?.();
  }, [onOpenSettingsProp, showToolbarsTemporarily]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);



  const handleToggleSentenceAnalysisRunning = useCallback(() => {
    setIsSentenceAnalysisRunning((prev) => {
      const next = !prev;
      if (!next) {
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
  ]);

  useEffect(() => {
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  // NOTE: sentenceItemsRef is now the source of truth.
  // React state (sentenceItems) is synced FROM the ref via flushSentenceItemsToState.
  // No reverse sync needed.

  useEffect(() => {
    analysisRunningRef.current = isSentenceAnalysisRunning;
  }, [isSentenceAnalysisRunning]);

  useEffect(() => {
    analysisLanguageRef.current = undefined;
    chapterGenerationRef.current++;
    clearQueue();
    // Cancel any pending rAF flush from the previous chapter
    if (flushTimerRef.current !== null) {
      cancelAnimationFrame(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, [activeChapterId]);

  const processPendingSentences = useCallback(async () => {
    if (
      readingMode !== "study-double" ||
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
    const myGeneration = chapterGenerationRef.current;

    try {
      await ensureAnalysisLanguageReady();
      if (chapterGenerationRef.current !== myGeneration) return;
      const languageHint = analysisLanguageRef.current;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (!analysisRunningRef.current || chapterGenerationRef.current !== myGeneration) {
          break;
        }

        const nextIdle = sentenceItemsRef.current.find(
          (item) => item.status === "idle"
        );

        if (!nextIdle) {
          break;
        }

        // Mark as "loading" — ref-only (no React state update to avoid queue buildup)
        sentenceItemsRef.current = sentenceItemsRef.current.map((entry) =>
          entry.id === nextIdle.id
            ? { ...entry, status: "loading" as const, error: undefined }
            : entry
        );

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
            sentenceItemsRef.current = sentenceItemsRef.current.map((entry) =>
              entry.id === nextIdle.id
                ? { ...entry, status: "loaded" as const, tokens: cached.tokens, error: undefined }
                : entry
            );
            flushSentenceItemsToState();
            continue;
          }

          const tokens: TokenData[] = await queuedSendTokensRequest(
            nextIdle.text,
            { language: languageHint }
          );

          // Bail out if chapter changed while awaiting API response
          if (chapterGenerationRef.current !== myGeneration) break;

          sentenceItemsRef.current = sentenceItemsRef.current.map((entry) =>
            entry.id === nextIdle.id
              ? { ...entry, status: "loaded" as const, tokens, error: undefined }
              : entry
          );
          flushSentenceItemsToState();

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

          sentenceItemsRef.current = sentenceItemsRef.current.map((entry) =>
            entry.id === nextIdle.id
              ? { ...entry, status: "error" as const, error: message, tokens: undefined }
              : entry
          );
          flushSentenceItemsToState();
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [
    readingMode,
    isSentenceAnalysisRunning,
    activeChapterId,
    book.id,
    ensureAnalysisLanguageReady,
  ]);


  useEffect(() => {
    const normalizedChapterId = activeChapterId ?? null;
    if (readingMode !== "study-double") {
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
      activeChapterId,
      analysisLanguageRef.current
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
  }, [readingMode, chapterContentHtml, activeChapterId, processPendingSentences]);

  useEffect(() => {
    if (isSentenceAnalysisRunning && readingMode === "study-double") {
      void processPendingSentences();
    }
  }, [isSentenceAnalysisRunning, readingMode, processPendingSentences]);

  // Auto-start analysis loop when study-double mode is activated
  useEffect(() => {
    if (readingMode === "study-double" && !analysisRunningRef.current) {
      analysisRunningRef.current = true;
      setIsSentenceAnalysisRunning(true);
    }
  }, [readingMode]);

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

  // Cleanup scroll-save debounce timer on unmount or chapter/book change
  useEffect(() => {
    return () => {
      if (scrollSaveTimerRef.current !== null) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }
    };
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

  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage((prev) => (prev === page ? prev : page));
    setTotalPages((prev) => (prev === total ? prev : total));
  }, []);

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
        isHeaderVisible={isHeaderVisible}
        header={
          <ReaderHeader
            bookTitle={book.title}
            chapterTitle={chapterTitle}
            isVisible={isHeaderVisible}
            onBack={onExitReader}
            onOpenToc={handleOpenToc}
            onOpenChat={handleOpenChatSidebar}
            onOpenSettings={handleOpenSettings}
            isAnalysisRunning={readingMode === "study-double" ? isSentenceAnalysisRunning : undefined}
            onToggleAnalysisRunning={readingMode === "study-double" ? handleToggleSentenceAnalysisRunning : undefined}
          />
        }
        content={
          <ReaderContent
            ref={contentRef}
            chapterTitle={chapterTitle}
            contentHtml={chapterContentHtml}
            cssContent={chapterCssContent}
            onScroll={handleScroll}
            readingMode={readingMode}
            scrollMode={scrollMode}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            onPageChange={handlePageChange}
            studyPanelSentences={readingMode === "study-double" ? sentenceItems : undefined}
            bookId={book.id}
          />
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
            scrollMode={scrollMode}
            currentPage={currentPage}
            totalPages={totalPages}
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
        ttsLanguageOptions={TTS_LANGUAGE_OPTIONS}
      />
    </>
  );
};

export default ReaderPage;
