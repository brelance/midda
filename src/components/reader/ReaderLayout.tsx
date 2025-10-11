import React from "react";

interface ReaderLayoutProps {
  header: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  onMouseMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: React.TouchEvent<HTMLDivElement>) => void;
}

const ReaderLayout: React.FC<ReaderLayoutProps> = ({
  header,
  content,
  footer,
  onMouseMove,
  onTouchStart,
}) => {
  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-[#f5f5dc] text-[#3d2b1f]"
      onMouseMove={onMouseMove}
      onTouchStart={onTouchStart}
    >
      {header}
      <main className="flex-1 overflow-hidden px-4 py-6 pt-24 pb-24 sm:px-8 md:px-12">
        <div className="h-full overflow-hidden">{content}</div>
      </main>
      {footer}
    </div>
  );
};

export default ReaderLayout;
