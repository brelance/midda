import React, { useState, useEffect, useRef } from 'react';
import ReaderHeader from './ReaderHeader';
import ReaderContent from './ReaderContent';
import ReaderFooter from './ReaderFooter';

interface ReaderPageProps {
  bookTitle: string;
  chapterTitle: string;
  chapterContent: string;
  progress: number;
  onBack: () => void;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  onTableOfContents?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
}

const ReaderPage: React.FC<ReaderPageProps> = ({
  bookTitle,
  chapterTitle,
  chapterContent,
  progress,
  onBack,
  onPreviousChapter,
  onNextChapter,
  onTableOfContents,
  onSearch,
  onSettings,
}) => {
  const [toolbarsVisible, setToolbarsVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 显示工具栏
  const showToolbars = () => {
    setToolbarsVisible(true);

    // 清除之前的隐藏定时器
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // 3秒后自动隐藏工具栏
    const timeout = setTimeout(() => {
      setToolbarsVisible(false);
    }, 3000);

    setHideTimeout(timeout);
  };

  // 隐藏工具栏
  const hideToolbars = () => {
    setToolbarsVisible(false);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
  };

  // 处理内容区域的点击（显示/隐藏工具栏）
  const handleContentClick = () => {
    if (toolbarsVisible) {
      hideToolbars();
    } else {
      showToolbars();
    }
  };

  // 处理鼠标移动到顶部或底部区域
  const handleMouseMove = (event: React.MouseEvent) => {
    const mouseY = event.clientY;
    const windowHeight = window.innerHeight;
    const zoneHeight = 100; // 100px的激活区

    // 如果鼠标进入顶部或底部区域，显示工具栏
    if (mouseY < zoneHeight || mouseY > windowHeight - zoneHeight) {
      showToolbars();
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  return (
    <div
      className="h-screen w-full bg-[#f5f5dc] overflow-hidden flex flex-col"
      onMouseMove={handleMouseMove}
      onClick={handleContentClick}
    >
      {/* 顶部工具栏 */}
      <ReaderHeader
        isVisible={toolbarsVisible}
        bookTitle={bookTitle}
        chapterTitle={chapterTitle}
        onBack={onBack}
        onTableOfContents={onTableOfContents}
        onSearch={onSearch}
        onSettings={onSettings}
      />

      {/* 阅读内容区 */}
      <ReaderContent
        ref={contentRef}
        content={chapterContent}
        toolbarsVisible={toolbarsVisible}
      />

      {/* 底部工具栏 */}
      <ReaderFooter
        isVisible={toolbarsVisible}
        progress={progress}
        onPreviousChapter={onPreviousChapter}
        onNextChapter={onNextChapter}
      />
    </div>
  );
};

export default ReaderPage;