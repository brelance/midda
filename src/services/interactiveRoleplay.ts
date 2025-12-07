import type {
  RoleplayAnalysisPayload,
  RoleplayCharacterProfile,
  RoleplayChatRequest,
  RoleplayChatResponse,
} from "../types/roleplay";

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

export async function analyzeChapterForRoleplay(
  payload: RoleplayAnalysisPayload
): Promise<RoleplayCharacterProfile[]> {
  if (!window?.api?.interactiveRoleplay?.analyzeChapter) {
    throw new Error("交互式聊天接口尚未就绪");
  }

  const response = await window.api.interactiveRoleplay.analyzeChapter(payload);
  const characters = normalizeCharactersFromResponse(response);

  if (!characters || characters.length === 0) {
    throw new Error("未能解析到角色信息，请稍后重试");
  }

  return characters;
}

export async function sendRoleplayMessage(
  payload: RoleplayChatRequest
): Promise<RoleplayChatResponse> {
  if (!window?.api?.interactiveRoleplay?.sendMessage) {
    throw new Error("角色扮演聊天接口尚未就绪");
  }
  return window.api.interactiveRoleplay.sendMessage(payload);
}
