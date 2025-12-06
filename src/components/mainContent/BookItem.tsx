import React from "react";
import { Book } from "../../types/types";
import BrutalistButton from "../ui/BrutalistButton";

interface BookItemProps {
  book: Book;
  isSelected: boolean;
  onClick: () => void;
  onEnterReader?: (book: Book, chapterId?: string) => void;
  onDelete?: (book: Book) => void;
}

const BookItem: React.FC<BookItemProps> = ({
  book,
  isSelected,
  onClick,
  onEnterReader,
  onDelete,
}) => {
  const handleEnterReader = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEnterReader?.(book);
  };

  const handleDeleteBook = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete?.(book);
  };

  return (
    <div
      className={`
        group relative book-item text-center cursor-pointer
        transition-all duration-200
        ${isSelected ? "book-item-active" : ""}
      `}
      onClick={onClick}
    >
      {onDelete && (
        <button
          type="button"
          onClick={handleDeleteBook}
          aria-label={`删除${book.title}`}
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-0 transition-all duration-200 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 7h12" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M19 7v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7" />
          </svg>
        </button>
      )}
      <div className="relative mb-2 flex h-48 w-full items-center justify-center rounded-2xl border-4 border-dashed border-black bg-white text-center text-black">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="h-full w-full rounded-2xl object-cover"
          />
        ) : (
          <span className="text-lg font-black">书籍封面</span>
        )}

        {onEnterReader && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <BrutalistButton
              variant="primary"
              className="pointer-events-auto px-6 py-2 text-base"
              onClick={handleEnterReader}
            >
              开始阅读
            </BrutalistButton>
          </div>
        )}
      </div>
      <p className="truncate text-lg font-black">{book.title}</p>
      <p className="text-base">{book.author}</p>
    </div>
  );
};

export default BookItem;
