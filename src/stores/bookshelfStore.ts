import { useCallback } from "react";
import { create } from "zustand";
import type {
  Book,
  Chapter,
  NavigationItem,
  ImportedBookData,
  BookFormat,
} from "../types/types";
import type {
  LibraryBookRecord,
  LibraryBookUpsertPayload,
  LibraryChapterRecord,
  LibraryChapterUpsertPayload,
} from "../types/database";

// ── Helpers ──

const parseDbTimestamp = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(" ", "T");
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
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
    format: (record.format ?? 'epub') as BookFormat,
    progress: record.progress,
    status: record.status,
    description: record.description ?? undefined,
    chapters: undefined,
    currentChapterId: record.currentChapterId ?? undefined,
    lastReadChapterId: record.lastReadChapterId ?? undefined,
    addedDate,
    lastReadDate,
    filePath: record.filePath,
    totalPages: record.totalPages ?? undefined,
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
  cssContent: record.cssContent ?? undefined,
  href: record.href ?? undefined,
  order: record.orderIndex,
});

const stripChapterContent = (chapters?: Chapter[]) => {
  if (!chapters || chapters.length === 0) return chapters;
  return chapters.map((ch) => ({ ...ch, content: "" }));
};

// ── Sort options ──

export const SORT_OPTIONS = [
  "title",
  "author",
  "progress",
  "addedDate",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// ── Store interface ──

export interface BookshelfState {
  // ── UI state ──
  books: Book[];
  selectedBook: Book | null;
  activeNav: NavigationItem;
  searchQuery: string;
  sortByIndex: number;
  isSidebarOpen: boolean;
  isDetailsPaneOpen: boolean;

  // ── Reader routing state ──
  readerBookId: string | null;
  readerInitialChapterId: string | null;

  // ── Simple setters ──
  setSelectedBook: (book: Book | null) => void;
  setActiveNav: (nav: NavigationItem) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  toggleDetailsPane: () => void;
  closeSidebar: () => void;
  closeDetailsPane: () => void;

  // ── Bookshelf actions ──
  selectBook: (book: Book) => void;
  navChange: (nav: NavigationItem) => void;
  cycleSort: () => void;

  // ── Async / DB actions ──
  loadBooks: () => Promise<void>;
  ensureBookChapters: (bookId: string) => Promise<Chapter[] | undefined>;
  addBook: (bookData: ImportedBookData) => Promise<void>;
  deleteBook: (book: Book) => Promise<void>;

  // ── Reader actions ──
  enterReader: (book: Book, chapterId?: string) => void;
  exitReader: () => void;
  updateBookById: (
    bookId: string,
    updater: (book: Book) => Book
  ) => void;
}

// ── Internal refs (not in state to avoid re-renders) ──
let _progressPersistTimer: ReturnType<typeof setTimeout> | null = null;

export const useBookshelfStore = create<BookshelfState>()((set, get) => ({
  // ── Initial state ──
  books: [],
  selectedBook: null,
  activeNav: "home" as NavigationItem,
  searchQuery: "",
  sortByIndex: 0,
  isSidebarOpen: false,
  isDetailsPaneOpen: false,
  readerBookId: null,
  readerInitialChapterId: null,

  // ── Simple setters ──
  setSelectedBook: (book) => set({ selectedBook: book }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleDetailsPane: () =>
    set((s) => ({ isDetailsPaneOpen: !s.isDetailsPaneOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  closeDetailsPane: () => set({ isDetailsPaneOpen: false }),

  // ── UI actions (with side-effects) ──
  selectBook: (book) => {
    set({ selectedBook: book });
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      set({ isDetailsPaneOpen: true });
    }
  },

  navChange: (nav) => {
    set({ activeNav: nav });
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      set({ isSidebarOpen: false });
    }
  },

  cycleSort: () =>
    set((s) => ({ sortByIndex: (s.sortByIndex + 1) % SORT_OPTIONS.length })),

  // ── Async / DB actions ──
  loadBooks: async () => {
    if (typeof window === "undefined" || !window.api?.db?.books?.getAll) {
      console.warn("数据库 API 未就绪，跳过书籍加载。");
      return;
    }
    try {
      const records = await window.api.db.books.getAll();
      const mapped = records.map(mapDbBookToBook);
      set((s) => ({
        books: mapped,
        selectedBook: s.selectedBook
          ? mapped.find((b) => b.id === s.selectedBook!.id) ?? null
          : null,
        readerBookId: s.readerBookId
          ? mapped.some((b) => b.id === s.readerBookId)
            ? s.readerBookId
            : null
          : null,
      }));
    } catch (error) {
      console.error("加载书籍列表失败:", error);
    }
  },

  ensureBookChapters: async (bookId) => {
    const { books } = get();
    const target = books.find((b) => b.id === bookId);
    if (!target) return undefined;

    const hasLoadedContent =
      target.chapters?.some(
        (ch) => typeof ch.content === "string" && ch.content.length > 0
      ) ?? false;

    if (hasLoadedContent) return target.chapters;

    if (
      typeof window === "undefined" ||
      !window.api?.db?.chapters?.getByBook
    ) {
      return undefined;
    }

    try {
      const chapterRecords = await window.api.db.chapters.getByBook(bookId);
      const chapters = chapterRecords.map(mapDbChapterToChapter);
      set((s) => ({
        books: s.books.map((b) =>
          b.id === bookId ? { ...b, chapters } : b
        ),
        selectedBook:
          s.selectedBook?.id === bookId
            ? { ...s.selectedBook, chapters }
            : s.selectedBook,
      }));
      return chapters;
    } catch (error) {
      console.error(`加载章节失败 (${bookId}):`, error);
      return undefined;
    }
  },

  addBook: async (bookData) => {
    const chapterSummaries = (bookData.chapters ?? []).map((ch) => ({
      id: ch.id,
      title: ch.title,
      pageNumber: 0,
      isRead: false,
      content: "",
      href: ch.href,
      order: ch.order,
    }));

    const newBook: Book = {
      id: bookData.id,
      title: bookData.title,
      author: bookData.author,
      cover: bookData.cover,
      format: bookData.format,
      progress: bookData.progress,
      status: bookData.status,
      description: bookData.metadata.description,
      chapters: chapterSummaries.length > 0 ? chapterSummaries : undefined,
      addedDate: bookData.addedDate,
      lastReadDate: undefined,
      filePath: bookData.filePath,
      metadata: bookData.metadata,
      totalPages: bookData.totalPages,
    };

    const firstChapterId = bookData.chapters?.[0]?.id;

    // Persist to database
    try {
      if (window?.api?.db?.books?.upsert) {
        const bookPayload: LibraryBookUpsertPayload = {
          id: bookData.id,
          title: bookData.title,
          author: bookData.author,
          description: bookData.metadata.description,
          coverPath: bookData.cover,
          filePath: bookData.filePath,
          sourcePath: bookData.metadata.sourcePath,
          format: bookData.format,
          status: bookData.status,
          progress: bookData.progress,
          currentChapterId: firstChapterId,
          lastReadChapterId: firstChapterId,
          totalPages: bookData.totalPages,
          metadataLanguage: bookData.metadata.language,
          metadataPublisher: bookData.metadata.publisher,
          metadataIdentifier: bookData.metadata.identifier,
        };
        await window.api.db.books.upsert(bookPayload);

        // Only persist chapters for EPUB format
        if (bookData.chapters && bookData.chapters.length > 0) {
          const chapterPayloads: LibraryChapterUpsertPayload[] =
            bookData.chapters.map((ch) => ({
              bookId: bookData.id,
              chapterId: ch.id,
              title: ch.title,
              href: ch.href,
              orderIndex: ch.order,
              contentHtml: ch.content,
              cssContent: ch.cssContent ?? undefined,
            }));

          if (chapterPayloads.length > 0) {
            await window.api.db.chapters.bulkUpsert(chapterPayloads);
          }
        }
      } else {
        console.warn("window.api.db 未定义，跳过书籍落库。");
      }
    } catch (error) {
      console.error("持久化书籍数据失败:", error);
      throw error;
    }

    // Update in-memory state
    set((s) => {
      const existingIndex = s.books.findIndex((b) => b.id === newBook.id);
      if (existingIndex >= 0) {
        const next = [...s.books];
        next[existingIndex] = newBook;
        return { books: next };
      }
      return { books: [...s.books, newBook] };
    });
  },

  deleteBook: async (bookToDelete) => {
    if (typeof window === "undefined" || !window.api?.db?.books?.delete) {
      console.warn("数据库 API 未就绪，无法删除书籍。");
      return;
    }

    try {
      const deleted = await window.api.db.books.delete(bookToDelete.id);
      if (!deleted) throw new Error("书籍删除未生效");

      const chaptersDeletion = window.api.db.chapters?.deleteByBook
        ? window.api.db.chapters.deleteByBook(bookToDelete.id)
        : Promise.resolve(false);

      const removeFile = window.api.epub?.removeFromLibrary
        ? window.api.epub.removeFromLibrary(bookToDelete.id)
        : Promise.resolve(false);

      await Promise.all([chaptersDeletion, removeFile]);

      set((s) => {
        const isCurrentlySelected = s.selectedBook?.id === bookToDelete.id;
        return {
          books: s.books.filter((b) => b.id !== bookToDelete.id),
          selectedBook: isCurrentlySelected ? null : s.selectedBook,
          readerBookId:
            s.readerBookId === bookToDelete.id ? null : s.readerBookId,
          isDetailsPaneOpen: isCurrentlySelected
            ? false
            : s.isDetailsPaneOpen,
        };
      });
    } catch (error) {
      console.error("删除书籍失败:", error);
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert("删除书籍失败，请稍后重试");
      }
    }
  },

  // ── Reader routing ──
  enterReader: (book, chapterId) => {
    const { ensureBookChapters } = get();
    void (async () => {
      const loadedChapters =
        (await ensureBookChapters(book.id)) ?? book.chapters ?? [];
      const fallbackChapterId =
        chapterId ??
        book.currentChapterId ??
        book.lastReadChapterId ??
        loadedChapters[0]?.id ??
        null;
      set({
        readerBookId: book.id,
        readerInitialChapterId: fallbackChapterId,
        selectedBook: book,
        isSidebarOpen: false,
        isDetailsPaneOpen: false,
      });
    })();
  },

  exitReader: () => {
    const { readerBookId } = get();
    if (readerBookId) {
      set((s) => ({
        books: s.books.map((b) =>
          b.id === readerBookId
            ? { ...b, chapters: stripChapterContent(b.chapters) }
            : b
        ),
        selectedBook:
          s.selectedBook?.id === readerBookId
            ? {
                ...s.selectedBook,
                chapters: stripChapterContent(s.selectedBook.chapters),
              }
            : s.selectedBook,
      }));
    }
    set({ readerBookId: null, readerInitialChapterId: null });
  },

  updateBookById: (bookId, updater) => {
    let updated: Book | null = null;
    set((s) => ({
      books: s.books.map((b) => {
        if (b.id === bookId) {
          const next = updater(b);
          updated = next;
          return next;
        }
        return b;
      }),
      selectedBook: updated ?? s.selectedBook,
    }));
  },
}));

// ── Derived selectors (reactive, unlike ES5 getters) ──

export function useReaderBook(): Book | null {
  return useBookshelfStore((s) =>
    s.readerBookId
      ? s.books.find((b) => b.id === s.readerBookId) ?? null
      : null
  );
}

export function useSortBy(): SortOption {
  return useBookshelfStore((s) => SORT_OPTIONS[s.sortByIndex]);
}

// ── Derived hooks for reader callbacks (used by App.tsx) ──

export function useReaderCallbacks() {
  const handleChapterChange = useCallback((chapterId: string) => {
    const { readerBookId, updateBookById, books } =
      useBookshelfStore.getState();
    if (!readerBookId) return;
    updateBookById(readerBookId, (book) => ({
      ...book,
      currentChapterId: chapterId,
      lastReadChapterId: chapterId,
      lastReadDate: new Date(),
    }));
    if (window?.api?.db?.books?.upsert) {
      const bookTarget = books.find((b) => b.id === readerBookId);
      if (bookTarget) {
        void window.api.db.books
          .upsert({
            id: readerBookId,
            title: bookTarget.title,
            filePath: bookTarget.filePath ?? "",
            currentChapterId: chapterId,
            lastReadChapterId: chapterId,
            status: bookTarget.status,
            progress: bookTarget.progress,
          })
          .catch((err) => console.error("持久化章节失败:", err));
      }
    }
  }, []);

  const handleProgressChange = useCallback((progress: number) => {
    const { readerBookId, updateBookById } = useBookshelfStore.getState();
    if (!readerBookId) return;
    const normalized = Math.min(
      100,
      Math.max(0, Number(progress.toFixed(1)))
    );
    const nextStatus = normalized >= 100 ? "completed" : "reading";
    updateBookById(readerBookId, (book) => ({
      ...book,
      progress: normalized,
      status: nextStatus,
    }));
    if (_progressPersistTimer !== null) {
      clearTimeout(_progressPersistTimer);
    }
    _progressPersistTimer = setTimeout(() => {
      _progressPersistTimer = null;
      if (!window?.api?.db?.books?.upsert) return;
      const { books } = useBookshelfStore.getState();
      const bookTarget = books.find((b) => b.id === readerBookId);
      if (!bookTarget) return;
      void window.api.db.books
        .upsert({
          id: readerBookId,
          title: bookTarget.title,
          filePath: bookTarget.filePath ?? "",
          progress: normalized,
          status: nextStatus,
        })
        .catch((err) => console.error("持久化阅读进度失败:", err));
    }, 400);
  }, []);

  return { handleChapterChange, handleProgressChange };
}
