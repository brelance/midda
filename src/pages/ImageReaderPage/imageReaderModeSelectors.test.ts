import assert from "node:assert/strict";
import test from "node:test";

import { deriveImageReaderMode } from "./imageReaderModeSelectors";

test("deriveImageReaderMode keeps normal preferences intact while applying study-mode behavior", () => {
  const normalPreferences = {
    studyMode: true,
    viewMode: "scroll" as const,
    ocrEnabled: false,
  };

  const derived = deriveImageReaderMode(normalPreferences);

  // Effective study behavior
  assert.equal(derived.activeReader, "study");
  assert.equal(derived.effectiveViewMode, "page");
  assert.equal(derived.effectiveOcrEnabled, true);

  // Normal-mode preferences stay unchanged
  assert.equal(normalPreferences.viewMode, "scroll");
  assert.equal(normalPreferences.ocrEnabled, false);
});

test("deriveImageReaderMode keeps normal mode on configured viewer and OCR setting", () => {
  const derived = deriveImageReaderMode({
    studyMode: false,
    viewMode: "scroll",
    ocrEnabled: false,
  });

  assert.equal(derived.activeReader, "scroll");
  assert.equal(derived.effectiveViewMode, "scroll");
  assert.equal(derived.effectiveOcrEnabled, false);
});
