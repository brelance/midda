import React from "react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import DetailsPane from "./DetailsPane";
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
  onEnterReader?: (book: Book) => void;
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
  isDetailsPaneOpen,
  onSelectBook,
  onNavChange,
  onSearch,
  onSort,
  toggleSidebar,
  toggleDetailsPane,
  closeSidebar,
  closeDetailsPane,
  onBookAdded,
  onEnterReader,
  onDeleteBook,
}) => {
  return (
    <div className="h-screen bg-[#f5f5dc]">
      {/* 桌面端：三栏布局 */}
      <div className="hidden lg:flex h-full w-full desktop-layout">
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
        <DetailsPane
          selectedBook={selectedBook}
          isMobile={false}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* 平板端：两栏布局 */}
      <div className="hidden md:flex lg:hidden h-full w-full tablet-layout">
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

        {isDetailsPaneOpen && (
          <div
            className="mobile-details-pane open"
            onClick={(e) => e.stopPropagation()}
          >
            <DetailsPane
              selectedBook={selectedBook}
              isMobile={true}
              isOpen={isDetailsPaneOpen}
              onClose={closeDetailsPane}
              showCloseButton={true}
            />
          </div>
        )}
      </div>

      {/* 移动端：单栏布局 */}
      <div className="flex md:hidden h-full w-full mobile-layout">
        <div className="flex-1">
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
            onEnterReader={onEnterReader}
            onDeleteBook={onDeleteBook}
          />
        </div>
      </div>

      {/* 移动端侧边栏覆盖层 */}
      {(isSidebarOpen || isDetailsPaneOpen) && (
        <div
          className="mobile-overlay md:hidden"
          onClick={() => {
            if (isSidebarOpen) closeSidebar();
            if (isDetailsPaneOpen) closeDetailsPane();
          }}
        >
          {/* 移动端侧边栏 */}
          {isSidebarOpen && (
            <div
              className="mobile-sidebar open"
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
          )}

          {/* 移动端详情面板 */}
          {isDetailsPaneOpen && (
            <div
              className="mobile-details-pane open"
              onClick={(e) => e.stopPropagation()}
            >
              <DetailsPane
                selectedBook={selectedBook}
                isMobile={true}
                isOpen={isDetailsPaneOpen}
                onClose={closeDetailsPane}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Layout;
