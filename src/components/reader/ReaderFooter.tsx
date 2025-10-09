import React from 'react';
import BrutalistButton from '../ui/BrutalistButton';
import ReadingProgress from './ReadingProgress';

interface ReaderFooterProps {
  isVisible: boolean;
  progress: number;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
}

const ReaderFooter: React.FC<ReaderFooterProps> = ({
  isVisible,
  progress,
  onPreviousChapter,
  onNextChapter,
}) => {
  return (
    <footer
      className={`flex-shrink-0 w-full p-4 border-t-4 border-black flex items-center justify-between bg-[#f5f5dc]/75 backdrop-blur-md transition-transform duration-300 ease-in-out z-50 fixed bottom-0 left-0 right-0 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        borderRadius: 0,
        boxShadow: '0 -6px 0 0 rgba(0,0,0,1)',
      }}
    >
      {/* 上一章按钮 */}
      {onPreviousChapter && (
        <BrutalistButton
          onClick={onPreviousChapter}
          className="flex items-center text-lg"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          上一章
        </BrutalistButton>
      )}

      {/* 阅读进度 */}
      <div className="flex-grow mx-8 flex items-center space-x-4">
        <ReadingProgress progress={progress} />
      </div>

      {/* 下一章按钮 */}
      {onNextChapter && (
        <BrutalistButton
          onClick={onNextChapter}
          className="flex items-center text-lg"
        >
          下一章
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </BrutalistButton>
      )}
    </footer>
  );
};

export default ReaderFooter;