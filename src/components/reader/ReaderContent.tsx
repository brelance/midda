import React, { forwardRef } from "react";
import { ReadingMode } from "../../types/reader";

interface ReaderContentProps {
  chapterTitle: string;
  contentHtml: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  readingMode: ReadingMode;
}

const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ chapterTitle, contentHtml, onScroll, readingMode }, ref) => {
    const containerMaxWidth =
      readingMode === "double" ? "max-w-[1100px]" : "max-w-[780px]";
    const modeClass =
      readingMode === "double"
        ? "double-page-mode md:columns-2 md:gap-12"
        : "";

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className={`reading-content no-scrollbar mx-auto h-full ${containerMaxWidth} overflow-y-auto px-2 text-lg leading-8 text-[#3d2b1f] md:px-4 md:text-xl`}
      >
        <h1 className="mb-6 text-4xl font-black">{chapterTitle}</h1>
        <div
          className={`space-y-6 font-normal ${modeClass}`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    );
  }
);

ReaderContent.displayName = "ReaderContent";

export default ReaderContent;
