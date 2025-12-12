import type { PromptDefinition } from "../../core/promptRunner";
import type {
  RoleplayChatHistoryMessage,
  RoleplayChatRequest,
} from "../../../../../../src/types/roleplay";
import { loadPromptTemplate } from "../template";

const CHAT_HISTORY_LIMIT = 8;

const template = loadPromptTemplate({
  moduleUrl: import.meta.url,
  relativePathFromModuleDir: "./chat.md",
  fallbackPathFromCwd: "electron/main/api/llm/prompts/interactive_roleplay/chat.md",
  missingMessage: "服务器缺少角色聊天提示模板，请联系开发者",
});

const replaceAllCompat = (input: string, search: string, replacement: string) =>
  input.split(search).join(replacement);

const sanitizeHistory = (
  history: RoleplayChatHistoryMessage[] | undefined
): RoleplayChatHistoryMessage[] => {
  if (!Array.isArray(history) || history.length === 0) return [];

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

const buildChatSystemPrompt = (payload: RoleplayChatRequest): string => {
  const catchphraseText =
    payload.character.catchphrases && payload.character.catchphrases.length > 0
      ? payload.character.catchphrases.join(", ")
      : "[]";

  let out = template;
  out = replaceAllCompat(out, "{character_name}", payload.character.name);
  out = replaceAllCompat(out, "{book_title}", payload.bookTitle || "the book");
  out = replaceAllCompat(
    out,
    "{current_chapter_title}",
    payload.chapterTitle || "this chapter"
  );
  out = replaceAllCompat(
    out,
    "{character_personality}",
    payload.character.personality || "N/A"
  );
  out = replaceAllCompat(
    out,
    "{speaking_style}",
    payload.character.speakingStyle || "N/A"
  );
  out = replaceAllCompat(out, "{catchphrases}", catchphraseText);
  out = replaceAllCompat(
    out,
    "{user_role}",
    payload.character.userRelationship ||
      "a friendly reader who just entered the scene"
  );
  out = replaceAllCompat(
    out,
    "{chapter_content_or_summary}",
    payload.chapterContentOrSummary || "No content provided."
  );
  out = replaceAllCompat(out, "{target_language}", payload.targetLanguage || "ja-JP");
  out = replaceAllCompat(
    out,
    "{user_proficiency_level}",
    payload.userProficiencyLevel || "B1 - Intermediate"
  );
  return out;
};

export const interactiveRoleplayChatPrompt: PromptDefinition<
  RoleplayChatRequest,
  string
> = {
  id: "interactive_roleplay_chat",
  build: (payload) => {
    const systemPrompt = buildChatSystemPrompt(payload);
    const history = sanitizeHistory(payload.history);

    return {
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: payload.message },
      ],
    };
  },
  parse: (text) => text.trim(),
};
