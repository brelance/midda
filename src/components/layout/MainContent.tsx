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
  onBookAdded?: (bookData: EpubBookData) => Promise<void> | void;
  onEnterReader?: (book: Book, chapterId?: string) => void;
  onDeleteBook?: (book: Book) => void;
  collectionName?: string;
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
  collectionName,
}) => {
  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title': return a.title.localeCompare(b.title);
      case 'author': return a.author.localeCompare(b.author);
      case 'progress': return b.progress - a.progress;
      case 'addedDate': return b.addedDate.getTime() - a.addedDate.getTime();
      default: return 0;
    }
  });

  const readingBook = books.find((b) => b.status === 'reading') ?? null;

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-white">
      <Header
        searchQuery={searchQuery}
        onSearch={onSearch}
        onSort={onSort}
        toggleSidebar={toggleSidebar}
        toggleDetailsPane={toggleDetailsPane}
        selectedBook={selectedBook}
        onBookAdded={onBookAdded}
      />
      {/* Thin divider */}
      <div className="border-b border-gray-100 flex-shrink-0" />
      <BookGrid
        books={sortedBooks}
        selectedBook={selectedBook}
        onSelectBook={onSelectBook}
        onEnterReader={onEnterReader}
        onDeleteBook={onDeleteBook}
        onAddBook={onBookAdded}
        readingBook={readingBook}
        collectionName={collectionName}
      />
    </main>
  );
};

export default MainContent;
