import React from 'react';
import { Book } from '../../types/types';

interface BookItemProps {
  book: Book;
  isSelected: boolean;
  onClick: () => void;
}

const BookItem: React.FC<BookItemProps> = ({ book, isSelected, onClick }) => {
  return (
    <div
      className={`
        book-item text-center cursor-pointer
        transition-all duration-200
        ${isSelected ? 'book-item-active' : ''}
      `}
      onClick={onClick}
    >
      <div className="w-full h-48 bg-white border-3 border-dashed border-black rounded-2xl flex items-center justify-center text-center text-black mb-2">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <span className="text-lg font-black">书籍封面</span>
        )}
      </div>
      <p className="font-black text-lg truncate">{book.title}</p>
      <p className="text-base">{book.author}</p>
    </div>
  );
};

export default BookItem;