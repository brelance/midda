/**
 * Frontend-side types mirroring the Electron backend's JMdict dictionary types.
 * These are kept in sync with electron/main/api/dict/dictRepository.ts
 * but live separately to avoid importing Electron modules in renderer code.
 */

export interface DictKanji {
  text: string;
  common: boolean;
  tags: string[];
}

export interface DictKana {
  text: string;
  common: boolean;
  tags: string[];
  appliesToKanji: string[];
}

export interface DictGloss {
  lang: string;
  text: string;
  type: string | null;
}

export interface DictSense {
  partOfSpeech: string[];
  field: string[];
  misc: string[];
  dialect: string[];
  info: string[];
  glosses: DictGloss[];
}

export interface DictEntry {
  id: string;
  common: boolean;
  kanji: DictKanji[];
  kana: DictKana[];
  senses: DictSense[];
}

export interface LocalDictResult {
  found: boolean;
  entries: DictEntry[];
  tags?: Record<string, string>;
}
