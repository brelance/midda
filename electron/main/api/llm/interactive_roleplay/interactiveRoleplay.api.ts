import { ipcMain } from "electron";
import type {
  RoleplayAnalysisPayload,
  RoleplayCharacterProfile,
  RoleplayChatRequest,
} from "../../../../../src/types/roleplay";
import { getLLMClient } from "../core/llmFactory";
import { runPrompt } from "../core/promptRunner";
import { interactiveRoleplayAnalyzePrompt } from "../prompts/interactive_roleplay/analyze.prompt";
import { interactiveRoleplayChatPrompt } from "../prompts/interactive_roleplay/chat.prompt";

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
    history: Array.isArray(candidate.history) ? candidate.history : [],
  };
};

export function setupInteractiveRoleplayApiHandler(): void {
  ipcMain.handle(
    "interactive-roleplay:analyze",
    async (_event, rawPayload: unknown) => {
      const payload = normalizePayload(rawPayload);
      const model =
        typeof (rawPayload as Partial<RoleplayAnalysisPayload>)?.model ===
        "string"
          ? (rawPayload as Partial<RoleplayAnalysisPayload>).model
          : undefined;

      try {
        const characters = await runPrompt(
          getLLMClient(),
          interactiveRoleplayAnalyzePrompt,
          { bookContent: payload.bookContent },
          { model }
        );
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
      const payload = normalizeChatPayload(rawPayload);
      const model =
        typeof (rawPayload as Partial<RoleplayChatRequest>)?.model === "string"
          ? (rawPayload as Partial<RoleplayChatRequest>).model
          : undefined;

      try {
        const reply = await runPrompt(
          getLLMClient(),
          interactiveRoleplayChatPrompt,
          payload,
          { model }
        );

        if (!reply) throw new Error("未能获取到聊天回复，请稍后重试");

        return { reply };
      } catch (error) {
        console.error("[interactive-roleplay] 角色聊天失败:", error);
        const message =
          error instanceof Error ? error.message : "角色聊天出错，请稍后重试";
        throw new Error(message);
      }
    }
  );
}
