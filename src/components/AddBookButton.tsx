import React, { useState } from 'react';
import { EpubBookData } from '../types/types';

interface AddBookButtonProps {
  onBookAdded: (bookData: EpubBookData) => void;
}

const AddBookButton: React.FC<AddBookButtonProps> = ({ onBookAdded }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddBook = async () => {
    try {
      setIsLoading(true);

      // 1. 选择EPUB文件
      const filePath = await window.api.epub.selectFile();
      if (!filePath) {
        return; // 用户取消选择
      }

      // 2. 解析EPUB文件
      const bookData = await window.api.epub.parseFile(filePath);

      // 3. 调用父组件回调
      onBookAdded(bookData);
    } catch (error) {
      console.error('添加书籍失败:', error);
      // 显示用户友好的错误提示
      alert('添加书籍失败，请检查文件格式是否正确');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddBook}
      disabled={isLoading}
      className="brutalist-button border-4 border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#d4a017] text-white p-4 font-black text-lg hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>正在添加...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>添加书籍</span>
        </div>
      )}
    </button>
  );
};

export default AddBookButton;