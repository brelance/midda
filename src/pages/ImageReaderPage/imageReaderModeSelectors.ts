export type ReadingMode = "browse" | "text" | "study";
export type ImageReaderViewMode = "page" | "scroll";
export type ActiveImageReader = "page" | "scroll" | "study";

export interface ImageReaderModeInput {
  readingMode: ReadingMode;
  viewMode: ImageReaderViewMode;
}

export interface ImageReaderModeOutput {
  activeReader: ActiveImageReader;
  effectiveViewMode: ImageReaderViewMode;
  ocrEnabled: boolean;
}

export function deriveImageReaderMode(input: ImageReaderModeInput): ImageReaderModeOutput {
  const isStudy = input.readingMode === "study";
  const activeReader: ActiveImageReader = isStudy
    ? "study"
    : input.viewMode === "scroll"
      ? "scroll"
      : "page";

  return {
    activeReader,
    effectiveViewMode: isStudy ? "page" : input.viewMode,
    ocrEnabled: input.readingMode !== "browse",
  };
}
