import type { PromptDefinition } from "../../core/promptRunner";
import { parseJson } from "../../core/json";
import { loadPromptTemplate, renderTemplate } from "../template";

const template = loadPromptTemplate({
  moduleUrl: import.meta.url,
  relativePathFromModuleDir: "./dict.md",
  fallbackPathFromCwd: "electron/main/api/llm/prompts/word_detail/dict.md",
  missingMessage: "服务器缺少单词词典提示模板，请联系开发者",
});

export const wordDictPrompt: PromptDefinition<{ word: string }, unknown> = {
  id: "word_dict",
  build: ({ word }) => ({
    messages: [
      {
        role: "user",
        content: renderTemplate(template, { word }),
      },
    ],
    temperature: 0.3,
    responseFormat: { type: "json_object" },
  }),
  parse: (text) => parseJson<unknown>(text, "[word_dict]"),
};

