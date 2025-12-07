import { ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import fs from "fs";
import path from "path";
import { proxyFetch as fetch } from "../../../utils/proxy";
import type { RoleplayAnalysisPayload, RoleplayCharacterProfile } from "../../../../../src/types/roleplay";
import type { GeminiNonStreamResponse } from "../../../../../src/types/types";

const API_KEY: string | undefined = process.env.API_KEY;
const API_URL: string = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";
const MAX_CONTENT_LENGTH = 14000;
const TRUNCATE_THRESHOLD = 15000;

const resolveAnalyzePromptPath = (): string => {
  const candidates = [
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../prompts/interactive_roleplay/analyze.md"
    ),
    path.resolve(
      process.cwd(),
      "electron/main/api/llm/prompts/interactive_roleplay/analyze.md"
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("服务器缺少角色分析提示模板，请联系开发者");
};

const analyzePromptPath = resolveAnalyzePromptPath();

const loadAnalyzeTemplate = (): string => {
  try {
    return fs.readFileSync(analyzePromptPath, "utf-8");
  } catch (error) {
    console.error("[interactive-roleplay] 无法读取 analyze prompt 文件:", error);
    throw new Error("服务器缺少角色分析提示模板，请联系开发者");
  }
};

const analyzeTemplate = loadAnalyzeTemplate();

const toTrimmedString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return "";
};

const normalizeCharacterProfile = (
  input: unknown
): RoleplayCharacterProfile | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const name =
    toTrimmedString(candidate.name) || toTrimmedString(candidate.character_name);

  if (!name) {
    return null;
  }

  const rawCatchphrases =
    candidate.catchphrases ?? candidate.catchPhrases ?? candidate.phrases;
  const catchphrases = Array.isArray(rawCatchphrases)
    ? rawCatchphrases
        .map((item) => toTrimmedString(item))
        .filter((item) => item.length > 0)
    : rawCatchphrases
      ? [toTrimmedString(rawCatchphrases)].filter((item) => item.length > 0)
      : [];

  return {
    name,
    personality: toTrimmedString(candidate.personality ?? candidate.traits),
    speakingStyle: toTrimmedString(
      candidate.speaking_style ?? candidate.speakingStyle ?? candidate.speech
    ),
    catchphrases,
    userRelationship: toTrimmedString(
      candidate.user_relationship ??
        candidate.relationship ??
        candidate.userRelationship
    ),
  };
};

const normalizeCharactersFromResponse = (
  response: unknown
): RoleplayCharacterProfile[] => {
  let parsed = response;
  if (typeof response === "string") {
    try {
      parsed = JSON.parse(response);
    } catch {
      parsed = null;
    }
  }

  const rawCharacters = Array.isArray((parsed as any)?.characters)
    ? (parsed as any).characters
    : Array.isArray(parsed)
      ? parsed
      : [];

  if (!Array.isArray(rawCharacters)) {
    return [];
  }

  return rawCharacters
    .map((entry) => normalizeCharacterProfile(entry))
    .filter((entry): entry is RoleplayCharacterProfile => Boolean(entry));
};

const normalizePayload = (payload: unknown): RoleplayAnalysisPayload => {
  if (!payload || typeof payload !== "object") {
    throw new Error("缺少章节信息");
  }
  const { bookId, bookTitle, chapterId, chapterTitle, bookContent } =
    payload as Partial<RoleplayAnalysisPayload>;

  if (!bookId || typeof bookId !== "string") {
    throw new Error("缺少 bookId");
  }
  if (!chapterId || typeof chapterId !== "string") {
    throw new Error("缺少 chapterId");
  }
  if (!bookContent || typeof bookContent !== "string") {
    throw new Error("缺少章节内容");
  }

  return {
    bookId,
    bookTitle: typeof bookTitle === "string" ? bookTitle : "",
    chapterId,
    chapterTitle: typeof chapterTitle === "string" ? chapterTitle : "",
    bookContent,
  };
};

const buildAnalyzePrompt = (content: string): string => {
  if (content.length <= TRUNCATE_THRESHOLD) {
    return analyzeTemplate.replace("{book_content}", content);
  }

  const trimmed = `${content.slice(0, MAX_CONTENT_LENGTH)}\n\n...[truncated]`;
  return analyzeTemplate.replace("{book_content}", trimmed);
};

export function setupInteractiveRoleplayApiHandler(): void {
  ipcMain.handle(
    "interactive-roleplay:analyze",
    async (_event, rawPayload: unknown) => {
      if (!API_KEY) {
        throw new Error("API_KEY is not defined in environment variables.");
      }

      const payload = normalizePayload(rawPayload);
      const prompt = buildAnalyzePrompt(payload.bookContent);

      try {
        const requestBody = {
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
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "[interactive-roleplay] API请求失败:",
            response.status,
            errorText
          );
          throw new Error("角色分析请求失败，请稍后重试");
        }

        const result = (await response.json()) as GeminiNonStreamResponse;
        let text = result.choices?.[0]?.message?.content ?? "";
        text = text.replace(/```json\n?|\n?```/g, "").trim();

        const characters = normalizeCharactersFromResponse(text);
        if (!characters || characters.length === 0) {
          throw new Error("未能解析到角色信息，请稍后重试");
        }

        return { characters };
      } catch (error) {
        console.error("[interactive-roleplay] 章节分析失败:", error);
        const message =
          error instanceof Error ? error.message : "角色分析出错，请稍后重试";
        throw new Error(message);
      }
    }
  );
}
