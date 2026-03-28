import type {
  OcrTextDirection,
  PositionedOcrBlock,
} from "../../../../src/types/ocr";

interface ParsedOcrData {
  blocks: PositionedOcrBlock[];
  sourceWidth?: number;
  sourceHeight?: number;
}

const SKIP_LABELS = new Set(["footer", "footer_image", "header", "header_image"]);

function getBlockDirection(blockLabel: unknown): OcrTextDirection {
  return blockLabel === "vertical_text" ? "vertical" : "horizontal";
}

export function shouldSavePaddleOcrDebugJsonl(
  env: Record<string, string | undefined>
): boolean {
  const value = env.PADDLE_OCR_DEBUG_SAVE_JSONL?.trim().toLowerCase();
  return value === "1" || value === "true";
}

export function parsePaddleOcrJsonl(content: string): ParsedOcrData {
  const lines = content.trim().split("\n");
  const blocks: PositionedOcrBlock[] = [];
  let sourceWidth: number | undefined;
  let sourceHeight: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);

      const dataInfo = parsed?.result?.dataInfo;
      if (dataInfo?.width && dataInfo?.height) {
        sourceWidth = dataInfo.width;
        sourceHeight = dataInfo.height;
      }

      const layoutResults = parsed?.result?.layoutParsingResults;
      if (!Array.isArray(layoutResults)) continue;

      for (const result of layoutResults) {
        const parsingList = result?.prunedResult?.parsing_res_list;
        if (!Array.isArray(parsingList)) continue;

        for (const item of parsingList) {
          if (SKIP_LABELS.has(item.block_label)) continue;

          const text = item.block_content?.trim();
          if (!text) continue;

          const direction = getBlockDirection(item.block_label);
          const bbox = item.block_bbox;

          if (Array.isArray(bbox) && bbox.length === 4) {
            blocks.push({
              text,
              confidence: 1.0,
              x: bbox[0],
              y: bbox[1],
              width: bbox[2] - bbox[0],
              height: bbox[3] - bbox[1],
              direction,
            });
          } else {
            blocks.push({
              text,
              confidence: 1.0,
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              direction,
            });
          }
        }
      }
    } catch {
      console.warn("[PaddleOCR] Failed to parse JSONL line:", trimmed.slice(0, 100));
    }
  }

  return { blocks, sourceWidth, sourceHeight };
}
