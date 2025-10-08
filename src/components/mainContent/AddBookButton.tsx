import React from 'react';

const AddBookButton: React.FC = () => {
  return (
    <div className="text-center">
      <div
        className="
          w-full h-48 bg-white border-3 border-dashed border-black
          rounded-2xl flex items-center justify-center text-center text-black
          mb-2 cursor-pointer flex-col
          transition-all duration-200
          hover:bg-[#f0f0f0]
        "
      >
        <svg
          className="w-12 h-12 text-black mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <span className="text-lg font-black">添加书籍</span>
      </div>
    </div>
  );
};

export default AddBookButton;