import React from 'react';

interface BookInfoProps {
  bookTitle: string;
  chapterTitle: string;
  className?: string;
}

const BookInfo: React.FC<BookInfoProps> = ({
  bookTitle,
  chapterTitle,
  className = '',
}) => {
  return (
    <div className={`text-center hidden md:block ${className}`}>
      <h1 className="text-2xl font-black truncate">{bookTitle}</h1>
      <p className="text-base">{chapterTitle}</p>
    </div>
  );
};

export default BookInfo;