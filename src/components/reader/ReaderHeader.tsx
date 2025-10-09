import React from 'react';
import BrutalistButton from '../ui/BrutalistButton';
import BookInfo from './BookInfo';

interface ReaderHeaderProps {
  isVisible: boolean;
  bookTitle: string;
  chapterTitle: string;
  onBack: () => void;
  onTableOfContents?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
}

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  isVisible,
  bookTitle,
  chapterTitle,
  onBack,
  onTableOfContents,
  onSearch,
  onSettings,
}) => {
  return (
    <header
      className={`flex-shrink-0 w-full p-4 border-b-4 border-black flex items-center justify-between bg-[#f5f5dc]/75 backdrop-blur-md transition-transform duration-300 ease-in-out z-50 fixed top-0 left-0 right-0 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        borderRadius: 0,
        boxShadow: '0 6px 0 0 rgba(0,0,0,1)',
      }}
    >
      {/* 左侧操作 */}
      <div className="flex items-center space-x-4">
        {/* 返回按钮 */}
        <BrutalistButton
          onClick={onBack}
          variant="primary"
          className="flex items-center"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="ml-2 hidden sm:block">返回书架</span>
        </BrutalistButton>

        {/* 目录按钮 */}
        {onTableOfContents && (
          <BrutalistButton onClick={onTableOfContents} className="flex items-center">
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="ml-2 hidden sm:block">目录</span>
          </BrutalistButton>
        )}
      </div>

      {/* 中间信息 */}
      <BookInfo bookTitle={bookTitle} chapterTitle={chapterTitle} />

      {/* 右侧操作 */}
      <div className="flex items-center space-x-4">
        {/* 搜索按钮 */}
        {onSearch && (
          <BrutalistButton onClick={onSearch} className="p-3">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </BrutalistButton>
        )}

        {/* 设置按钮 */}
        {onSettings && (
          <BrutalistButton onClick={onSettings} className="flex items-center">
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="ml-2 hidden sm:block">显示设置</span>
          </BrutalistButton>
        )}
      </div>
    </header>
  );
};

export default ReaderHeader;