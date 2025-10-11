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
import { Book, Chapter } from "../../types/types";
import { ReadingMode } from "../../types/reader";
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

const ReaderPage: React.FC<ReaderPageProps> = ({
  book,
  initialChapterId,
  onExitReader,
  onOpenToc,
  onOpenSearch,
  onOpenSettings,
  onChapterChange,
  onProgressChange,
}) => {
  const chapters: Chapter[] = useMemo(() => book.chapters ?? [], [book]);

  const defaultChapterId = useMemo(() => {
    if (initialChapterId && chapters.some((item) => item.id === initialChapterId)) {
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
  }, [book.currentChapterId, book.lastReadChapterId, chapters, initialChapterId]);

  const [currentChapterId, setCurrentChapterId] = useState(defaultChapterId);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [readingMode, setReadingMode] = useState<ReadingMode>("single");

  useEffect(() => {
    setCurrentChapterId(defaultChapterId);
  }, [defaultChapterId]);

  const contentRef = useRef<HTMLDivElement>(null);

  const currentIndex = useMemo(
    () => findChapterIndex(chapters, currentChapterId),
    [chapters, currentChapterId]
  );
  const currentChapter =
    currentIndex >= 0 && chapters[currentIndex]
      ? chapters[currentIndex]
      : null;

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

  useEffect(() => {
    showToolbarsTemporarily(1800);
  }, [showToolbarsTemporarily]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const progress = calculateScrollProgress(target);
      setChapterProgress(progress);
    },
    []
  );

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
    onToggleToc: onOpenToc,
    enabled: totalChapters > 0,
  });

  const chapterTitle = currentChapter?.title ?? "章节内容";
  const chapterContentHtml =
    currentChapter?.content ?? buildFallbackContent();

  return (
    <ReaderLayout
      header={
        <ReaderHeader
          bookTitle={book.title}
          chapterTitle={chapterTitle}
          isVisible={isHeaderVisible}
          onBack={onExitReader}
          onOpenToc={onOpenToc ?? (() => undefined)}
          onOpenSearch={onOpenSearch}
          onOpenSettings={onOpenSettings}
          onToggleReadingMode={toggleReadingMode}
          readingMode={readingMode}
        />
      }
      content={
        <ReaderContent
          ref={contentRef}
          chapterTitle={chapterTitle}
          contentHtml={chapterContentHtml}
          onScroll={handleScroll}
          readingMode={readingMode}
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
        />
      }
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
    />
  );
};

export default ReaderPage;
