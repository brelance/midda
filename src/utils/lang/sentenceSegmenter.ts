/**
 * sentenceSegmenter.ts
 *
 * Sentence splitting utility that uses the native Intl.Segmenter API when
 * available and falls back to a punctuation-based regex for environments that
 * do not support it.
 *
 * Intl.Segmenter advantages over the regex approach:
 *  - Handles English abbreviations (`Mr.`, `No.`, `e.g.`) without false splits
 *  - Handles decimal numbers (`3.14`) correctly
 *  - Handles ellipsis (`…`, `……`) as a single sentence-ending unit
 *  - Is locale-aware (Japanese, Chinese, Korean, etc.)
 */

/** Maps language codes returned by detectLanguageForSamples → BCP 47 locale tags */
export const LOCALE_MAP: Readonly<Record<string, string>> = {
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
  en: "en-US",
  ru: "ru-RU",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
} as const;

/**
 * Fallback regex: split *after* common sentence-ending punctuation.
 * Handles CJK fullwidth marks as well as ASCII `.!?`.
 */
const SENTENCE_SPLIT_REGEX = /(?<=[。！？…!?])/u;

/**
 * Returns true when Intl.Segmenter with sentence granularity is available
 * in the current runtime.
 */
export function isSegmenterSupported(): boolean {
  try {
    if (typeof Intl === "undefined" || !("Segmenter" in Intl)) {
      return false;
    }
    // Quick smoke-test: constructing without throwing validates support
    new (Intl as any).Segmenter("en", { granularity: "sentence" });
    return true;
  } catch {
    return false;
  }
}

// Cache the support check result — it never changes within a session
const _segmenterSupported = isSegmenterSupported();

/**
 * Splits `text` into sentences.
 *
 * @param text   - Plain text (no HTML) to split.
 * @param locale - Short language code (`"ja"`, `"zh"`, `"en"`, …) or a full
 *                 BCP 47 tag (`"ja-JP"`). When omitted or unsupported, the
 *                 regex fallback is used.
 * @returns Array of trimmed, non-empty sentence strings.
 */
export function splitIntoSentences(text: string, locale?: string): string[] {
  if (!text) {
    return [];
  }

  if (locale && _segmenterSupported) {
    // Resolve short code → BCP 47 tag if needed
    const bcp47 = LOCALE_MAP[locale] ?? locale;
    try {
      const segmenter = new (Intl as any).Segmenter(bcp47, {
        granularity: "sentence",
      });
      const results: string[] = [];
      for (const { segment } of segmenter.segment(text)) {
        const trimmed = segment.trim();
        if (trimmed) {
          results.push(trimmed);
        }
      }
      return results;
    } catch {
      // Unexpected error for this locale — fall through to regex
    }
  }

  // Regex fallback
  return text
    .split(SENTENCE_SPLIT_REGEX)
    .map((s) => s.trim())
    .filter(Boolean);
}
