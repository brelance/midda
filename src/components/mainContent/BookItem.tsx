import React from "react";
import { Book } from "../../types/types";
import BrutalistButton from "../ui/BrutalistButton";

interface BookItemProps {
  book: Book;
  isSelected: boolean;
  onClick: () => void;
  onEnterReader?: (book: Book) => void;
}

const BookItem: React.FC<BookItemProps> = ({
  book,
  isSelected,
  onClick,
  onEnterReader,
}) => {
  const handleEnterReader = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEnterReader?.(book);
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
