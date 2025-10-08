import React from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import DetailsPane from './DetailsPane';
import { Book, User, NavigationItem } from '../../types/types';

interface LayoutProps {
  books: Book[];
  user: User;
  selectedBook: Book | null;
  activeNav: NavigationItem;
  searchQuery: string;
  sortBy: 'title' | 'author' | 'progress' | 'addedDate';
  onSelectBook: (book: Book) => void;
  onNavChange: (nav: NavigationItem) => void;
  onSearch: (query: string) => void;
  onSort: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  books,
  user,
  selectedBook,
  activeNav,
  searchQuery,
  sortBy,
  onSelectBook,
  onNavChange,
  onSearch,
  onSort,
}) => {
  return (
    <div className="flex h-screen bg-[#f5f5dc]">
      <Sidebar
        activeNav={activeNav}
        onNavChange={onNavChange}
        user={user}
      />
      <MainContent
        books={books}
        selectedBook={selectedBook}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSelectBook={onSelectBook}
        onSearch={onSearch}
        onSort={onSort}
      />
      <DetailsPane
        selectedBook={selectedBook}
      />
    </div>
  );
};

export default Layout;