import { useCallback, useMemo, useState } from "react";
import Layout from "./components/layout/Layout";
import ReaderPage from "./pages/ReaderPage";
import { Book, User, NavigationItem, EpubBookData } from "./types/types";

const retroChapterContent = [
  `<p>这是一个示例文本，用于填充阅读区域，测试阅读器的排版与滚动性能。每一段文字都携带昭和复古的气息，配合粗野主义的视觉元素，营造出独特的阅读氛围。</p>`,
  `<p>当你滚动页面时，顶部与底部的工具栏会根据鼠标或触摸位置自动出现，让操作既直观又不打扰沉浸式阅读。</p>`,
  `<p>阅读页面未来将接入 EPUB 解析能力，章节内容会动态渲染，高亮、批注与词典功能也已经在路线图上。</p>`,
  `<h2 class="text-3xl font-black mt-10">下一节：粗野主义的魅力</h2>`,
  `<p>厚重的边框、夸张的阴影以及饱和的配色是这种风格的关键词。它们不仅带来了鲜明的视觉层次，同时也让界面操作更加醒目。</p>`,
].join("");

// 模拟数据
const mockBooks: Book[] = [
  {
    id: "1",
    title: "很长的书籍名称",
    author: "作者名",
    progress: 45,
    status: "reading",
    description: "这是一本非常有趣的书籍，讲述了关于编程和生活的故事。",
    chapters: [
      {
        id: "chapter-1",
        title: "第一章：冒险的开始",
        pageNumber: 1,
        isRead: true,
        content: retroChapterContent,
        order: 1,
      },
      {
        id: "chapter-2",
        title: "第二章：昭和风格",
        pageNumber: 2,
        isRead: false,
        content: retroChapterContent,
        order: 2,
      },
      {
        id: "chapter-3",
        title: "第三章：未来展望",
        pageNumber: 3,
        isRead: false,
        content: retroChapterContent,
        order: 3,
      },
    ],
    currentChapterId: "chapter-1",
    lastReadChapterId: "chapter-1",
    addedDate: new Date("2024-01-01"),
    lastReadDate: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "书名",
    author: "作者名",
    progress: 100,
    status: "completed",
    description: "一本已经读完的好书。",
    addedDate: new Date("2023-12-01"),
    lastReadDate: new Date("2024-01-10"),
  },
  {
    id: "3",
    title: "新书推荐",
    author: "知名作者",
    progress: 0,
    status: "not-started",
    description: "一本值得期待的新书。",
    addedDate: new Date("2024-01-20"),
  },
  {
    id: "4",
    title: "技术书籍",
    author: "技术专家",
    progress: 75,
    status: "reading",
    description: "深入讲解现代软件开发技术。",
    addedDate: new Date("2023-11-15"),
    lastReadDate: new Date("2024-01-18"),
  },
  {
    id: "5",
    title: "文学经典",
    author: "文学大师",
    progress: 30,
    status: "reading",
    description: "经典的文学作品，值得细细品味。",
    addedDate: new Date("2023-10-01"),
    lastReadDate: new Date("2024-01-12"),
  },
];

const mockUser: User = {
  id: "user1",
  name: "我的账户",
  email: "user@example.com",
};

const sortOptions = ["title", "author", "progress", "addedDate"] as const;

export default function App() {
  const [books, setBooks] = useState<Book[]>(mockBooks);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeNav, setActiveNav] = useState<NavigationItem>("bookshelf");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByIndex, setSortByIndex] = useState(0);
  const [readerBookId, setReaderBookId] = useState<string | null>(null);

  // 响应式状态管理
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsPaneOpen, setIsDetailsPaneOpen] = useState(false);

  const readerBook = useMemo(
    () => books.find((book) => book.id === readerBookId) ?? null,
    [books, readerBookId]
  );

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

  const handleBookAdded = (epubData: EpubBookData) => {
    // 将EpubBookData转换为Book对象并添加到书籍列表
    const newBook: Book = {
      id: epubData.id,
      title: epubData.title,
      author: epubData.author,
      cover: epubData.cover,
      progress: epubData.progress,
      status: epubData.status,
      description: epubData.metadata.description,
      chapters: epubData.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        pageNumber: 0, // EPUB没有页码概念
        isRead: false,
        content: chapter.content,
        href: chapter.href,
        order: chapter.order,
      })),
      addedDate: epubData.addedDate,
      lastReadDate: undefined,
      filePath: epubData.filePath,
      metadata: epubData.metadata,
    };

    setBooks((prevBooks) => [...prevBooks, newBook]);
    console.log("新书已添加:", newBook.title);
  };

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

  const handleEnterReader = (book: Book) => {
    setReaderBookId(book.id);
    setSelectedBook(book);
    setIsSidebarOpen(false);
    setIsDetailsPaneOpen(false);
  };

  const handleExitReader = () => {
    if (readerBookId) {
      const latest = books.find((book) => book.id === readerBookId) ?? null;
      if (latest) {
        setSelectedBook(latest);
      }
    }
    setReaderBookId(null);
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
    />
  );
}
