export type ImageReaderViewMode = "page" | "scroll";
export type ActiveImageReader = "page" | "scroll" | "study";

export interface ImageReaderModeInput {
  studyMode: boolean;
  viewMode: ImageReaderViewMode;
  ocrEnabled: boolean;
}

export interface ImageReaderModeOutput {
  activeReader: ActiveImageReader;
  effectiveViewMode: ImageReaderViewMode;
  effectiveOcrEnabled: boolean;
}

export function deriveImageReaderMode(input: ImageReaderModeInput): ImageReaderModeOutput {
  const activeReader: ActiveImageReader = input.studyMode
    ? "study"
    : input.viewMode === "scroll"
      ? "scroll"
      : "page";

  return {
    activeReader,
    effectiveViewMode: input.studyMode ? "page" : input.viewMode,
    effectiveOcrEnabled: input.studyMode ? true : input.ocrEnabled,
  };
}
