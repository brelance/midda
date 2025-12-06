import React from 'react';
import BrutalistCard from '../ui/BrutalistCard';
import { Book } from '../../types/types';

interface BookDetailsProps {
  book: Book | null;
  onChapterSelect?: (chapterId: string) => void;
}

const BookDetails: React.FC<BookDetailsProps> = ({ book, onChapterSelect }) => {
  return (
    <div
      id="book-details"
      className={`
        mt-8 transition-opacity duration-300
        ${book ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <h2 className="text-3xl font-black mb-4">书籍详情</h2>
      <BrutalistCard className="p-4 text-lg">
        {book ? (
          <div>
            <div className="mb-4">
              <h3 className="font-black text-xl mb-2">简介</h3>
              <p className="text-base">
                {book.description || '暂无简介'}
              </p>
            </div>

            {book.chapters && book.chapters.length > 0 && (
              <div>
                <h3 className="font-black text-xl mb-2">目录</h3>
                <div className="max-h-64 overflow-y-auto text-sm">
                  {book.chapters.map((chapter, index) => {
                    const isRead = chapter.isRead;
                    const isClickable = typeof onChapterSelect === "function";
                    return (
                      <button
                        key={chapter.id}
                        type="button"
                        onClick={
                          isClickable ? () => onChapterSelect(chapter.id) : undefined
                        }
                        className={`
                        flex w-full flex-col items-start gap-1 border-b border-gray-200 py-2 px-3 text-left transition-colors
                        ${isRead ? "text-gray-500" : "text-black font-bold"}
                        ${
                          isClickable
                            ? "hover:bg-[#d4a017]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2b1f]"
                            : ""
                        }
                      `}
                        aria-label={`跳转到${chapter.title}`}
                      >
                        <span>
                          {index + 1}. {chapter.title}
                        </span>
                        {isRead && <span className="text-sm font-normal">✓ 已阅读</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              <p>添加日期: {book.addedDate.toLocaleDateString()}</p>
              {book.lastReadDate && (
                <p>最后阅读: {book.lastReadDate.toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center">
            点击左侧书架中的一本书<br />来查看详情
          </p>
        )}
      </BrutalistCard>
    </div>
  );
};

export default BookDetails;
