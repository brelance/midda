import React from 'react';
import BrutalistCard from '../ui/BrutalistCard';
import BrutalistButton from '../ui/BrutalistButton';
import ProgressBar from '../ui/ProgressBar';
import { Book } from '../../types/types';

interface ContinueReadingProps {
  book: Book | null;
}

const ContinueReading: React.FC<ContinueReadingProps> = ({ book }) => {
  // 如果有选中的书籍且正在阅读，显示该书籍
  // 否则显示默认的"继续阅读"卡片
  const displayBook = book && book.status === 'reading' ? book : {
    id: 'default',
    title: '书籍名称',
    author: '作者名',
    progress: 45,
    status: 'reading' as const,
  };

  return (
    <div>
      <h2 className="text-3xl font-black mb-4">继续阅读</h2>
      <BrutalistCard className="p-4">
        <div className="w-24 h-36 bg-white border-3 border-dashed border-black rounded-2xl flex items-center justify-center text-center text-black mx-auto mb-3">
          {book?.cover ? (
            <img
              src={book.cover}
              alt={book.title}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <span className="text-sm font-black">书籍封面</span>
          )}
        </div>

        <h3 className="font-black text-2xl text-center mt-3">
          {book ? book.title : displayBook.title}
        </h3>
        <p className="text-base text-center mt-1">
          {book ? book.author : displayBook.author}
        </p>

        <ProgressBar
          progress={book ? book.progress : displayBook.progress}
          className="mt-4"
        />

        <div className="text-center mt-3 p-1 bg-white border-4 border-black rounded-lg">
          <span className="font-bold">状态:</span> 已读 {book ? book.progress : displayBook.progress}%
        </div>

        <BrutalistButton
          variant="primary"
          className="w-full mt-4 text-lg"
          onClick={() => {
            console.log('继续阅读:', book?.title || displayBook.title);
          }}
        >
          继续阅读
        </BrutalistButton>
      </BrutalistCard>
    </div>
  );
};

export default ContinueReading;