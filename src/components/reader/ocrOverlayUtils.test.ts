import assert from "node:assert/strict";
import test from "node:test";

import { getOcrBlockTextStyle } from "./ocrOverlayUtils";

test("getOcrBlockTextStyle renders vertical manga blocks with vertical writing mode", () => {
  const style = getOcrBlockTextStyle(
    {
      text: "天地玄黄",
      confidence: 1,
      x: 0,
      y: 0,
      width: 24,
      height: 240,
      direction: "vertical",
    },
    1,
    1
  );

  assert.equal(style.writingMode, "vertical-rl");
  assert.equal(style.textOrientation, "upright");
  assert.equal(style.fontSize, 20);
  assert.equal(style.lineHeight, "24px");
  assert.equal(style.overflow, "hidden");
});

test("getOcrBlockTextStyle keeps horizontal blocks on the existing horizontal layout", () => {
  const style = getOcrBlockTextStyle(
    {
      text: "horizontal text",
      confidence: 1,
      x: 0,
      y: 0,
      width: 160,
      height: 40,
      direction: "horizontal",
    },
    1,
    1
  );

  assert.equal(style.writingMode, undefined);
  assert.equal(style.textOrientation, undefined);
  assert.equal(style.fontSize, 32);
  assert.equal(style.lineHeight, "40px");
  assert.equal(style.whiteSpace, "pre-wrap");
});
