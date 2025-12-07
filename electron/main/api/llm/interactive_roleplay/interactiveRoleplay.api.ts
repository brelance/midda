import { ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import fs from "fs";
import path from "path";
import { proxyFetch as fetch } from "../../../utils/proxy";
import type {
  RoleplayAnalysisPayload,
  RoleplayCharacterProfile,
  RoleplayChatRequest,
  RoleplayChatHistoryMessage,
} from "../../../../../src/types/roleplay";
import type { GeminiNonStreamResponse } from "../../../../../src/types/types";

const API_KEY: string | undefined = process.env.API_KEY;
const API_URL: string = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";
const MAX_CONTENT_LENGTH = 14000;
const TRUNCATE_THRESHOLD = 15000;
const CHAT_HISTORY_LIMIT = 8;

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
const resolveChatPromptPath = (): string => {
  const candidates = [
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../prompts/interactive_roleplay/chat.md"
    ),
    path.resolve(
      process.cwd(),
      "electron/main/api/llm/prompts/interactive_roleplay/chat.md"
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("服务器缺少角色聊天提示模板，请联系开发者");
};

const chatPromptPath = resolveChatPromptPath();

const loadAnalyzeTemplate = (): string => {
  try {
    return fs.readFileSync(analyzePromptPath, "utf-8");
  } catch (error) {
    console.error("[interactive-roleplay] 无法读取 analyze prompt 文件:", error);
    throw new Error("服务器缺少角色分析提示模板，请联系开发者");
  }
};

const loadChatTemplate = (): string => {
  try {
    return fs.readFileSync(chatPromptPath, "utf-8");
  } catch (error) {
    console.error("[interactive-roleplay] 无法读取 chat prompt 文件:", error);
    throw new Error("服务器缺少角色聊天提示模板，请联系开发者");
  }
};

const analyzeTemplate = loadAnalyzeTemplate();
const chatTemplate = loadChatTemplate();

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

const sanitizeHistory = (
  history: RoleplayChatHistoryMessage[] | undefined
): RoleplayChatHistoryMessage[] => {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }
  return history
    .filter(
      (item): item is RoleplayChatHistoryMessage =>
        Boolean(item) &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
    )
    .slice(-CHAT_HISTORY_LIMIT)
    .map((item) => ({ role: item.role, content: item.content.trim() }));
};

const normalizeChatPayload = (payload: unknown): RoleplayChatRequest => {
  if (!payload || typeof payload !== "object") {
    throw new Error("缺少聊天请求参数");
  }

  const candidate = payload as Partial<RoleplayChatRequest>;
  if (!candidate.character || typeof candidate.character !== "object") {
    throw new Error("缺少角色信息");
  }

  const character = normalizeCharacterProfile(candidate.character);
  if (!character) {
    throw new Error("无效的角色信息");
  }

  const message =
    typeof candidate.message === "string" ? candidate.message.trim() : "";
  if (!message) {
    throw new Error("聊天消息不能为空");
  }

  return {
    character,
    bookTitle: typeof candidate.bookTitle === "string" ? candidate.bookTitle : "",
    chapterTitle:
      typeof candidate.chapterTitle === "string" ? candidate.chapterTitle : "",
    chapterContentOrSummary:
      typeof candidate.chapterContentOrSummary === "string"
        ? candidate.chapterContentOrSummary
        : "",
    targetLanguage:
      typeof candidate.targetLanguage === "string" && candidate.targetLanguage
        ? candidate.targetLanguage
        : "ja-JP",
    userProficiencyLevel:
      typeof candidate.userProficiencyLevel === "string" &&
      candidate.userProficiencyLevel
        ? candidate.userProficiencyLevel
        : "B1 - Intermediate",
    message,
    history: sanitizeHistory(candidate.history),
  };
};

const buildChatPrompt = (payload: RoleplayChatRequest): string => {
  const catchphraseText =
    payload.character.catchphrases && payload.character.catchphrases.length > 0
      ? payload.character.catchphrases.join(", ")
      : "[]";

  return chatTemplate
    .replace("{character_name}", payload.character.name)
    .replace("{book_title}", payload.bookTitle || "the book")
    .replace("{current_chapter_title}", payload.chapterTitle || "this chapter")
    .replace("{character_personality}", payload.character.personality || "N/A")
    .replace("{speaking_style}", payload.character.speakingStyle || "N/A")
    .replace("{catchphrases}", catchphraseText)
    .replace(
      "{user_role}",
      payload.character.userRelationship ||
        "a friendly reader who just entered the scene"
    )
    .replace(
      "{chapter_content_or_summary}",
      payload.chapterContentOrSummary || "No content provided."
    )
    .replace("{target_language}", payload.targetLanguage)
    .replace("{user_proficiency_level}", payload.userProficiencyLevel);
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

  ipcMain.handle(
    "interactive-roleplay:sendMessage",
    async (_event, rawPayload: unknown) => {
      if (!API_KEY) {
        throw new Error("API_KEY is not defined in environment variables.");
      }

      const payload = normalizeChatPayload(rawPayload);
      const systemPrompt = buildChatPrompt(payload);
      const messages: { role: "system" | "user" | "assistant"; content: string }[] =
        [
          { role: "system", content: systemPrompt },
          ...payload.history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: "user", content: payload.message },
        ];

      try {
        const requestBody = {
          model: MODEL_NAME,
          messages,
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
            "[interactive-roleplay] 聊天 API 请求失败:",
            response.status,
            errorText
          );
          throw new Error("角色聊天请求失败，请稍后重试");
        }

        const result = (await response.json()) as GeminiNonStreamResponse;
        let text = result.choices?.[0]?.message?.content ?? "";
        text = text.replace(/```(json)?\n?|\n?```/g, "").trim();

        if (!text) {
          throw new Error("未能获取到聊天回复，请稍后重试");
        }

        return { reply: text };
      } catch (error) {
        console.error("[interactive-roleplay] 角色聊天失败:", error);
        const message =
          error instanceof Error ? error.message : "角色聊天出错，请稍后重试";
        throw new Error(message);
      }
    }
  );
}
