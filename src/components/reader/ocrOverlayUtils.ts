import type { CSSProperties } from "react";

import type { PositionedOcrBlock } from "../../types/ocr";

const MIN_SELECTABLE_FONT_SIZE = 8;

function getVerticalCharCount(text: string): number {
  return Math.max(
    1,
    ...text
      .split("\n")
      .map((line) => Math.max(1, Array.from(line.trim()).length))
  );
}

export function getOcrBlockTextStyle(
  block: PositionedOcrBlock,
  scaleX: number,
  scaleY: number
): CSSProperties {
  const renderedWidth = Math.max(1, Math.round(block.width * scaleX));
  const renderedHeight = Math.max(1, Math.round(block.height * scaleY));

  const baseStyle: CSSProperties = {
    color: "transparent",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    userSelect: "text",
    WebkitUserSelect: "text",
  };

  if (block.direction === "vertical") {
    const verticalCharCount = getVerticalCharCount(block.text);
    const fontSize = Math.max(
      MIN_SELECTABLE_FONT_SIZE,
      Math.min(
        Math.floor(renderedWidth * 0.85),
        Math.floor(renderedHeight / verticalCharCount)
      )
    );

    return {
      ...baseStyle,
      fontSize,
      lineHeight: `${renderedWidth}px`,
      writingMode: "vertical-rl",
      textOrientation: "upright",
      wordBreak: "break-all",
    };
  }

  const lineCount = Math.max(1, block.text.split("\n").length);
  const perLineHeight = renderedHeight / lineCount;

  return {
    ...baseStyle,
    fontSize: Math.max(MIN_SELECTABLE_FONT_SIZE, perLineHeight * 0.8),
    lineHeight: `${perLineHeight}px`,
  };
}
