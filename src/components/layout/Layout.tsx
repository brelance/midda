import React from "react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import { Book, User, NavigationItem, EpubBookData } from "../../types/types";

interface LayoutProps {
  books: Book[];
  user: User;
  selectedBook: Book | null;
  activeNav: NavigationItem;
  searchQuery: string;
  sortBy: "title" | "author" | "progress" | "addedDate";
  isSidebarOpen: boolean;
  isDetailsPaneOpen: boolean;
  onSelectBook: (book: Book) => void;
  onNavChange: (nav: NavigationItem) => void;
  onSearch: (query: string) => void;
  onSort: () => void;
  toggleSidebar: () => void;
  toggleDetailsPane: () => void;
  closeSidebar: () => void;
  closeDetailsPane: () => void;
  onBookAdded?: (bookData: EpubBookData) => void;
  onEnterReader?: (book: Book, chapterId?: string) => void;
  onDeleteBook?: (book: Book) => void;
}

const Layout: React.FC<LayoutProps> = ({
  books,
  user,
  selectedBook,
  activeNav,
  searchQuery,
  sortBy,
  isSidebarOpen,
  onSelectBook,
  onNavChange,
  onSearch,
  onSort,
  toggleSidebar,
  toggleDetailsPane,
  closeSidebar,
  onBookAdded,
  onEnterReader,
  onDeleteBook,
}) => {
  return (
    <div className="h-screen bg-white text-[#333333] overflow-hidden">
      {/* Desktop layout: always show sidebar + main content */}
      <div className="flex h-full w-full">
        <Sidebar
          activeNav={activeNav}
          onNavChange={onNavChange}
          user={user}
          isMobile={false}
          isOpen={true}
          onClose={() => {}}
        />
        <MainContent
          books={books}
          selectedBook={selectedBook}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onSelectBook={onSelectBook}
          onSearch={onSearch}
          onSort={onSort}
          toggleSidebar={toggleSidebar}
          toggleDetailsPane={toggleDetailsPane}
          onBookAdded={onBookAdded}
          onEnterReader={onEnterReader}
          onDeleteBook={onDeleteBook}
        />
      </div>

      {/* Mobile sidebar drawer overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={closeSidebar}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          {/* Drawer */}
          <div
            className="absolute top-0 left-0 bottom-0 w-[280px] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeNav={activeNav}
              onNavChange={onNavChange}
              user={user}
              isMobile={true}
              isOpen={isSidebarOpen}
              onClose={closeSidebar}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
