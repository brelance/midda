import type { PageOcrCacheRecord, PageOcrCacheUpsertPayload } from "../../types/database";
import type { MangaOcrResult, NativeOcrResult, PositionedOcrBlock } from "../../types/ocr";

export type StudyOcrEngine = "native" | "manga";

interface StudyPageImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface LoadStudyPageOcrParams {
  bookId: string;
  pageNumber: number;
  ocrEngine: StudyOcrEngine;
  requestId: string;
  currentImage: StudyPageImage;
  getCachedPageOcr: (
    bookId: string,
    pageNumber: number,
    ocrEngine: StudyOcrEngine
  ) => Promise<PageOcrCacheRecord | null>;
  waitForOcrDebounce: () => Promise<void>;
  recognizeManga?: (payload: {
    requestId: string;
    imageInput: string;
  }) => Promise<MangaOcrResult | null | undefined>;
  recognizeNative?: (imageInput: string) => Promise<NativeOcrResult | null | undefined>;
  upsertCachedPageOcr: (payload: PageOcrCacheUpsertPayload) => Promise<void>;
}

export interface LoadedStudyPageOcr {
  blocks: PositionedOcrBlock[];
  sourceWidth: number;
  sourceHeight: number;
  fallbackText: string;
  cacheHit: boolean;
}

function toCachedStudyPageOcr(
  cached: PageOcrCacheRecord,
  currentImage: StudyPageImage
): LoadedStudyPageOcr {
  return {
    blocks: JSON.parse(cached.blocksJson) as PositionedOcrBlock[],
    sourceWidth: cached.sourceWidth ?? currentImage.width,
    sourceHeight: cached.sourceHeight ?? currentImage.height,
    fallbackText: cached.fullText ?? "",
    cacheHit: true,
  };
}

export async function loadStudyPageOcr({
  bookId,
  pageNumber,
  ocrEngine,
  requestId,
  currentImage,
  getCachedPageOcr,
  waitForOcrDebounce,
  recognizeManga,
  recognizeNative,
  upsertCachedPageOcr,
}: LoadStudyPageOcrParams): Promise<LoadedStudyPageOcr> {
  try {
    const cached = await getCachedPageOcr(bookId, pageNumber, ocrEngine);
    if (cached) {
      return toCachedStudyPageOcr(cached, currentImage);
    }
  } catch {
    // Cache miss or parse error: fall through to OCR.
  }

  await waitForOcrDebounce();

  let blocks: PositionedOcrBlock[] = [];
  let sourceWidth = currentImage.width;
  let sourceHeight = currentImage.height;
  let fallbackText = "";
  let didRunOcr = false;

  if (ocrEngine === "manga") {
    if (recognizeManga) {
      didRunOcr = true;
      const result = await recognizeManga({
        requestId,
        imageInput: currentImage.dataUrl,
      });
      blocks = result?.blocks ?? [];
      sourceWidth = result?.sourceWidth || currentImage.width;
      sourceHeight = result?.sourceHeight || currentImage.height;
      if (!blocks.length) fallbackText = result?.text ?? "";
    }
  } else if (recognizeNative) {
    didRunOcr = true;
    const result = await recognizeNative(currentImage.dataUrl);
    blocks = result?.blocks ?? [];
    if (!blocks.length) fallbackText = result?.text ?? "";
  }

  if (didRunOcr) {
    const fullText = blocks.length > 0
      ? blocks.map((block) => block.text).join("\n")
      : fallbackText;
    void upsertCachedPageOcr({
      bookId,
      pageNumber,
      ocrEngine,
      blocksJson: JSON.stringify(blocks),
      sourceWidth,
      sourceHeight,
      fullText,
    }).catch(() => {});
  }

  return {
    blocks,
    sourceWidth,
    sourceHeight,
    fallbackText,
    cacheHit: false,
  };
}
