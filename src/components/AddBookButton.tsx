import React, { useState } from "react";
import { EpubBookData } from "../types/types";

interface AddBookButtonProps {
  onBookAdded: (bookData: EpubBookData) => Promise<void> | void;
}

const AddBookButton: React.FC<AddBookButtonProps> = ({ onBookAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectFile = async () => {
    try {
      setIsLoading(true);

      const filePath = await window.api.epub.selectFile();
      if (!filePath) {
        setIsLoading(false);
        return; // 用户取消选择
      }

      const bookData = await window.api.epub.parseFile(filePath);
      await onBookAdded(bookData);
      setIsModalOpen(false);
    } catch (error) {
      console.error("添加书籍失败:", error);
      // 显示用户友好的错误提示
      alert("添加书籍失败，请检查文件格式是否正确");
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isLoading) {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[20px] border-4 border-black bg-[#fdf1d2] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-black text-black">选择EPUB文件</h2>
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="ml-2 border-2 border-black rounded-full px-2 font-black text-sm hover:bg-black hover:text-white transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm text-black">
              请选择要导入的EPUB文件，系统会在导入后自动解析书籍信息。
            </p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="border-4 border-black rounded-[16px] bg-white px-4 py-2 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={handleSelectFile}
                disabled={isLoading}
                className="border-4 border-black rounded-[16px] bg-[#d4a017] px-4 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '导入中...' : '选择文件'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddBookButton;
