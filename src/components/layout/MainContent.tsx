import React from 'react';
import Header from '../mainContent/Header';
import BookGrid from '../mainContent/BookGrid';
import { Book, EpubBookData } from '../../types/types';

interface MainContentProps {
  books: Book[];
  selectedBook: Book | null;
  searchQuery: string;
  sortBy: 'title' | 'author' | 'progress' | 'addedDate';
  toggleSidebar: () => void;
  toggleDetailsPane: () => void;
  onSelectBook: (book: Book) => void;
  onSearch: (query: string) => void;
  onSort: () => void;
  onBookAdded?: (bookData: EpubBookData) => void;
  onEnterReader?: (book: Book) => void;
  onDeleteBook?: (book: Book) => void;
}

const MainContent: React.FC<MainContentProps> = ({
  books,
  selectedBook,
  searchQuery,
  sortBy,
  toggleSidebar,
  toggleDetailsPane,
  onSelectBook,
  onSearch,
  onSort,
  onBookAdded,
  onEnterReader,
  onDeleteBook,
}) => {
  // 过滤书籍
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 排序书籍
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'progress':
        return b.progress - a.progress;
      case 'addedDate':
        return b.addedDate.getTime() - a.addedDate.getTime();
      default:
        return 0;
    }
  });

  return (
    <main className="flex-1 flex flex-col overflow-hidden border-r-4 border-black md:border-r-0 lg:border-r-4">
      <Header
        searchQuery={searchQuery}
        onSearch={onSearch}
        onSort={onSort}
        toggleSidebar={toggleSidebar}
        toggleDetailsPane={toggleDetailsPane}
        selectedBook={selectedBook}
        onBookAdded={onBookAdded}
      />
      <BookGrid
        books={sortedBooks}
        selectedBook={selectedBook}
        onSelectBook={onSelectBook}
        onEnterReader={onEnterReader}
        onDeleteBook={onDeleteBook}
      />
    </main>
  );
};

export default MainContent;
