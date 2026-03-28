export type OcrTextDirection = "horizontal" | "vertical";

export interface PositionedOcrBlock {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: OcrTextDirection;
}

export interface NativeOcrResult {
  text: string;
  blocks: PositionedOcrBlock[];
  language?: string;
}

export interface MangaOcrRequest {
  requestId: string;
  imageInput: string;
}

export interface MangaOcrResult {
  text: string;
  confidence: number;
  blocks: PositionedOcrBlock[];
  sourceWidth?: number;
  sourceHeight?: number;
}
