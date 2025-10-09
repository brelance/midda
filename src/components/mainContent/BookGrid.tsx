import React from 'react';
import BookItem from './BookItem';
import AddBookButton from './AddBookButton';
import { Book } from '../../types/types';

interface BookGridProps {
  books: Book[];
  selectedBook: Book | null;
  onSelectBook: (book: Book) => void;
  onStartReading?: (book: Book) => void;
}

const BookGrid: React.FC<BookGridProps> = ({
  books,
  selectedBook,
  onSelectBook,
  onStartReading,
}) => {
  return (
    <div className="flex-grow p-4 md:p-6 overflow-y-auto bg-[#f5f5dc] no-scrollbar">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
        {books.map((book) => (
          <BookItem
            key={book.id}
            book={book}
            isSelected={selectedBook?.id === book.id}
            onClick={() => onSelectBook(book)}
            onStartReading={onStartReading}
          />
        ))}
        <AddBookButton />
      </div>
    </div>
  );
};

export default BookGrid;
