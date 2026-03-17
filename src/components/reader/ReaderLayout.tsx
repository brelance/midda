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
      className="relative flex h-screen flex-col overflow-hidden text-[#333333]"
      style={{ backgroundColor: "#fdfdfd" }}
      onMouseMove={onMouseMove}
      onTouchStart={onTouchStart}
    >
      {header}
      <main className="flex-1 overflow-hidden px-[60px] pt-[56px] pb-[56px]">
        <div className="h-full overflow-hidden">{content}</div>
      </main>
      {footer}
    </div>
  );
};

export default ReaderLayout;

