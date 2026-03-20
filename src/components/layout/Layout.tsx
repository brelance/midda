import React from "react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import VocabularyPage from "../../pages/VocabularyPage";
import type { User } from "../../types/types";
import { useBookshelfStore, useSortBy } from "../../stores/bookshelfStore";

interface LayoutProps {
  user: User;
}

const Layout: React.FC<LayoutProps> = ({ user }) => {
  const {
    books,
    selectedBook,
    activeNav,
    searchQuery,
    isSidebarOpen,
    selectBook,
    navChange,
    setSearchQuery,
    cycleSort,
    toggleSidebar,
    toggleDetailsPane,
    closeSidebar,
    addBook,
    enterReader,
    deleteBook,
  } = useBookshelfStore();

  const sortBy = useSortBy();

  return (
    <div className="h-screen bg-white text-[#333333] overflow-hidden">
      {/* Desktop layout: always show sidebar + main content */}
      <div className="flex h-full w-full">
        <Sidebar
          activeNav={activeNav}
          onNavChange={navChange}
          user={user}
          isMobile={false}
          isOpen={true}
          onClose={() => {}}
        />
        {activeNav === "vocabulary" ? (
          <VocabularyPage />
        ) : (
          <MainContent
            books={books}
            selectedBook={selectedBook}
            searchQuery={searchQuery}
            sortBy={sortBy}
            onSelectBook={selectBook}
            onSearch={setSearchQuery}
            onSort={cycleSort}
            toggleSidebar={toggleSidebar}
            toggleDetailsPane={toggleDetailsPane}
            onBookAdded={addBook}
            onEnterReader={enterReader}
            onDeleteBook={deleteBook}
          />
        )}
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
              onNavChange={navChange}
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
