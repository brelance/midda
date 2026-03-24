import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import ReaderPage from "./pages/ReaderPage";
import ImageReaderPage from "./pages/ImageReaderPage/ImageReaderPage";
import {
  useBookshelfStore,
  useReaderBook,
  useReaderCallbacks,
} from "./stores/bookshelfStore";
import { initAuthListener, useAuthStore } from "./stores/authStore";

export default function App() {
  const {
    readerInitialChapterId,
    exitReader,
    loadBooks,
    ensureBookChapters,
  } = useBookshelfStore();

  const readerBook = useReaderBook();
  const { handleChapterChange, handleProgressChange } = useReaderCallbacks();

  const loadSession = useAuthStore((s) => s.loadSession);

  // Initialize auth on mount
  useEffect(() => {
    initAuthListener();
    void loadSession();
  }, [loadSession]);

  // Load books on mount
  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  // Eagerly load chapters when a reader book is selected but has none
  // Skip for image-based formats (CBZ/CBR/PDF) which never have chapters
  useEffect(() => {
    const isImageFormat =
      readerBook?.format === "cbz" ||
      readerBook?.format === "cbr" ||
      readerBook?.format === "pdf";
    if (
      readerBook &&
      !isImageFormat &&
      (!readerBook.chapters || readerBook.chapters.length === 0)
    ) {
      void ensureBookChapters(readerBook.id);
    }
  }, [readerBook, ensureBookChapters]);

  if (readerBook) {
    // Image-based formats use a lightweight reader
    const isImageFormat =
      readerBook.format === 'cbz' ||
      readerBook.format === 'cbr' ||
      readerBook.format === 'pdf';

    if (isImageFormat) {
      return (
        <ImageReaderPage
          book={readerBook}
          onExitReader={exitReader}
          onProgressChange={handleProgressChange}
        />
      );
    }

    return (
      <ReaderPage
        book={readerBook}
        initialChapterId={readerInitialChapterId ?? undefined}
        onExitReader={exitReader}
        onOpenToc={() => console.log("打开目录")}
        onOpenChat={() => console.log("打开角色聊天")}
        onOpenSettings={() => console.log("打开设置")}
        onChapterChange={handleChapterChange}
        onProgressChange={handleProgressChange}
      />
    );
  }

  return <Layout />;
}
