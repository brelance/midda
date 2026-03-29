import assert from "node:assert/strict";
import test from "node:test";

import { loadStudyPageOcr } from "./imageStudyOcr";

test("loadStudyPageOcr returns warm cache immediately without waiting for the OCR debounce", async () => {
  let waited = false;
  let recognizeCalled = false;
  let upsertCalled = false;

  const result = await loadStudyPageOcr({
    bookId: "book-1",
    pageNumber: 7,
    ocrEngine: "manga",
    requestId: "study-ocr-7",
    currentImage: {
      dataUrl: "data:image/png;base64,cache-hit",
      width: 900,
      height: 1400,
    },
    getCachedPageOcr: async () => ({
      id: 1,
      bookId: "book-1",
      pageNumber: 7,
      ocrEngine: "manga",
      blocksJson: JSON.stringify([
        {
          text: "cached text",
          confidence: 1,
          x: 12,
          y: 34,
          width: 56,
          height: 78,
        },
      ]),
      sourceWidth: 1200,
      sourceHeight: 1800,
      fullText: "cached text",
      createdAt: "2026-03-29T00:00:00.000Z",
    }),
    waitForOcrDebounce: async () => {
      waited = true;
    },
    recognizeManga: async () => {
      recognizeCalled = true;
      return {
        text: "remote text",
        confidence: 1,
        blocks: [],
        sourceWidth: 1000,
        sourceHeight: 1500,
      };
    },
    recognizeNative: async () => {
      recognizeCalled = true;
      return {
        text: "native text",
        blocks: [],
      };
    },
    upsertCachedPageOcr: async () => {
      upsertCalled = true;
    },
  });

  assert.equal(waited, false);
  assert.equal(recognizeCalled, false);
  assert.equal(upsertCalled, false);
  assert.equal(result.cacheHit, true);
  assert.equal(result.fallbackText, "cached text");
  assert.equal(result.sourceWidth, 1200);
  assert.equal(result.sourceHeight, 1800);
  assert.deepEqual(result.blocks, [
    {
      text: "cached text",
      confidence: 1,
      x: 12,
      y: 34,
      width: 56,
      height: 78,
    },
  ]);
});

test("loadStudyPageOcr persists empty OCR results after a cache miss", async () => {
  let waited = false;
  const upserts: unknown[] = [];

  const result = await loadStudyPageOcr({
    bookId: "book-2",
    pageNumber: 11,
    ocrEngine: "manga",
    requestId: "study-ocr-11",
    currentImage: {
      dataUrl: "data:image/png;base64,cache-miss",
      width: 700,
      height: 1100,
    },
    getCachedPageOcr: async () => null,
    waitForOcrDebounce: async () => {
      waited = true;
    },
    recognizeManga: async () => ({
      text: "",
      confidence: 1,
      blocks: [],
      sourceWidth: 1400,
      sourceHeight: 2200,
    }),
    upsertCachedPageOcr: async (payload) => {
      upserts.push(payload);
    },
  });

  assert.equal(waited, true);
  assert.equal(result.cacheHit, false);
  assert.equal(result.fallbackText, "");
  assert.equal(result.sourceWidth, 1400);
  assert.equal(result.sourceHeight, 2200);
  assert.deepEqual(result.blocks, []);
  assert.deepEqual(upserts, [
    {
      bookId: "book-2",
      pageNumber: 11,
      ocrEngine: "manga",
      blocksJson: "[]",
      sourceWidth: 1400,
      sourceHeight: 2200,
      fullText: "",
    },
  ]);
});
