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
}) => {
  return (
    <div className="flex h-screen bg-[#f5f5dc]">
      {/* 桌面端：三栏布局 */}
      <div className="hidden lg:flex lg:flex-1">
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
        />
        <DetailsPane
          selectedBook={selectedBook}
          isMobile={false}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* 平板端：两栏布局 */}
      <div className="hidden md:flex lg:hidden w-full">
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
        />
      </div>

      {/* 移动端：单栏布局 + 移动面板 */}
      <div className="md:hidden w-full">
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
        />
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

      {/* 平板端详情面板覆盖层 */}
      {isDetailsPaneOpen && window.innerWidth >= 768 && window.innerWidth < 1024 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 hidden md:flex lg:hidden items-center justify-center"
          onClick={closeDetailsPane}
        >
          <div
            className="w-80 h-full bg-[#f5f5dc] border-l-4 border-black"
            onClick={(e) => e.stopPropagation()}
          >
            <DetailsPane
              selectedBook={selectedBook}
              isMobile={false}
              isOpen={isDetailsPaneOpen}
              onClose={closeDetailsPane}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;