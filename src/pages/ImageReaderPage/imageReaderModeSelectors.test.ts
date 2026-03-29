import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveImageReaderMode } from "./imageReaderModeSelectors";

describe("deriveImageReaderMode", () => {
  it("study mode → study reader, ocrEnabled true, viewMode page", () => {
    const result = deriveImageReaderMode({ readingMode: "study", viewMode: "scroll" });
    assert.equal(result.activeReader, "study");
    assert.equal(result.effectiveViewMode, "page");
    assert.equal(result.ocrEnabled, true);
  });

  it("text mode + page → page reader, ocrEnabled true", () => {
    const result = deriveImageReaderMode({ readingMode: "text", viewMode: "page" });
    assert.equal(result.activeReader, "page");
    assert.equal(result.effectiveViewMode, "page");
    assert.equal(result.ocrEnabled, true);
  });

  it("text mode + scroll → scroll reader, ocrEnabled true", () => {
    const result = deriveImageReaderMode({ readingMode: "text", viewMode: "scroll" });
    assert.equal(result.activeReader, "scroll");
    assert.equal(result.effectiveViewMode, "scroll");
    assert.equal(result.ocrEnabled, true);
  });

  it("browse mode + page → page reader, ocrEnabled false", () => {
    const result = deriveImageReaderMode({ readingMode: "browse", viewMode: "page" });
    assert.equal(result.activeReader, "page");
    assert.equal(result.effectiveViewMode, "page");
    assert.equal(result.ocrEnabled, false);
  });

  it("browse mode + scroll → scroll reader, ocrEnabled false", () => {
    const result = deriveImageReaderMode({ readingMode: "browse", viewMode: "scroll" });
    assert.equal(result.activeReader, "scroll");
    assert.equal(result.effectiveViewMode, "scroll");
    assert.equal(result.ocrEnabled, false);
  });
});
