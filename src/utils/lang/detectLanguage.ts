const LANGUAGE_RULES: Array<{
  code: string;
  pattern: RegExp;
}> = [
  { code: "ja", pattern: /[\u3040-\u30ff\u31f0-\u31ff]/g }, // Hiragana + Katakana
  { code: "zh", pattern: /[\u4e00-\u9fff]/g }, // CJK Unified Ideographs
  { code: "ko", pattern: /[\uac00-\ud7af]/g }, // Hangul syllables
  { code: "ru", pattern: /[\u0400-\u04ff]/g }, // Cyrillic
  { code: "en", pattern: /[A-Za-z]/g }, // Basic Latin alphabet
];

const MINIMUM_CHAR_THRESHOLD = 12;
const MINIMUM_CONFIDENCE = 0.2;

export interface DetectedLanguageResult {
  languageCode?: string;
  confidence: number;
  sampleSize: number;
  counts: Record<string, number>;
}

export function detectLanguageForSamples(
  samples: string[]
): DetectedLanguageResult {
  const joined = samples.filter(Boolean).join(" ");
  const counts: Record<string, number> = {};
  LANGUAGE_RULES.forEach((rule) => {
    const matches = joined.match(rule.pattern);
    counts[rule.code] = matches ? matches.length : 0;
  });

  const totalMatches = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0
  );

  if (totalMatches < MINIMUM_CHAR_THRESHOLD) {
    return {
      languageCode: undefined,
      confidence: 0,
      sampleSize: joined.length,
      counts,
    };
  }

  let bestCode: string | undefined;
  let bestCount = 0;
  Object.entries(counts).forEach(([code, value]) => {
    if (value > bestCount) {
      bestCode = code;
      bestCount = value;
    }
  });

  const confidence =
    totalMatches > 0 ? Number((bestCount / totalMatches).toFixed(2)) : 0;

  if (!bestCode || confidence < MINIMUM_CONFIDENCE) {
    return {
      languageCode: undefined,
      confidence,
      sampleSize: joined.length,
      counts,
    };
  }

  return {
    languageCode: bestCode,
    confidence,
    sampleSize: joined.length,
    counts,
  };
}
