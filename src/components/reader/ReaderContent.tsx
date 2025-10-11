import React, { forwardRef } from "react";

interface ReaderContentProps {
  chapterTitle: string;
  contentHtml: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ chapterTitle, contentHtml, onScroll }, ref) => {
    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="reading-content no-scrollbar mx-auto h-full max-w-[780px] overflow-y-auto px-2 text-lg leading-8 text-[#3d2b1f] md:px-4 md:text-xl"
      >
        <h1 className="mb-6 text-4xl font-black">{chapterTitle}</h1>
        <div
          className="space-y-6 font-normal"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    );
  }
);

ReaderContent.displayName = "ReaderContent";

export default ReaderContent;
