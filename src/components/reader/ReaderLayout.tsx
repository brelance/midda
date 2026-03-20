import React from "react";
import { READER_THEME_MAP } from "../../types/reader";
import { useReaderSettings } from "../../stores/readerSettingsStore";

interface ReaderLayoutProps {
  header: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  isHeaderVisible?: boolean;
  onMouseMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: React.TouchEvent<HTMLDivElement>) => void;
}

const ReaderLayout: React.FC<ReaderLayoutProps> = ({
  header,
  content,
  footer,
  isHeaderVisible = false,
  onMouseMove,
  onTouchStart,
}) => {
  const {
    fontSize,
    lineHeight,
    fontFamily,
    theme: readerTheme,
  } = useReaderSettings();

  const theme = READER_THEME_MAP[readerTheme];

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={{
        "--reader-font-size": `${fontSize}px`,
        "--reader-line-height": `${lineHeight}`,
        "--reader-font-family": fontFamily || "inherit",
        "--reader-bg": theme.bg,
        "--reader-text": theme.text,
        "--reader-card": theme.card,
        backgroundColor: theme.bg,
        color: theme.text,
      } as React.CSSProperties}
      onMouseMove={onMouseMove}
      onTouchStart={onTouchStart}
    >
      {/* Transparent drag strip — switches to no-drag when header is visible so buttons remain clickable */}
      <div
        className="fixed top-0 left-0 right-0 z-40 h-7"
        style={{ WebkitAppRegion: isHeaderVisible ? "no-drag" : "drag" } as React.CSSProperties}
      />
      {header}
      <main className="flex-1 overflow-hidden px-[60px] pt-[56px] pb-[56px]">
        <div className="h-full overflow-hidden">{content}</div>
      </main>
      {footer}
    </div>
  );

};

export default ReaderLayout;

