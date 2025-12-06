import React from 'react';
import ContinueReading from '../detailsPane/ContinueReading';
import BookDetails from '../detailsPane/BookDetails';
import { Book } from '../../types/types';

interface DetailsPaneProps {
  selectedBook: Book | null;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  showCloseButton?: boolean;
  onEnterReader?: (book: Book, chapterId?: string) => void;
}

const DetailsPane: React.FC<DetailsPaneProps> = ({
  selectedBook,
  isMobile,
  onClose,
  showCloseButton = isMobile,
  onEnterReader,
}) => {
  const handleChapterSelect = (chapterId: string) => {
    if (!selectedBook) {
      return;
    }
    onEnterReader?.(selectedBook, chapterId);
    if (isMobile) {
      onClose();
    }
  };

  return (
    <aside className={`
      ${isMobile ? 'w-full h-full' : 'w-80'}
      flex-shrink-0 flex flex-col bg-[#f5f5dc]
      ${isMobile ? 'border-l-0' : 'border-l-4 border-black'}
    `}>
      {/* 顶部栏：移动端及需要关闭按钮的场景显示 */}
      {showCloseButton && (
        <div className="flex items-center justify-between p-4 border-b-4 border-black">
          <h2 className="text-xl font-black">书籍详情</h2>
          <button
            onClick={onClose}
            className="border-4 border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#b3312c] text-white p-2 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className={`${isMobile ? 'p-4' : 'p-6'} flex-grow overflow-y-auto`}>
        {selectedBook ? (
          <>
            <ContinueReading book={selectedBook} onEnterReader={onEnterReader} />
            <BookDetails book={selectedBook} onChapterSelect={handleChapterSelect} />
          </>
        ) : (
          <>
            {!isMobile && <ContinueReading book={null} />}
            <BookDetails book={null} />
          </>
        )}
      </div>
    </aside>
  );
};

export default DetailsPane;
