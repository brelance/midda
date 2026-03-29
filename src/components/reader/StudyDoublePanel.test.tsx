import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  StudySentenceRow,
  type ReaderSentenceAnalysisItem,
} from "./StudyDoublePanel";

test("StudySentenceRow keeps newline-containing OCR tokens interactive as a single token while preserving line breaks", () => {
  const item: ReaderSentenceAnalysisItem = {
    id: "sentence-1",
    text: "明日学校",
    chapterId: "chapter-1",
    paragraphIndex: 0,
    sentenceIndex: 0,
    status: "loaded",
    tokens: [
      {
        word: "明日\n学校",
        pos: "名詞",
        furigana: "あしたがっこう",
        romaji: "ashita gakkou",
        baseForm: "明日学校",
      },
    ],
  };

  const markup = renderToStaticMarkup(
    <StudySentenceRow
      item={item}
      onTokenClick={(_e, _token, _sentenceText, _chapterId) => {}}
      enableHoverTts={false}
    />
  );

  assert.equal((markup.match(/class="study-word-unit"/g) ?? []).length, 1);
  assert.match(markup, /明日<br\/?>学校/);
});
