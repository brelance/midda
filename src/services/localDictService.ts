/**
 * Local dictionary service — thin wrapper around window.api.localDict
 * with formatting helpers for UI consumption.
 */
import type {
  DictEntry,
  DictSense,
  LocalDictResult,
} from "../types/localDict";

// ── Display-ready data ──────────────────────────────────────────────────────

export interface DictDisplayData {
  found: boolean;
  /** Best kanji headword (falls back to kana if no kanji) */
  headword: string;
  /** Primary kana reading */
  reading: string;
  /** Part-of-speech tags for the first sense */
  pos: string[];
  /** English glosses (aggregated from first few senses) */
  glosses: string[];
  /** Structured senses for richer rendering */
  senses: DictSense[];
  /** All matched entries (for possible "more results" expansion) */
  allEntries: DictEntry[];
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Maximum number of senses shown by default in the popover */
const MAX_DISPLAY_SENSES = 5;

// ── Core lookup ─────────────────────────────────────────────────────────────

/**
 * Look up a word in the local JMdict database.
 * Returns `null` if the API is unavailable (e.g. preload not loaded).
 */
export async function lookupDict(
  word: string
): Promise<LocalDictResult | null> {
  try {
    if (!window.api?.localDict?.lookup) return null;
    return await window.api.localDict.lookup(word);
  } catch (err) {
    console.warn("[localDictService] lookup error:", err);
    return null;
  }
}

// ── Formatting ──────────────────────────────────────────────────────────────

/**
 * Convert a raw `LocalDictResult` into display-ready data.
 * Picks the best (most common) entry and extracts headword / reading / glosses.
 */
export function formatDictResult(result: LocalDictResult): DictDisplayData {
  if (!result.found || result.entries.length === 0) {
    return {
      found: false,
      headword: "",
      reading: "",
      pos: [],
      glosses: [],
      senses: [],
      allEntries: [],
    };
  }

  // Prefer common entries
  const sorted = [...result.entries].sort((a, b) => {
    if (a.common !== b.common) return a.common ? -1 : 1;
    return 0;
  });
  const best = sorted[0];

  // Headword: prefer first common kanji, else first kanji, else first kana
  const headword =
    best.kanji.find((k) => k.common)?.text ??
    best.kanji[0]?.text ??
    best.kana[0]?.text ??
    "";

  // Reading: first kana that applies to the chosen headword
  const reading =
    best.kana.find(
      (k) =>
        k.appliesToKanji.length === 0 ||
        k.appliesToKanji.includes(headword) ||
        k.appliesToKanji.includes("*")
    )?.text ??
    best.kana[0]?.text ??
    "";

  // Senses (cap at MAX_DISPLAY_SENSES)
  const senses = best.senses.slice(0, MAX_DISPLAY_SENSES);

  // POS from first sense
  const pos = senses[0]?.partOfSpeech ?? [];

  // Flat gloss list (for compact display)
  const glosses = senses.flatMap((s) =>
    s.glosses.filter((g) => g.lang === "eng").map((g) => g.text)
  );

  return {
    found: true,
    headword,
    reading,
    pos,
    glosses,
    senses,
    allEntries: sorted,
  };
}

// ── Example sentences ───────────────────────────────────────────────────────

import type { DictExample } from "../types/localDict";

/**
 * Look up example sentences for a JMdict entry.
 * Returns `null` if the API is unavailable.
 */
export async function lookupExamples(
  entryId: string,
  limit?: number
): Promise<DictExample[] | null> {
  try {
    if (!window.api?.localDict?.lookupExamples) return null;
    return (await window.api.localDict.lookupExamples(entryId, limit)) as DictExample[];
  } catch (err) {
    console.warn("[localDictService] lookupExamples error:", err);
    return null;
  }
}
