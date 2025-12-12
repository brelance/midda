import type { TokenData } from "../../../../../src/types/types";
import type { PromptDefinition } from "../core/promptRunner";
import { parseJson } from "../core/json";

type LanguagePromptBuilder = (sentence: string) => string;

const LANGUAGE_PROMPTS: Record<string, LanguagePromptBuilder> = {
  ja: (sentence) => `请对以下日语句子进行详细的词法分析，并以JSON数组格式返回结果。每个对象应包含以下字段："word", "pos", "furigana", "romaji"。
    
请特别注意以下分析要求：
1. 将助动词与对应动词正确结合。如"食べた"应作为一个单词，而不是分开为"食べ"和"た"。
2. 正确识别动词的时态变化，如"いた"是"いる"的过去时，应作为一个完整单词处理。
3. 合理处理助词，应当与前后词汇适当分离。
4. 避免过度分词，特别是对于构成一个语法或语义单位的组合。
5. 对于复合词，如"持って行く"，根据语义和使用习惯确定是作为一个词还是分开处理。

确保输出是严格的JSON格式，不包含任何markdown或其他非JSON字符。

待解析句子： "${sentence}"`,
  zh: (sentence) => `请将下面的中文句子进行分词与词性分析，并以 JSON 数组返回。每个对象需要包含 "word", "pos", "pinyin" 三个字段，其中 "pinyin" 为可选字段。如果遇到成语或固定搭配，请尽量保持为一个词。最终输出必须是合法 JSON，不要包含多余文本。

句子: "${sentence}"`,
  en: (sentence) => `Please perform detailed lexical analysis on the following English sentence. Return a JSON array where each item includes "word", "pos", "lemma", and "explanation". Combine contractions (e.g. "don't") into a single word entry with its parts explained in the "explanation". Output must be valid JSON with no markdown.

Sentence: "${sentence}"`,
  ko: (sentence) => `다음 한국어 문장을 형태소 단위로 분석하고 JSON 배열로 반환하세요. 각 객체는 "word", "pos", "romanization" 필드를 포함해야 하며, 합성 동사나 보조 용언은 의미 단위에 따라 적절히 분리하거나 결합해 주세요. 출력은 반드시 JSON 형식이어야 하며 다른 텍스트를 포함하지 마세요.

문장: "${sentence}"`,
};

const DEFAULT_PROMPT: LanguagePromptBuilder = (sentence) => `Analyze the following sentence and return a JSON array describing each token. Each entry should contain "word", "pos", and "explanation". Keep multi-word expressions together when they form a semantic unit. The response must be valid JSON without markdown fences.

Sentence: "${sentence}"`;

const normalizeLanguage = (language?: string): string | undefined => {
  if (!language) return undefined;
  return language.split("-")[0]?.toLowerCase();
};

const buildPrompt = (sentence: string, language?: string): string => {
  const normalized = normalizeLanguage(language);
  const builder = (normalized && LANGUAGE_PROMPTS[normalized]) || DEFAULT_PROMPT;
  return builder(sentence);
};

export const tokensPrompt: PromptDefinition<
  { sentence: string; language?: string },
  TokenData[]
> = {
  id: "tokens",
  build: ({ sentence, language }) => ({
    messages: [{ role: "user", content: buildPrompt(sentence, language) }],
    responseFormat: { type: "json_array" },
  }),
  parse: (text) => parseJson<TokenData[]>(text, "[tokens]"),
};
