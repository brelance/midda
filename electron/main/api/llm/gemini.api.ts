import { ipcMain, IpcMainInvokeEvent } from "electron";
import { proxyFetch as fetch } from "../../utils/proxy";
import {
  GeminiNonStreamResponse,
  TokenData,
} from "../../../../src/types/types";
const API_KEY: string | undefined = process.env.API_KEY;
const API_URL: string = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";

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

function normalizeLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  return language.split("-")[0]?.toLowerCase();
}

function buildPrompt(sentence: string, language?: string): string {
  const normalized = normalizeLanguage(language);
  const builder = (normalized && LANGUAGE_PROMPTS[normalized]) || DEFAULT_PROMPT;
  return builder(sentence);
}

export function setupGeminiApiHandler(): void {
  // 使用 ipcMain.handle
  ipcMain.handle(
    "gemini-tokens-request",
    async (
      _event: IpcMainInvokeEvent,
      { sentence, language }: { sentence: string; language?: string }
    ): Promise<TokenData[]> => {
      if (!API_KEY) {
        throw new Error("API_KEY is not defined in environment variables.");
      }

      if (!sentence || typeof sentence !== "string") {
        throw new Error("缺少待分析的句子");
      }

      const prompt = buildPrompt(sentence, language);

      console.log(
        `[Gemini] Using language=${language ?? "auto"} prompt for sentence:`,
        sentence
      );

      try {
        const payload = {
          model: MODEL_NAME,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Gemini API Error:", errorText);
          throw new Error(`API请求失败: ${response.status} ${errorText}`);
        }

        const result = (await response.json()) as GeminiNonStreamResponse;
        let text = result.choices?.[0]?.message?.content;

        if (text) {
          text = text.replace(/```json\n?|\n?```/g, "").trim();
          try {
            const tokens = JSON.parse(text) as TokenData[];
            if (tokens.length > 0) {
              console.log(tokens);
              return tokens; // 直接返回结果
            } else {
              throw new Error("Non-streaming response contained no tokens.");
            }
          } catch (parseError) {
            console.error("Error parsing tokens:", parseError);
            throw new Error(
              `Failed to parse tokens from response: ${
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError)
              }`
            );
          }
        } else {
          throw new Error(
            "Non-streaming response did not contain expected content."
          );
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        // 抛出错误，ipcRenderer.invoke 会捕获到这个 rejection
        throw error;
      }
    }
  );
}
