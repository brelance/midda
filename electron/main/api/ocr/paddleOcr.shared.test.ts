import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePaddleOcrJsonl,
  shouldSavePaddleOcrDebugJsonl,
} from "./paddleOcr.shared";

test("parsePaddleOcrJsonl preserves source dimensions and marks vertical blocks", () => {
  const content = `${JSON.stringify({
    result: {
      dataInfo: {
        width: 800,
        height: 1200,
      },
      layoutParsingResults: [
        {
          prunedResult: {
            parsing_res_list: [
              {
                block_label: "vertical_text",
                block_content: "天地玄黄",
                block_bbox: [10, 20, 38, 220],
              },
              {
                block_label: "text",
                block_content: "horizontal",
                block_bbox: [100, 120, 260, 180],
              },
              {
                block_label: "footer",
                block_content: "ignored footer",
                block_bbox: [0, 1180, 800, 1200],
              },
            ],
          },
        },
      ],
    },
  })}\n`;

  const parsed = parsePaddleOcrJsonl(content);

  assert.equal(parsed.sourceWidth, 800);
  assert.equal(parsed.sourceHeight, 1200);
  assert.equal(parsed.blocks.length, 2);
  assert.deepEqual(
    parsed.blocks.map(({ text, direction }) => ({ text, direction })),
    [
      { text: "天地玄黄", direction: "vertical" },
      { text: "horizontal", direction: "horizontal" },
    ]
  );
});

test("shouldSavePaddleOcrDebugJsonl only enables explicit opt-in values", () => {
  assert.equal(shouldSavePaddleOcrDebugJsonl({}), false);
  assert.equal(
    shouldSavePaddleOcrDebugJsonl({ PADDLE_OCR_DEBUG_SAVE_JSONL: "1" }),
    true
  );
  assert.equal(
    shouldSavePaddleOcrDebugJsonl({ PADDLE_OCR_DEBUG_SAVE_JSONL: "true" }),
    true
  );
  assert.equal(
    shouldSavePaddleOcrDebugJsonl({ PADDLE_OCR_DEBUG_SAVE_JSONL: "0" }),
    false
  );
});
