import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import ReaderPage from "./pages/ReaderPage";
import { User } from "./types/types";
import {
  useBookshelfStore,
  useReaderBook,
  useReaderCallbacks,
} from "./stores/bookshelfStore";

const mockUser: User = {
  id: "user1",
  name: "我的账户",
  email: "user@example.com",
};

export default function App() {
  const {
    readerInitialChapterId,
    exitReader,
    loadBooks,
    ensureBookChapters,
  } = useBookshelfStore();

  const readerBook = useReaderBook();

  const { handleChapterChange, handleProgressChange } = useReaderCallbacks();

  // Load books on mount
  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  // Eagerly load chapters when a reader book is selected but has none
  useEffect(() => {
    if (
      readerBook &&
      (!readerBook.chapters || readerBook.chapters.length === 0)
    ) {
      void ensureBookChapters(readerBook.id);
    }
  }, [readerBook, ensureBookChapters]);

  if (readerBook) {
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

  return <Layout user={mockUser} />;
}
