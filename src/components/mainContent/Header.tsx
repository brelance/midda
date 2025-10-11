import React from "react";
import SearchInput from "../ui/SearchInput";
import BrutalistButton from "../ui/BrutalistButton";
import AddBookButton from "../AddBookButton";
import { Book, EpubBookData } from "../../types/types";

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSort: () => void;
  toggleSidebar: () => void;
  toggleDetailsPane: () => void;
  selectedBook: Book | null;
  onBookAdded?: (bookData: EpubBookData) => void;
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearch,
  onSort,
  toggleSidebar,
  toggleDetailsPane,
  selectedBook,
  onBookAdded,
}) => {
  return (
    <header className="h-20 flex-shrink-0 flex items-center justify-between p-4 border-b-4 border-black bg-[#f5f5dc]">
      {/* 左侧：移动端菜单按钮 + 桌面端标题 */}
      <div className="flex items-center space-x-4">
        {/* 移动端菜单按钮 */}
        <button
          onClick={toggleSidebar}
          className="md:hidden border-4 border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#d4a017] text-white p-3 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* 桌面端标题 */}
        <h1 className="hidden md:block text-4xl font-black">我的书架</h1>

        {/* 移动端小标题 */}
        <h1 className="md:hidden text-2xl font-black">书架</h1>
      </div>

      {/* 右侧：搜索和操作按钮 */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* 桌面端搜索框 */}
        <div className="hidden md:block">
          <SearchInput
            value={searchQuery}
            onChange={onSearch}
            className="w-48 lg:w-64"
          />
        </div>

        {/* 移动端搜索按钮 */}
        <button
          className="md:hidden border-4 border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white text-black p-3 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
          onClick={() => {
            /* TODO: 实现移动端搜索 */
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* 排序按钮 */}
        <BrutalistButton
          onClick={onSort}
          className="text-sm md:text-lg px-2 md:px-6"
        >
          排序{" "}
        </BrutalistButton>

        {/* 添加书籍按钮 */}
        {onBookAdded && <AddBookButton onBookAdded={onBookAdded} />}

        {/* 移动端详情按钮（仅在有选中书籍时显示） */}
        {selectedBook && (
          <button
            onClick={toggleDetailsPane}
            className="md:hidden border-4 border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#b3312c] text-white p-3 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
