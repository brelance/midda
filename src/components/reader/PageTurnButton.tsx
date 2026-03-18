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
      className="page-turn-zone group"
      style={{
        position: "fixed",
        top: 56,          /* below the header bar */
        bottom: 56,       /* above the footer bar */
        width: 60,
        [isPrev ? "left" : "right"]: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
      }}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={-1}
      aria-label={isPrev ? "上一页" : "下一页"}
      aria-disabled={disabled}
    >
      <svg
        className={`
          h-12 w-7 text-gray-400
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200 ease-out
          ${disabled ? "!opacity-0 pointer-events-none" : ""}
        `}
        viewBox="0 0 24 40"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isPrev ? (
          <path d="M18 4L6 20L18 36" />
        ) : (
          <path d="M6 4L18 20L6 36" />
        )}
      </svg>
    </div>
  );
};

export default PageTurnButton;

