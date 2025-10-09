import React, { forwardRef } from 'react';

interface ReaderContentProps {
  content: string;
  toolbarsVisible: boolean;
  className?: string;
}

const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ content, toolbarsVisible, className = '' }, ref) => {
    return (
      <main
        ref={ref}
        className={`flex-grow overflow-y-auto p-8 transition-all duration-300 ${
          toolbarsVisible ? 'pt-32 pb-32' : 'pt-8 pb-8'
        } ${className}`}
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        <style jsx>{`
          main::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>

        <div className="reading-content max-w-4xl mx-auto">
          <div
            className="font-normal text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
            style={{
              fontFamily: '"Public Sans", sans-serif',
              fontWeight: 400,
              fontSize: '1.125rem',
              lineHeight: 1.8,
            }}
          />
        </div>
      </main>
    );
  }
);

ReaderContent.displayName = 'ReaderContent';

export default ReaderContent;