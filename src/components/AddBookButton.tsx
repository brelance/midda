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
      if (!filePath) { setIsLoading(false); return; }
      const bookData = await window.api.epub.parseFile(filePath);
      await onBookAdded(bookData);
      setIsModalOpen(false);
    } catch (error) {
      console.error("添加书籍失败:", error);
      alert("添加书籍失败，请检查文件格式是否正确");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
        className="
          inline-flex items-center space-x-1.5
          rounded-lg text-[13px] font-medium px-3 py-1.5
          bg-[#007aff] text-white
          hover:bg-[#0071f3] active:bg-[#006ee0]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-150 select-none
        "
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        )}
        <span>{isLoading ? "导入中..." : "添加书籍"}</span>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => { if (!isLoading) setIsModalOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">选择 EPUB 文件</h2>
            <p className="text-[13px] text-gray-500 mb-6">请选择要导入的 EPUB 文件，系统会自动解析书籍信息。</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { if (!isLoading) setIsModalOpen(false); }}
                disabled={isLoading}
                className="rounded-lg text-[13px] font-medium px-4 py-1.5 bg-black/[0.06] text-[#333] hover:bg-black/[0.1] disabled:opacity-40 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSelectFile}
                disabled={isLoading}
                className="rounded-lg text-[13px] font-medium px-4 py-1.5 bg-[#007aff] text-white hover:bg-[#0071f3] disabled:opacity-40 transition-colors"
              >
                {isLoading ? "导入中..." : "选择文件"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddBookButton;
