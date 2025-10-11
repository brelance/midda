import React from "react";

interface ReaderBookInfoProps {
  bookTitle: string;
  chapterTitle?: string;
}

const ReaderBookInfo: React.FC<ReaderBookInfoProps> = ({
  bookTitle,
  chapterTitle,
}) => {
  return (
    <div className="hidden md:block text-center max-w-[420px] mx-auto">
      <h1 className="truncate text-2xl font-black">{bookTitle}</h1>
      {chapterTitle ? (
        <p className="truncate text-base font-semibold">{chapterTitle}</p>
      ) : null}
    </div>
  );
};

export default ReaderBookInfo;
