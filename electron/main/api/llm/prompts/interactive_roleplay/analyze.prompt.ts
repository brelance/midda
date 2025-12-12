import type { PromptDefinition } from "../../core/promptRunner";
import type { RoleplayCharacterProfile } from "../../../../../../src/types/roleplay";
import { loadPromptTemplate } from "../template";

const MAX_CONTENT_LENGTH = 14000;
const TRUNCATE_THRESHOLD = 15000;

const template = loadPromptTemplate({
  moduleUrl: import.meta.url,
  relativePathFromModuleDir: "./analyze.md",
  fallbackPathFromCwd: "electron/main/api/llm/prompts/interactive_roleplay/analyze.md",
  missingMessage: "服务器缺少角色分析提示模板，请联系开发者",
});

const toTrimmedString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return value.toString();
  return "";
};

const normalizeCharacterProfile = (
  input: unknown
): RoleplayCharacterProfile | null => {
  if (!input || typeof input !== "object") return null;

  const candidate = input as Record<string, unknown>;
  const name =
    toTrimmedString(candidate.name) || toTrimmedString(candidate.character_name);
  if (!name) return null;

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

  if (!Array.isArray(rawCharacters)) return [];

  return rawCharacters
    .map((entry) => normalizeCharacterProfile(entry))
    .filter((entry): entry is RoleplayCharacterProfile => Boolean(entry));
};

const buildAnalyzePrompt = (content: string): string => {
  if (content.length <= TRUNCATE_THRESHOLD) {
    return template.replace("{book_content}", content);
  }

  const trimmed = `${content.slice(0, MAX_CONTENT_LENGTH)}\n\n...[truncated]`;
  return template.replace("{book_content}", trimmed);
};

export const interactiveRoleplayAnalyzePrompt: PromptDefinition<
  { bookContent: string },
  RoleplayCharacterProfile[]
> = {
  id: "interactive_roleplay_analyze",
  build: ({ bookContent }) => ({
    messages: [{ role: "user", content: buildAnalyzePrompt(bookContent) }],
    responseFormat: { type: "json_object" },
  }),
  parse: (text) => normalizeCharactersFromResponse(text),
};

