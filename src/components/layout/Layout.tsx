import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import VocabularyPage from "../../pages/VocabularyPage";
import AccountPage from "../../pages/AccountPage";
import { useBookshelfStore, useSortBy } from "../../stores/bookshelfStore";
import { useCollectionStore } from "../../stores/collectionStore";
import { isCollectionNav, getCollectionId } from "../../types/types";

const Layout: React.FC = () => {
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

  const { collections, loadCollections, addBookToCollection, bookMembershipVersion } =
    useCollectionStore();

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  // ── Collection filtering ──
  const [collectionBookIds, setCollectionBookIds] = useState<string[] | null>(
    null
  );

  const activeCollectionId = isCollectionNav(activeNav)
    ? getCollectionId(activeNav)
    : null;

  const activeCollection = activeCollectionId
    ? collections.find((c) => c.id === activeCollectionId)
    : null;

  useEffect(() => {
    if (!activeCollectionId) {
      setCollectionBookIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!window?.api?.db?.collections?.getBookIds) return;
      const ids = await window.api.db.collections.getBookIds(
        activeCollectionId
      );
      if (!cancelled) setCollectionBookIds(ids);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCollectionId, bookMembershipVersion]);

  const displayBooks = useMemo(() => {
    if (!collectionBookIds) return books;
    const idSet = new Set(collectionBookIds);
    return books.filter((b) => idSet.has(b.id));
  }, [books, collectionBookIds]);

  // When adding a book in collection view, also add it to the collection
  const handleAddBook: typeof addBook = async (epubData) => {
    await addBook(epubData);
    if (activeCollectionId) {
      await addBookToCollection(activeCollectionId, epubData.id);
      // Refresh the filtered list
      if (window?.api?.db?.collections?.getBookIds) {
        const ids =
          await window.api.db.collections.getBookIds(activeCollectionId);
        setCollectionBookIds(ids);
      }
    }
  };

  return (
    <div className="h-screen bg-white text-[#333333] overflow-hidden">
      {/* Desktop layout: always show sidebar + main content */}
      <div className="flex h-full w-full">
        <Sidebar
          activeNav={activeNav}
          onNavChange={navChange}
          isMobile={false}
          isOpen={true}
          onClose={() => {}}
        />
        {activeNav === "profile" ? (
          <AccountPage />
        ) : activeNav === "vocabulary" ? (
          <VocabularyPage />
        ) : (
          <MainContent
            books={displayBooks}
            selectedBook={selectedBook}
            searchQuery={searchQuery}
            sortBy={sortBy}
            onSelectBook={selectBook}
            onSearch={setSearchQuery}
            onSort={cycleSort}
            toggleSidebar={toggleSidebar}
            toggleDetailsPane={toggleDetailsPane}
            onBookAdded={handleAddBook}
            onEnterReader={enterReader}
            onDeleteBook={deleteBook}
            collectionName={activeCollection?.name}
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
