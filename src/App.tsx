import { useState } from 'react';
import Layout from './components/layout/Layout';
import ReaderPage from './components/reader/ReaderPage';
import { Book, User, NavigationItem, EpubBookData } from './types/types';

// 模拟数据
const mockBooks: Book[] = [
  {
    id: '1',
    title: '很长的书籍名称',
    author: '作者名',
    progress: 45,
    status: 'reading',
    description: '这是一本非常有趣的书籍，讲述了关于编程和生活的故事。',
    addedDate: new Date('2024-01-01'),
    lastReadDate: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: '书名',
    author: '作者名',
    progress: 100,
    status: 'completed',
    description: '一本已经读完的好书。',
    addedDate: new Date('2023-12-01'),
    lastReadDate: new Date('2024-01-10'),
  },
  {
    id: '3',
    title: '新书推荐',
    author: '知名作者',
    progress: 0,
    status: 'not-started',
    description: '一本值得期待的新书。',
    addedDate: new Date('2024-01-20'),
  },
  {
    id: '4',
    title: '技术书籍',
    author: '技术专家',
    progress: 75,
    status: 'reading',
    description: '深入讲解现代软件开发技术。',
    addedDate: new Date('2023-11-15'),
    lastReadDate: new Date('2024-01-18'),
  },
  {
    id: '5',
    title: '文学经典',
    author: '文学大师',
    progress: 30,
    status: 'reading',
    description: '经典的文学作品，值得细细品味。',
    addedDate: new Date('2023-10-01'),
    lastReadDate: new Date('2024-01-12'),
  },
];

const mockUser: User = {
  id: 'user1',
  name: '我的账户',
  email: 'user@example.com',
};

const sortOptions = ['title', 'author', 'progress', 'addedDate'] as const;

export default function App() {
  const [books, setBooks] = useState<Book[]>(mockBooks);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeNav, setActiveNav] = useState<NavigationItem>('bookshelf');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByIndex, setSortByIndex] = useState(0);

  // 响应式状态管理
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsPaneOpen, setIsDetailsPaneOpen] = useState(false);

  // 阅读器状态管理
  const [isReading, setIsReading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [readingProgress, setReadingProgress] = useState(75); // 示例进度

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    // 在移动端选择书籍时自动打开详情面板
    if (window.innerWidth < 768) {
      setIsDetailsPaneOpen(true);
    }
  };

  const handleStartReading = () => {
    if (selectedBook) {
      setIsReading(true);
      setCurrentChapter(0);
    }
  };

  const handleBackToShelf = () => {
    setIsReading(false);
  };

  const handlePreviousChapter = () => {
    setCurrentChapter(prev => Math.max(0, prev - 1));
  };

  const handleNextChapter = () => {
    if (selectedBook?.chapters) {
      setCurrentChapter(prev => Math.min(selectedBook.chapters.length - 1, prev + 1));
    }
  };

  // 模拟章节内容
  const getChapterContent = () => {
    const mockContent = `
      <h1 class="text-4xl font-black mb-6">第一章：冒险的开始</h1>
      <p class="mt-4 mb-4">
        这是一个示例文本，用于填充阅读区域。在这个充满昭和复古气息的世界里，文字也带着一种独特的质感。每一行，每一段，都像是从老式打字机中敲出，带着油墨的香气和时代的印记。
      </p>
      <p class="mt-4 mb-4">
        粗野主义的边框和厚重的阴影，将这片阅读空间牢牢地固定在屏幕上，仿佛一本实体书被摊开在眼前。它的设计语言直接而坦诚，没有任何不必要的装饰，只为内容服务。芥末黄的按钮，砖红色的高亮，都在这米白色的纸张背景上显得格外醒目。
      </p>
      <h2 class="text-3xl font-black mt-8 mb-4">新的发现</h2>
      <p class="mt-4 mb-4">
        当主人公踏上旅途，他发现这个世界并非他想象中那样简单。橄榄绿的森林深处隐藏着秘密，浅灰蓝的天空下飞过不知名的巨鸟。每一个角落都充满了探索的可能。
      </p>
      <p class="mt-4 mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh.
      </p>
    `;
    return mockContent;
  };

  const getCurrentChapterTitle = () => {
    if (selectedBook?.chapters && selectedBook.chapters[currentChapter]) {
      return selectedBook.chapters[currentChapter].title;
    }
    return '第一章：冒险的开始';
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
      chapters: epubData.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        pageNumber: 0, // EPUB没有页码概念
        isRead: false,
        content: chapter.content,
        href: chapter.href,
        order: chapter.order
      })),
      addedDate: epubData.addedDate,
      lastReadDate: undefined,
      filePath: epubData.filePath,
      metadata: epubData.metadata
    };

    setBooks(prevBooks => [...prevBooks, newBook]);
    console.log('新书已添加:', newBook.title);
  };

  const sortBy = sortOptions[sortByIndex];

  // 如果正在阅读，显示阅读器页面
  if (isReading && selectedBook) {
    return (
      <ReaderPage
        bookTitle={selectedBook.title}
        chapterTitle={getCurrentChapterTitle()}
        chapterContent={getChapterContent()}
        progress={readingProgress}
        onBack={handleBackToShelf}
        onPreviousChapter={handlePreviousChapter}
        onNextChapter={handleNextChapter}
        onTableOfContents={() => console.log('目录功能待实现')}
        onSearch={() => console.log('搜索功能待实现')}
        onSettings={() => console.log('设置功能待实现')}
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
      onStartReading={handleStartReading}
    />
  );
}
