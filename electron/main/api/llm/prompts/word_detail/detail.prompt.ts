import type { WordDetail } from "../../../../../../src/types/types";
import type { PromptDefinition } from "../../core/promptRunner";
import { parseJson } from "../../core/json";
import { jsonQuote, loadPromptTemplate, renderTemplate } from "../template";

const template = loadPromptTemplate({
  moduleUrl: import.meta.url,
  relativePathFromModuleDir: "./detail.md",
  fallbackPathFromCwd: "electron/main/api/llm/prompts/word_detail/detail.md",
  missingMessage: "服务器缺少单词详情提示模板，请联系开发者",
});

export type WordDetailPromptInput = {
  word: string;
  pos: string;
  sentence: string;
  furigana?: string;
  romaji?: string;
};

export const wordDetailPrompt: PromptDefinition<WordDetailPromptInput, WordDetail> =
  {
    id: "word_detail",
    build: (input) => {
      const furigana = input.furigana?.trim() ?? "";
      const romaji = input.romaji?.trim() ?? "";

      return {
        messages: [
          {
            role: "user",
            content: renderTemplate(template, {
              sentence_quoted: jsonQuote(input.sentence),
              word_quoted: jsonQuote(input.word),
              pos_display: input.pos,
              furigana_note: furigana ? `, 读音: ${furigana}` : "",
              romaji_note: romaji ? `, 罗马音: ${romaji}` : "",
              pos_quoted: jsonQuote(input.pos),
              furigana_quoted: jsonQuote(furigana),
              romaji_quoted: jsonQuote(romaji),
            }),
          },
        ],
        responseFormat: { type: "json_object" },
      };
    },
    parse: (text) => parseJson<WordDetail>(text, "[word_detail]"),
  };
