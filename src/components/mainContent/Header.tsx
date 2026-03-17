import React from "react";
import SearchInput from "../ui/SearchInput";
import { Book, EpubBookData } from "../../types/types";
import AddBookButton from "../AddBookButton";

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSort: () => void;
  toggleSidebar: () => void;
  toggleDetailsPane: () => void;
  selectedBook: Book | null;
  onBookAdded?: (bookData: EpubBookData) => Promise<void> | void;
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearch,
  onSort,
  toggleSidebar,
  onBookAdded,
}) => {
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-8 pt-10 pb-3 bg-white"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-black/[0.06] transition-colors mr-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <h1 className="text-[24px] font-bold tracking-tight text-[#1d1d1f] flex-1">主页</h1>

      {/* Right controls */}
      <div className="flex items-center space-x-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {/* Desktop search */}
        <div className="hidden md:block">
          <SearchInput
            value={searchQuery}
            onChange={onSearch}
            placeholder="搜索书籍..."
            className="w-52"
          />
        </div>

        {/* Sort button */}
        <button
          onClick={onSort}
          className="text-[13px] text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-md hover:bg-black/[0.05] select-none"
        >
          排序
        </button>

        {/* Add book */}
        {onBookAdded && <AddBookButton onBookAdded={onBookAdded} />}
      </div>
    </header>
  );
};

export default Header;
