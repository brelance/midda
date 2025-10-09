import { useState } from 'react';
import Layout from './components/layout/Layout';
import ReaderPage from './components/reader/ReaderPage';
import { Book, User, NavigationItem, EpubBookData } from './types/types';

// 模拟数据
const mockBooks: Book[] = [
  {
    id: '1',
    title: 'JavaScript高级程序设计',
    author: 'Nicholas C. Zakas',
    progress: 45,
    status: 'reading',
    description: '全面深入地介绍了JavaScript语言的核心概念、高级特性和最佳实践。',
    addedDate: new Date('2024-01-01'),
    lastReadDate: new Date('2024-01-15'),
    chapters: [
      {
        id: 'ch1',
        title: '第1章：什么是JavaScript',
        pageNumber: 0,
        isRead: true,
        order: 0,
        href: 'chapter1.html'
      },
      {
        id: 'ch2',
        title: '第2章：在HTML中使用JavaScript',
        pageNumber: 0,
        isRead: true,
        order: 1,
        href: 'chapter2.html'
      },
      {
        id: 'ch3',
        title: '第3章：语言基础',
        pageNumber: 0,
        isRead: false,
        order: 2,
        href: 'chapter3.html'
      },
      {
        id: 'ch4',
        title: '第4章：变量、作用域与内存',
        pageNumber: 0,
        isRead: false,
        order: 3,
        href: 'chapter4.html'
      },
      {
        id: 'ch5',
        title: '第5章：引用类型',
        pageNumber: 0,
        isRead: false,
        order: 4,
        href: 'chapter5.html'
      }
    ],
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjVGNUVCIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjQiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI2MCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxOCIgZmlsbD0iYmxhY2siPkphdmFTY3JpcHQ8L3RleHQ+Cjx0ZXh0IHg9IjEwMCIgeT0iMTA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxNCIgZmlsbD0iYmxhY2siPuafpeivojx0ZXh0IHg9IjEwMCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiI+5YiY6K2m6ICDPC90ZXh0Pgo8dGV4dCB4PSIxMDAiIHk9IjE1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTk5OTkiPk5pY2hvbGFzIENYWthczwvdGV4dD4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iMjAwIiByPSIzMCIgZmlsbD0iI0Q0QTAxNyIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMjA4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiPjIwMjM8L3RleHQ+Cjwvc3ZnPg=='
  },
  {
    id: '2',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    progress: 100,
    status: 'completed',
    description: '从石器时代到21世纪，重新审视人类发展的历史进程。',
    addedDate: new Date('2023-12-01'),
    lastReadDate: new Date('2024-01-10'),
    chapters: [
      {
        id: 'ch1',
        title: '第1章：认知革命',
        pageNumber: 0,
        isRead: true,
        order: 0,
        href: 'chapter1.html'
      },
      {
        id: 'ch2',
        title: '第2章：农业革命',
        pageNumber: 0,
        isRead: true,
        order: 1,
        href: 'chapter2.html'
      },
      {
        id: 'ch3',
        title: '第3章：人类的融合统一',
        pageNumber: 0,
        isRead: true,
        order: 2,
        href: 'chapter3.html'
      },
      {
        id: 'ch4',
        title: '第4章：科学革命',
        pageNumber: 0,
        isRead: true,
        order: 3,
        href: 'chapter4.html'
      }
    ],
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRThGMjU1IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjQiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI2MCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxOCIgZmlsbD0iYmxhY2siPuWNoei0peWIqzwvdGV4dD4KPHRleHQgeD0iMTAwIiB5PSIxMDUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2Ij7lrqHmiLzlm63lrqQ8L3RleHQ+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OTk5OSI+5YWI5a2m5Zue6L655b2VPC90ZXh0Pgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIyMDAiIHI9IjMwIiBmaWxsPSIjRTgyNTU1IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPHRleHQgeD0iMTAwIiB5PSIyMDgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSI+MjAxNDwvdGV4dD4KPC9zdmc+'
  },
  {
    id: '3',
    title: '三体',
    author: '刘慈欣',
    progress: 0,
    status: 'not-started',
    description: '中国科幻巨作，探讨宇宙文明的生存法则。',
    addedDate: new Date('2024-01-20'),
    chapters: [
      {
        id: 'ch1',
        title: '第1章：科学边界',
        pageNumber: 0,
        isRead: false,
        order: 0,
        href: 'chapter1.html'
      },
      {
        id: 'ch2',
        title: '第2章：台球',
        pageNumber: 0,
        isRead: false,
        order: 1,
        href: 'chapter2.html'
      },
      {
        id: 'ch3',
        title: '第3章：射手和农场主',
        pageNumber: 0,
        isRead: false,
        order: 2,
        href: 'chapter3.html'
      },
      {
        id: 'ch4',
        title: '第4章：三体、周文王、长夜',
        pageNumber: 0,
        isRead: false,
        order: 3,
        href: 'chapter4.html'
      },
      {
        id: 'ch5',
        title: '第5章：叶文洁',
        pageNumber: 0,
        isRead: false,
        order: 4,
        href: 'chapter5.html'
      }
    ],
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMUIzQTYiIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjQiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI2MCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIyNCIgZmlsbD0iYmxhY2siPumHkeWPrzwvdGV4dD4KPGNpcmNsZSBjeD0iNTAiIGN5PSIxNDAiIHI9IjIwIiBmaWxsPSIjRjZGNUQyIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTQwIiByPSIyMCIgZmlsbD0iIzQ1QjdENyIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjE4MCIgcj0iMjAiIGZpbGw9IiNDNkE2MjIiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiPuWNoeS9v+eUqOWInzwvdGV4dD4KPC9zdmc+'
  },
  {
    id: '4',
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    progress: 75,
    status: 'reading',
    description: '从程序员的视角深入理解计算机系统的本质。',
    addedDate: new Date('2023-11-15'),
    lastReadDate: new Date('2024-01-18'),
    chapters: [
      {
        id: 'ch1',
        title: '第1章：计算机系统漫游',
        pageNumber: 0,
        isRead: true,
        order: 0,
        href: 'chapter1.html'
      },
      {
        id: 'ch2',
        title: '第2章：信息的表示和处理',
        pageNumber: 0,
        isRead: true,
        order: 1,
        href: 'chapter2.html'
      },
      {
        id: 'ch3',
        title: '第3章：程序的机器级表示',
        pageNumber: 0,
        isRead: true,
        order: 2,
        href: 'chapter3.html'
      },
      {
        id: 'ch4',
        title: '第4章：处理器体系结构',
        pageNumber: 0,
        isRead: false,
        order: 3,
        href: 'chapter4.html'
      }
    ],
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMzc0MUE0IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjQiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI2MCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxNCIgZmlsbD0iYmxhY2siPuS9v+eUqOaIquWKoOS4gOS4muW7uuWIqzwvdGV4dD4KPHRleHQgeD0iMTAwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjY2NjYiPuaIkeacm++8iOWPkeWPrzwvdGV4dD4KPHJlY3QgeD0iMjAiIHk9IjEwMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSI4MCIgZmlsbD0iI0Y1RjVGNSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTQ0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEwIiBmaWxsPSJibGFjayI+U1lTVEVNUzwvdGV4dD4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iMjAwIiByPSIzMCIgZmlsbD0iIzM3NDFBNCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMjA4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiPjIwMTY8L3RleHQ+Cjwvc3ZnPg=='
  },
  {
    id: '5',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    progress: 30,
    status: 'reading',
    description: '魔幻现实主义文学的经典之作，讲述布恩迪亚家族七代人的传奇故事。',
    addedDate: new Date('2023-10-01'),
    lastReadDate: new Date('2024-01-12'),
    chapters: [
      {
        id: 'ch1',
        title: '第1章：多年以后',
        pageNumber: 0,
        isRead: true,
        order: 0,
        href: 'chapter1.html'
      },
      {
        id: 'ch2',
        title: '第2章：马孔多的建立',
        pageNumber: 0,
        isRead: false,
        order: 1,
        href: 'chapter2.html'
      },
      {
        id: 'ch3',
        title: '第3章：吉普赛人的到来',
        pageNumber: 0,
        isRead: false,
        order: 2,
        href: 'chapter3.html'
      }
    ],
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjODc0RTQxIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjQiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI2MCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIyMCIgZmlsbD0iYmxhY2siPuaVsOWtl+W7uuWIqzwvdGV4dD4KPHRleHQgeD0iMTAwIiB5PSIxMDUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2Ij7mnJ/liqnjgII8L3RleHQ+CjxjaXJjbGUgY3g9IjYwIiBjeT0iMTYwIiByPSIxNSIgZmlsbD0iI0Q0QTAxNyIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjE2MCIgcj0iMTUiIGZpbGw9IiM4MDgwMDAiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNDAiIGN5PSIxNjAiIHI9IjE1IiBmaWxsPSIjQjgzMTJDIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPHRleHQgeD0iMTAwIiB5PSIyMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2NjY2Ij7lrqHmnK/mnL8xOTY3LjIwMjQ8L3RleHQ+Cjwvc3ZnPg=='
  }
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

  const handleStartReading = (book: Book) => {
    setSelectedBook(book);
    setIsReading(true);
    setCurrentChapter(0);
    setReadingProgress(book.progress);
    setIsDetailsPaneOpen(false);
    setIsSidebarOpen(false);
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
      // 更新阅读进度
      const newProgress = ((currentChapter + 1) / selectedBook.chapters.length) * 100;
      setReadingProgress(newProgress);
    }
  };

  // 根据书籍和章节获取内容
  const getChapterContent = () => {
    if (!selectedBook || !selectedBook.chapters || !selectedBook.chapters[currentChapter]) {
      return '<p class="text-center mt-8">章节内容加载中...</p>';
    }

    const chapterTitle = selectedBook.chapters[currentChapter].title;
    const bookId = selectedBook.id;

    // 根据不同书籍生成不同的内容
    const contentMap: { [key: string]: string } = {
      '1': getJavaScriptContent(chapterTitle),
      '2': getHistoryContent(chapterTitle),
      '3': getSciFiContent(chapterTitle),
      '4': getCSContent(chapterTitle),
      '5': getLiteratureContent(chapterTitle),
    };

    return contentMap[bookId] || '<p class="text-center mt-8">章节内容暂未加载</p>';
  };

  // JavaScript 书籍内容
  const getJavaScriptContent = (chapterTitle: string) => {
    const chapterContents: { [key: string]: string } = {
      '第1章：什么是JavaScript': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">JavaScript诞生于1995年，最初是为了处理输入验证操作。如今，它已经成为一门功能全面的编程语言，能够处理复杂的计算和交互。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">JavaScript的诞生</h2>
        <p class="text-base mb-4">在JavaScript问世之前，必须把表单数据发送到服务器端才能确定用户是否没有填写某个必填域，或者输入的值是否有效。Netscape Navigator希望通过JavaScript解决这个问题。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">JavaScript的演进</h2>
        <p class="text-base mb-4">在JavaScript诞生后的几年里，其主要应用目标仅仅是避免不必要的服务器请求以及处理页面上的简单输入验证。JavaScript很快成为了浏览器功能的增强剂。</p>
        <p class="text-base mb-4">到了2003年，浏览器战争结束，微软的IE浏览器占据了绝对主导地位。这时，很多人认为JavaScript已经走到了尽头，没有人再愿意花时间改进这门语言。</p>
        <p class="text-base mb-4">然而，2004年，Mozilla发布了Firefox浏览器，重新点燃了浏览器竞争的火焰。随后的几年里，JavaScript的发展势头迅猛，各种新特性不断涌现。</p>
      `,
      '第2章：在HTML中使用JavaScript': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">JavaScript可以直接嵌入HTML页面中，也可以通过外部脚本文件的方式引入。理解JavaScript在HTML中的使用方式是学习JavaScript的第一步。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">&lt;script&gt;元素</h2>
        <p class="text-base mb-4">在HTML中插入JavaScript的主要方法就是使用&lt;script&gt;元素。HTML 4.01为&lt;script&gt;定义了6个属性：</p>
        <ul class="list-disc list-inside text-base mb-4">
          <li><strong>async</strong>：可选。表示应该立即下载脚本，但不应妨碍页面中的其他操作。</li>
          <li><strong>charset</strong>：可选。表示通过src属性指定的代码的字符集。</li>
          <li><strong>defer</strong>：可选。表示脚本可以延迟到文档完全被解析和显示之后再执行。</li>
          <li><strong>src</strong>：可选。表示包含要执行代码的外部文件。</li>
          <li><strong>type</strong>：可选。可以看成是language的替代属性。</li>
          <li><strong>language</strong>：已废弃。</li>
        </ul>
        <h2 class="text-3xl font-black mt-8 mb-4">脚本加载顺序</h2>
        <p class="text-base mb-4">浏览器在解析HTML文档时，遇到&lt;script&gt;元素会暂停文档解析，转而下载和执行脚本。这个过程可能会影响页面加载性能。</p>
      `,
      '第3章：语言基础': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">JavaScript的语法大量借鉴了C及其他类C语言（如Java和Perl）的语法。因此，熟悉这些语言的开发人员在接受JavaScript更加宽松的语法时，一定会有一种轻松自在的感觉。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">语法</h2>
        <p class="text-base mb-4">ECMAScript的语法大量借鉴了C及其他类C语言（如Java和Perl）的语法。因此，熟悉这些语言的开发人员在接受ECMAScript更加宽松的语法时，一定会有一种轻松自在的感觉。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">数据类型</h2>
        <p class="text-base mb-4">ECMAScript中有5种简单数据类型（也称为基本数据类型）：Undefined、Null、Boolean、Number和String。还有1种复杂数据类型——Object，Object本质上是由一组无序的名值对组成的。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">操作符</h2>
        <p class="text-base mb-4">ECMAScript用于操作数据值的操作符包括算术操作符（如加号和减号）、位操作符、关系操作符和相等操作符。</p>
      `
    };

    return chapterContents[chapterTitle] || `<h1 class="text-4xl font-black mb-6">${chapterTitle}</h1><p class="text-base mb-4">本章内容正在编写中...</p>`;
  };

  // 历史书籍内容
  const getHistoryContent = (chapterTitle: string) => {
    const chapterContents: { [key: string]: string } = {
      '第1章：认知革命': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">大约7万年前，智人开始形成更加复杂的语言和思维结构，这就是所谓的认知革命。这场革命让人类开始能够虚构故事、进行大规模合作，并最终统治了整个地球。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">语言的特殊性</h2>
        <p class="text-base mb-4">人类语言最独特的功能，在于能够传达关于一些根本不存在的事物的信息。据我们所知，只有人类能够讲述关于从未见过、碰过或闻过的事物，并且讲得煞有其事。</p>
        <p class="text-base mb-4">在认知革命之前，虽然所有人类以及尼安德特人等人类亲属都懂得使用工具，也有语言，但他们的语言只能传达关于客观世界的信息。他们可以说："小心！有只狮子！"但不能说："狮子是我们部落的守护神。"</p>
        <h2 class="text-3xl font-black mt-8 mb-4">虚构的故事</h2>
        <p class="text-base mb-4">认知革命正是人类虚构能力的革命。人类开始能够谈论只有想象中存在的事物，并且相信这些虚构的故事。这种能力让数百万陌生人能够合作，因为他们相信共同的神话、法律、货币和国家。</p>
      `,
      '第2章：农业革命': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">大约1万年前，人类开始投入几乎全部的心力，操纵着几种动植物的生命。从日升到日落，人类忙着播种、浇水、除草、牧羊，一心以为这样就能得到更多的水果、谷物和肉类。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">史上最大骗局</h2>
        <p class="text-base mb-4">农业革命可说是史上最大的一桩骗局。不是人类驯化了小麦，而是小麦驯化了人类。</p>
        <p class="text-base mb-4">小麦驯化了人类，让人类从早到晚忙忙碌碌，照料它的生长，为它除草、浇水、施肥，甚至保护它免受害虫侵害。小麦从原来的中东地区，走向全世界，成为人类的主食。而人类的生活方式却因此发生了彻底改变。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">定居生活的代价</h2>
        <p class="text-base mb-4">农业革命让人类的食物总量增加，但食物更加单一，而且增加了人类的劳动负担。定居生活带来了传染病的传播，社会分化也变得更加严重。</p>
      `
    };

    return chapterContents[chapterTitle] || `<h1 class="text-4xl font-black mb-6">${chapterTitle}</h1><p class="text-base mb-4">本章内容正在编写中...</p>`;
  };

  // 科幻书籍内容
  const getSciFiContent = (chapterTitle: string) => {
    const chapterContents: { [key: string]: string } = {
      '第1章：科学边界': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">汪淼觉得，来找他的这四个人是一个奇怪的组合：两名警察和两名军人，如果那两个军人是武警还算���常，但这是两名陆军军官。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">奇怪的组合</h2>
        <p class="text-base mb-4">他首先注意到的是那两名少校肩章上那熟悉的星徽，那是他曾经为之献出青春的部队的标志。这两位军官看起来都很年轻，但眼神中透露出一种与年龄不符的深邃。</p>
        <p class="text-base mb-4">"汪淼教授，我们是国防科工委的。"其中一位军官主动伸出手，"我们想向您了解一些关于前沿物理学研究的情况。"</p>
        <h2 class="text-3xl font-black mt-8 mb-4">神秘的邀请</h2>
        <p class="text-base mb-4">汪淼教授是国内知名的纳米材料专家，他的研究成果在国际上都享有盛誉。但是，他想不通国防科工委为什么要找到他，而且还是通过警方和军方的组合。</p>
        <p class="text-base mb-4">"有什么特别的研究项目需要我参与吗？"汪淼问道，他注意到四个人交换了一下眼神。</p>
      `,
      '第2章：台球': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">丁仪是一位理论物理学家，也是汪淼的大学同学。在汪淼的记忆中，丁仪总是对物理学有着近乎偏执的热爱。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">宇宙闪烁</h2>
        <p class="text-base mb-4">"汪淼，你相信宇宙会欺骗我们吗？"丁仪问道，他的眼神中闪烁着一种狂热的光芒。</p>
        <p class="text-base mb-4">"什么意思？"汪淼感到困惑。</p>
        <p class="text-base mb-4">"物理规律，我们一直认为它们是永恒不变的，是宇宙的基本法则。但如果...如果这些规律本身在发生变化呢？"</p>
        <h2 class="text-3xl font-black mt-8 mb-4">倒计时</h2>
        <p class="text-base mb-4">就在这时，汪淼的手机响了。是一个陌生的号码。他接通电话，听到的是一个机械的声音："倒计时开始，1200小时。"</p>
        <p class="text-base mb-4">"什么倒计时？你是谁？"汪淼问道，但电话已经挂断了。</p>
      `
    };

    return chapterContents[chapterTitle] || `<h1 class="text-4xl font-black mb-6">${chapterTitle}</h1><p class="text-base mb-4">本章内容正在编写中...</p>`;
  };

  // 计算机系统书籍内容
  const getCSContent = (chapterTitle: string) => {
    const chapterContents: { [key: string]: string } = {
      '第1章：计算机系统漫游': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">计算机系统是由硬件和系统软件组成的，它们共同工作来运行应用程序。虽然系统的具体实现方式随着时间不断变化，但是系统内在的概念却没有改变。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">信息就是位+上下文</h2>
        <p class="text-base mb-4">计算机中的所有信息——包括磁盘文件、内存中的程序、网络上传输的数据——都是由一串位（0和1）表示的。区分不同数据对象的唯一方法是我们读取这些位的上下文。</p>
        <p class="text-base mb-4">例如，在不同的上下文中，同样的字节序列可能表示整数、浮点数、字符串或者机器指令。理解这一点对于深入学习计算机系统至关重要。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">程序被其他程序翻译成不同的格式</h2>
        <p class="text-base mb-4">高级语言程序（如C程序）必须被翻译成机器语言指令序列才能在系统上执行。这个翻译过程由一系列程序完成：预处理器、编译器、汇编器和链接器。</p>
      `,
      '第2章：信息的表示和处理': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">现代计算机存储和处理的信息以二进制信号表示。这些二进制数字，或者称为位（bit），形成了数字革命的基础。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">整数表示</h2>
        <p class="text-base mb-4">计算机使用补码形式来表示有符号整数。这种表示方法使得加法和减法可以用同一种电路实现，大大简化了硬件设计。</p>
        <p class="text-base mb-4">理解整数的表示对于理解程序行为至关重要，特别是在处理溢出、类型转换和位运算时。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">浮点数表示</h2>
        <p class="text-base mb-4">IEEE浮点标准定义了浮点数的表示方法。理解浮点数的表示和运算对于数值计算和科学计算程序的开发者来说非常重要。</p>
      `
    };

    return chapterContents[chapterTitle] || `<h1 class="text-4xl font-black mb-6">${chapterTitle}</h1><p class="text-base mb-4">本章内容正在编写中...</p>`;
  };

  // 文学书籍内容
  const getLiteratureContent = (chapterTitle: string) => {
    const chapterContents: { [key: string]: string } = {
      '第1章：多年以后': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">多年以后，奥雷里亚诺·布恩迪亚上校面对行刑队，准会想起父亲带他去见识冰块的那个遥远的下午。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">马孔多的诞生</h2>
        <p class="text-base mb-4">那时的马孔多是一个只有二十户人家的村落，泥巴和芦苇盖成的屋子沿河岸排开，湍急的河水清澈见底，河床里卵石洁白光滑宛如史前巨蛋。</p>
        <p class="text-base mb-4">世界新生伊始，许多事物还没有名字，提到的时候尚需用手指指点点。每年三月前后，一家衣衫褴褛的吉普赛人都会来到村边扎下帐篷，击鼓鸣笛，在喧闹欢腾中介绍新近的发明。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">磁铁的魔力</h2>
        <p class="text-base mb-4">最先出现的是磁铁。一个身躯高大的吉普赛人，自称梅尔基亚德斯，满脸蓬乱的胡子，手指瘦得像鸟的爪子，向观众展示了他所谓的马其顿炼金术士创造的世界第八奇迹。</p>
        <p class="text-base mb-4">他拖着两块金属锭，挨家挨户走着，大家惊异地看到铁锅、铁盆、铁钳、小铁炉纷纷从原地落下，木板因铁钉和螺钉没命地挣脱出来而嘎嘎作响，甚至那些早已遗失的物件，也在找来找去后几近疯狂地乱成一团，追随在梅尔基亚德斯的魔铁后面。</p>
      `,
      '第2章：马孔多的建立': `
        <h1 class="text-4xl font-black mb-6">${chapterTitle}</h1>
        <p class="text-lg mb-4">何塞·阿尔卡蒂奥·布恩迪亚是一个充满好奇心和冒险精神的年轻人。他和妻子乌尔苏拉带领着一群年轻人穿越山脉，寻找通往大海的道路。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">迷失的旅程</h2>
        <p class="text-base mb-4">经过两年多的跋涉，他们没有找到大海，反而因为一场梦魇般的夜宿而放弃了原定的路线。当他们醒来时，发现自己被一片沼泽地包围，无法回头。</p>
        <p class="text-base mb-4">何塞·阿尔卡蒂奥·布恩迪亚在绝望中拔出剑，在巨大的树木上刻下自己的名字，并标记了他们的位置。他宣布这里就是马孔多，他们要在这里建立自己的家园。</p>
        <h2 class="text-3xl font-black mt-8 mb-4">新生活的开始</h2>
        <p class="text-base mb-4">在马孔多的第一个夜晚，他们搭建了简陋的住所。乌尔苏拉和其他女性们开始整理行李，男人们则准备打猎和耕种。这是一个新的开始，虽然充满了未知和挑战。</p>
      `
    };

    return chapterContents[chapterTitle] || `<h1 class="text-4xl font-black mb-6">${chapterTitle}</h1><p class="text-base mb-4">本章内容正在编写中...</p>`;
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
