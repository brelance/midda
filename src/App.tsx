import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "./components/layout/Layout";
import ReaderPage from "./pages/ReaderPage";
import { Book, User, NavigationItem, EpubBookData, Chapter } from "./types/types";
import {
  LibraryBookRecord,
  LibraryBookUpsertPayload,
  LibraryChapterRecord,
  LibraryChapterUpsertPayload,
} from "./types/database";

const mockUser: User = {
  id: "user1",
  name: "我的账户",
  email: "user@example.com",
};

const parseDbTimestamp = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(" ", "T");
  const hasTimezone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(normalized);
  const withTimezone = hasTimezone ? normalized : `${normalized}Z`;
  const parsed = new Date(withTimezone);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const mapDbBookToBook = (record: LibraryBookRecord): Book => {
  const addedDate = parseDbTimestamp(record.addedAt) ?? new Date();
  const lastReadDate = record.lastReadChapterId
    ? parseDbTimestamp(record.updatedAt)
    : undefined;

  return {
    id: record.id,
    title: record.title,
    author: record.author ?? "未知作者",
    cover: record.coverPath ?? undefined,
    progress: record.progress,
    status: record.status,
    description: record.description ?? undefined,
    chapters: undefined,
    currentChapterId: record.currentChapterId ?? undefined,
    lastReadChapterId: record.lastReadChapterId ?? undefined,
    addedDate,
    lastReadDate,
    filePath: record.filePath,
    metadata: {
      title: record.title,
      creator: record.author ?? "未知作者",
      description: record.description ?? undefined,
      language: record.metadataLanguage ?? "unknown",
      publisher: record.metadataPublisher ?? undefined,
      identifier: record.metadataIdentifier ?? record.id,
      sourcePath: record.sourcePath ?? undefined,
    },
  };
};

const mapDbChapterToChapter = (record: LibraryChapterRecord): Chapter => ({
  id: record.chapterId,
  title: record.title ?? `章节 ${record.orderIndex + 1}`,
  pageNumber: 0,
  isRead: record.isRead,
  content: record.contentHtml ?? "",
  href: record.href ?? undefined,
  order: record.orderIndex,
});

const stripChapterContent = (chapters?: Chapter[]) => {
  if (!chapters || chapters.length === 0) {
    return chapters;
  }
  return chapters.map((chapter) => ({
    ...chapter,
    content: "",
  }));
};

const sortOptions = ["title", "author", "progress", "addedDate"] as const;

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeNav, setActiveNav] = useState<NavigationItem>("bookshelf");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByIndex, setSortByIndex] = useState(0);
  const [readerBookId, setReaderBookId] = useState<string | null>(null);
  const [readerInitialChapterId, setReaderInitialChapterId] = useState<
    string | null
  >(null);

  // 响应式状态管理
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsPaneOpen, setIsDetailsPaneOpen] = useState(false);

  const ensureBookChapters = useCallback(
    async (bookId: string): Promise<Chapter[] | undefined> => {
      const target = books.find((item) => item.id === bookId);
      const hasLoadedContent =
        target?.chapters?.some(
          (chapter) =>
            typeof chapter.content === "string" && chapter.content.length > 0
        ) ?? false;

      if (!target) {
        return undefined;
      }

      if (hasLoadedContent) {
        return target.chapters;
      }

      if (typeof window === "undefined" || !window.api?.db?.chapters?.getByBook) {
        return undefined;
      }

      try {
        const chapterRecords = await window.api.db.chapters.getByBook(bookId);
        const chapters = chapterRecords.map(mapDbChapterToChapter);
        setBooks((prev) =>
          prev.map((item) =>
            item.id === bookId ? { ...item, chapters } : item
          )
        );
        setSelectedBook((prev) =>
          prev && prev.id === bookId ? { ...prev, chapters } : prev
        );
        return chapters;
      } catch (error) {
        console.error(`加载章节失败 (${bookId}):`, error);
        return undefined;
      }
    },
    [books]
  );

  const readerBook = useMemo(
    () => books.find((book) => book.id === readerBookId) ?? null,
    [books, readerBookId]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    const loadBooks = async () => {
      if (!window.api?.db?.books?.getAll) {
        console.warn("数据库 API 未就绪，跳过书籍加载。");
        return;
      }
      try {
        const records = await window.api.db.books.getAll();
        if (cancelled) {
          return;
        }
        const mapped = records.map(mapDbBookToBook);
        setBooks(mapped);
        setSelectedBook((prev) => {
          if (!prev) return prev;
          const next = mapped.find((item) => item.id === prev.id);
          return next ?? null;
        });
        setReaderBookId((prev) => {
          if (!prev) return null;
          const exists = mapped.some((item) => item.id === prev);
          return exists ? prev : null;
        });
      } catch (error) {
        console.error("加载书籍列表失败:", error);
      }
    };
    void loadBooks();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (readerBook && (!readerBook.chapters || readerBook.chapters.length === 0)) {
      void ensureBookChapters(readerBook.id);
    }
  }, [readerBook, ensureBookChapters]);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    // 在移动端和平板端选择书籍时自动打开详情面板
    if (window.innerWidth < 1024) {
      setIsDetailsPaneOpen(true);
    }
  };

  const handleNavChange = (nav: NavigationItem) => {
    setActiveNav(nav);
    console.log(`导航到: ${nav}`);
    // 在移动端导航后关闭侧边栏
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSort = () => {
    setSortByIndex((prev) => (prev + 1) % sortOptions.length);
    console.log(`排序方式: ${sortOptions[sortByIndex]}`);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDetailsPane = () => {
    setIsDetailsPaneOpen(!isDetailsPaneOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const closeDetailsPane = () => {
    setIsDetailsPaneOpen(false);
  };

  const handleBookAdded = useCallback(
    async (epubData: EpubBookData) => {
      // 将EpubBookData转换为Book对象并添加到书籍列表
      const chapterSummaries = epubData.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        pageNumber: 0, // EPUB没有页码概念
        isRead: false,
        content: "", // drop heavy HTML content in memory; stored in DB instead
        href: chapter.href,
        order: chapter.order,
      }));

      const newBook: Book = {
        id: epubData.id,
        title: epubData.title,
        author: epubData.author,
        cover: epubData.cover,
        progress: epubData.progress,
        status: epubData.status,
        description: epubData.metadata.description,
        chapters: chapterSummaries,
        addedDate: epubData.addedDate,
        lastReadDate: undefined,
        filePath: epubData.filePath,
        metadata: epubData.metadata,
      };

      const firstChapterId = epubData.chapters[0]?.id;

      try {
        if (window?.api?.db?.books?.upsert) {
          const bookPayload: LibraryBookUpsertPayload = {
            id: epubData.id,
            title: epubData.title,
            author: epubData.author,
            description: epubData.metadata.description,
            coverPath: epubData.cover,
            filePath: epubData.filePath,
            sourcePath: epubData.metadata.sourcePath,
            status: epubData.status,
            progress: epubData.progress,
            currentChapterId: firstChapterId,
            lastReadChapterId: firstChapterId,
            metadataLanguage: epubData.metadata.language,
            metadataPublisher: epubData.metadata.publisher,
            metadataIdentifier: epubData.metadata.identifier,
          };

          await window.api.db.books.upsert(bookPayload);

          const chapterPayloads: LibraryChapterUpsertPayload[] =
            epubData.chapters.map((chapter) => ({
              bookId: epubData.id,
              chapterId: chapter.id,
              title: chapter.title,
              href: chapter.href,
              orderIndex: chapter.order,
              contentHtml: chapter.content,
            }));

          if (chapterPayloads.length > 0) {
            await window.api.db.chapters.bulkUpsert(chapterPayloads);
          }
        } else {
          console.warn("window.api.db 未定义，跳过书籍落库。");
        }
      } catch (error) {
        console.error("持久化书籍数据失败:", error);
        throw error;
      }

      setBooks((prevBooks) => {
        const existingIndex = prevBooks.findIndex((item) => item.id === newBook.id);
        if (existingIndex >= 0) {
          const next = [...prevBooks];
          next[existingIndex] = newBook;
          return next;
        }
        return [...prevBooks, newBook];
      });
      console.log("新书已添加:", newBook.title);
    },
    []
  );

  const handleDeleteBook = useCallback(
    async (bookToDelete: Book) => {
      if (typeof window === "undefined" || !window.api?.db?.books?.delete) {
        console.warn("数据库 API 未就绪，无法删除书籍。");
        return;
      }

      try {
        const deleted = await window.api.db.books.delete(bookToDelete.id);
        if (!deleted) {
          throw new Error("书籍删除未生效");
        }

        const chaptersDeletion = window.api.db.chapters?.deleteByBook
          ? window.api.db.chapters.deleteByBook(bookToDelete.id)
          : Promise.resolve(false);

        const removeFile = window.api.epub?.removeFromLibrary
          ? window.api.epub.removeFromLibrary(bookToDelete.id)
          : Promise.resolve(false);

        await Promise.all([chaptersDeletion, removeFile]);

        const isCurrentlySelected = selectedBook?.id === bookToDelete.id;

        setBooks((prevBooks) =>
          prevBooks.filter((book) => book.id !== bookToDelete.id)
        );

        setSelectedBook((prevSelected) =>
          prevSelected?.id === bookToDelete.id ? null : prevSelected
        );

        setReaderBookId((prevReaderId) =>
          prevReaderId === bookToDelete.id ? null : prevReaderId
        );

        if (isCurrentlySelected) {
          setIsDetailsPaneOpen(false);
        }

      } catch (error) {
        console.error("删除书籍失败:", error);
        if (
          typeof window !== "undefined" &&
          typeof window.alert === "function"
        ) {
          window.alert("删除书籍失败，请稍后重试");
        }
      }
    },
    [selectedBook?.id]
  );

  const updateBookById = useCallback(
    (bookId: string, updater: (book: Book) => Book) => {
      let updated: Book | null = null;
      setBooks((prevBooks) =>
        prevBooks.map((book) => {
          if (book.id === bookId) {
            const nextBook = updater(book);
            updated = nextBook;
            return nextBook;
          }
          return book;
        })
      );
      if (updated) {
        setSelectedBook(updated);
      }
    },
    []
  );

  const handleEnterReader = (book: Book, chapterId?: string) => {
    void (async () => {
      const loadedChapters =
        (await ensureBookChapters(book.id)) ??
        book.chapters ??
        [];
      const fallbackChapterId =
        chapterId ??
        book.currentChapterId ??
        book.lastReadChapterId ??
        loadedChapters[0]?.id ??
        null;
      setReaderBookId(book.id);
      setReaderInitialChapterId(fallbackChapterId);
      setSelectedBook(book);
      setIsSidebarOpen(false);
      setIsDetailsPaneOpen(false);
    })();
  };

  const handleExitReader = () => {
    if (readerBookId) {
      setBooks((prev) =>
        prev.map((book) =>
          book.id === readerBookId
            ? { ...book, chapters: stripChapterContent(book.chapters) }
            : book
        )
      );
      setSelectedBook((prev) =>
        prev && prev.id === readerBookId
          ? { ...prev, chapters: stripChapterContent(prev.chapters) }
          : prev
      );
    }
    setReaderBookId(null);
    setReaderInitialChapterId(null);
  };

  const handleReaderChapterChange = useCallback(
    (chapterId: string) => {
      if (!readerBookId) return;
      updateBookById(readerBookId, (book) => ({
        ...book,
        currentChapterId: chapterId,
        lastReadChapterId: chapterId,
        lastReadDate: new Date(),
      }));
    },
    [readerBookId, updateBookById]
  );

  const handleReaderProgressChange = useCallback(
    (progress: number) => {
      if (!readerBookId) return;
      const normalized = Math.min(100, Math.max(0, Number(progress.toFixed(1))));
      updateBookById(readerBookId, (book) => ({
        ...book,
        progress: normalized,
        status: normalized >= 100 ? "completed" : "reading",
      }));
    },
    [readerBookId, updateBookById]
  );

  const sortBy = sortOptions[sortByIndex];

  if (readerBook) {
    return (
      <ReaderPage
        book={readerBook}
        initialChapterId={readerInitialChapterId ?? undefined}
        onExitReader={handleExitReader}
        onOpenToc={() => console.log("打开目录")}
        onOpenSearch={() => console.log("打开搜索")}
        onOpenSettings={() => console.log("打开设置")}
        onChapterChange={handleReaderChapterChange}
        onProgressChange={handleReaderProgressChange}
      />
    );
  }

  return (
    <Layout
      books={books}
      user={mockUser}
      selectedBook={selectedBook}
      activeNav={activeNav}
      searchQuery={searchQuery}
      sortBy={sortBy}
      isSidebarOpen={isSidebarOpen}
      isDetailsPaneOpen={isDetailsPaneOpen}
      onSelectBook={handleSelectBook}
      onNavChange={handleNavChange}
      onSearch={handleSearch}
      onSort={handleSort}
      toggleSidebar={toggleSidebar}
      toggleDetailsPane={toggleDetailsPane}
      closeSidebar={closeSidebar}
      closeDetailsPane={closeDetailsPane}
      onBookAdded={handleBookAdded}
      onEnterReader={handleEnterReader}
      onDeleteBook={handleDeleteBook}
    />
  );
}
