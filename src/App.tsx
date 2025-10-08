import { useState } from 'react';
import Layout from './components/layout/Layout';
import { Book, User, NavigationItem } from './types/types';

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
  const [books] = useState<Book[]>(mockBooks);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeNav, setActiveNav] = useState<NavigationItem>('bookshelf');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByIndex, setSortByIndex] = useState(0);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
  };

  const handleNavChange = (nav: NavigationItem) => {
    setActiveNav(nav);
    console.log(`导航到: ${nav}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSort = () => {
    setSortByIndex((prev) => (prev + 1) % sortOptions.length);
    console.log(`排序方式: ${sortOptions[sortByIndex]}`);
  };

  const sortBy = sortOptions[sortByIndex];

  return (
    <Layout
      books={books}
      user={mockUser}
      selectedBook={selectedBook}
      activeNav={activeNav}
      searchQuery={searchQuery}
      sortBy={sortBy}
      onSelectBook={handleSelectBook}
      onNavChange={handleNavChange}
      onSearch={handleSearch}
      onSort={handleSort}
    />
  );
}
