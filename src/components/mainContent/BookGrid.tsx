import React from 'react';
import BookItem from './BookItem';
import { Book, EpubBookData } from '../../types/types';

interface BookGridProps {
  books: Book[];
  selectedBook: Book | null;
  onSelectBook: (book: Book) => void;
  onEnterReader?: (book: Book, chapterId?: string) => void;
  onDeleteBook?: (book: Book) => void;
  onAddBook?: (bookData: EpubBookData) => Promise<void> | void;
  /** Book currently being read (for "继续阅读" section) */
  readingBook?: Book | null;
  collectionName?: string;
}

const BookGrid: React.FC<BookGridProps> = ({
  books,
  selectedBook,
  onSelectBook,
  onEnterReader,
  onDeleteBook,
  onAddBook,
  readingBook,
  collectionName,
}) => {
  const currentlyReading = readingBook ?? books.find((b) => b.status === 'reading') ?? null;

  return (
    <div className="flex-grow overflow-y-auto bg-white no-scrollbar">
      <div className="max-w-[1050px] mx-auto px-8 pb-20">

        {/* 继续阅读 section */}
        {currentlyReading && (
          <section className="mb-12 border-b border-gray-100 pb-10">
            <h2 className="text-[20px] font-bold mb-4 text-[#1d1d1f]">继续阅读</h2>
            <div
              className="
                flex items-center cursor-pointer
                bg-gradient-to-r from-[#a7a695] to-[#838270]
                rounded-[12px] p-4 w-[340px]
                shadow-md hover:shadow-xl transition-shadow duration-300
              "
              onClick={() => {
                const fallbackId =
                  currentlyReading.currentChapterId ??
                  currentlyReading.lastReadChapterId ??
                  currentlyReading.chapters?.[0]?.id;
                onEnterReader?.(currentlyReading, fallbackId);
              }}
            >
              {/* Mini cover */}
              <div
                className="w-[60px] h-[90px] flex-shrink-0 mr-4 overflow-hidden bg-gray-200"
                style={{
                  borderRadius: "2px 4px 4px 2px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                }}
              >
                {currentlyReading.cover ? (
                  <img src={currentlyReading.cover} alt={currentlyReading.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#f8f5e6] flex items-center justify-center p-1">
                    <span className="text-[8px] text-gray-700 text-center leading-tight">{currentlyReading.title}</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 text-white">
                <h3 className="font-bold text-[15px] leading-tight mb-0.5 opacity-95">{currentlyReading.title}</h3>
                <p className="text-[13px] opacity-75 mb-2">{currentlyReading.author}</p>
                <div className="w-full h-1 bg-white/30 rounded-full">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${currentlyReading.progress}%` }}
                  />
                </div>
                <p className="text-[11px] opacity-70 mt-1">{currentlyReading.progress}%</p>
              </div>
            </div>
          </section>
        )}

        {/* 书架网格 */}
        <section>
          <h2 className="text-[20px] font-bold mb-6 text-[#1d1d1f]">
            {collectionName ?? '图书'}
          </h2>
          <div
            className="gap-x-5 gap-y-8"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 120px)" }}
          >
            {books.map((book) => (
              <BookItem
                key={book.id}
                book={book}
                isSelected={selectedBook?.id === book.id}
                onClick={() => onSelectBook(book)}
                onEnterReader={onEnterReader}
                onDelete={onDeleteBook}
              />
            ))}
            {/* Add book cell */}
            {onAddBook && (
            <div className="text-center">
              <div
                className="
                  w-full flex flex-col items-center justify-center
                  bg-gray-50 hover:bg-gray-100
                  transition-colors duration-200 cursor-pointer
                  text-gray-400
                "
                style={{
                  height: "168px",
                  borderRadius: "2px 4px 4px 2px",
                  border: "1.5px dashed rgba(0,0,0,0.15)",
                }}
                onClick={async () => {
                  try {
                    const filePath = await window.api.epub.selectFile();
                    if (!filePath) return;
                    const bookData = await window.api.epub.parseFile(filePath);
                    await onAddBook(bookData);
                  } catch (error) {
                    console.error("添加书籍失败:", error);
                    alert("添加书籍失败，请检查文件格式是否正确");
                  }
                }}
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[11px]">添加书籍</span>
              </div>
            </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BookGrid;
