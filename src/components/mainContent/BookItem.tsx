import React from 'react';
import { Book } from '../../types/types';

interface BookItemProps {
  book: Book;
  isSelected: boolean;
  onClick: () => void;
  onStartReading?: () => void;
}

const BookItem: React.FC<BookItemProps> = ({ book, isSelected, onClick, onStartReading }) => {
  const handleClick = () => {
    onClick();
  };

  const handleStartReading = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (onStartReading) {
      onStartReading();
    }
  };

  return (
    <div
      className={`
        book-item text-center cursor-pointer
        transition-all duration-200
        ${isSelected ? 'book-item-active' : ''}
      `}
      onClick={handleClick}
    >
      <div className="relative w-full h-48 bg-white border-3 border-dashed border-black rounded-2xl flex items-center justify-center text-center text-black mb-2">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <span className="text-lg font-black">书籍封面</span>
        )}

        {/* 阅读按钮 */}
        {onStartReading && (
          <button
            onClick={handleStartReading}
            className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
          >
            <div className="bg-white border-4 border-black rounded-[20px] px-6 py-3 font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-100">
              开始阅读
            </div>
          </button>
        )}
      </div>
      <p className="font-black text-lg truncate">{book.title}</p>
      <p className="text-base">{book.author}</p>
    </div>
  );
};

export default BookItem;