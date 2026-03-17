import React from "react";

interface PageTurnButtonProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
}

const PageTurnButton: React.FC<PageTurnButtonProps> = ({
  direction,
  onClick,
  disabled = false,
}) => {
  const isPrev = direction === "prev";

  return (
    <div
      className={`page-turn-zone group absolute top-0 ${
        isPrev ? "left-0" : "right-0"
      } z-20 flex h-full w-[15%] items-center ${
        isPrev ? "justify-start pl-3" : "justify-end pr-3"
      } cursor-pointer select-none`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={-1}
      aria-label={isPrev ? "上一页" : "下一页"}
      aria-disabled={disabled}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        tabIndex={0}
        aria-label={isPrev ? "上一页" : "下一页"}
        className={`
          flex h-11 w-11 items-center justify-center
          rounded-full
          bg-white/70 dark:bg-black/40
          backdrop-blur-sm
          border border-black/10
          shadow-lg
          opacity-0 group-hover:opacity-100
          transition-all duration-200 ease-out
          scale-90 group-hover:scale-100
          disabled:pointer-events-none disabled:opacity-0
          hover:bg-white/90
          active:scale-95
        `}
      >
        <svg
          className="h-5 w-5 text-[#1d1d1f]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isPrev ? (
            <path d="M15 18l-6-6 6-6" />
          ) : (
            <path d="M9 18l6-6-6-6" />
          )}
        </svg>
      </button>
    </div>
  );
};

export default PageTurnButton;
