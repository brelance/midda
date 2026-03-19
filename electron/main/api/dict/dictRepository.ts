/**
 * JMdict dictionary data access layer.
 *
 * All queries run against the read-only jmdict.db.
 */
import type { Database as DB } from "better-sqlite3";
import { getDictDb } from "./dictDatabase";

// ── Public types ────────────────────────────────────────────────────────────

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
  related: unknown[];
  antonym: unknown[];
  glosses: DictGloss[];
}

export interface DictEntry {
  id: string;
  common: boolean;
  kanji: DictKanji[];
  kana: DictKana[];
  senses: DictSense[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function parseJsonUnknown(value: string | null): unknown[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

// ── Row types (raw SQLite) ──────────────────────────────────────────────────

interface EntryRow {
  id: string;
  common: number;
}

interface KanjiRow {
  text: string;
  common: number;
  tags: string | null;
}

interface KanaRow {
  text: string;
  common: number;
  tags: string | null;
  applies_to_kanji: string | null;
}

interface SenseRow {
  id: number;
  pos: string | null;
  field: string | null;
  misc: string | null;
  dialect: string | null;
  info: string | null;
  related: string | null;
  antonym: string | null;
}

interface GlossRow {
  text: string;
  lang: string;
  type: string | null;
}

// ── Repository ──────────────────────────────────────────────────────────────

function buildEntry(db: DB, entryRow: EntryRow): DictEntry {
  const kanjiRows = db
    .prepare(`SELECT text, common, tags FROM kanji WHERE entry_id = ?`)
    .all(entryRow.id) as KanjiRow[];

  const kanaRows = db
    .prepare(
      `SELECT text, common, tags, applies_to_kanji FROM kana WHERE entry_id = ?`
    )
    .all(entryRow.id) as KanaRow[];

  const senseRows = db
    .prepare(
      `SELECT id, pos, field, misc, dialect, info, related, antonym FROM senses WHERE entry_id = ?`
    )
    .all(entryRow.id) as SenseRow[];

  const senses: DictSense[] = senseRows.map((s) => {
    const glossRows = db
      .prepare(`SELECT text, lang, type FROM glosses WHERE sense_id = ?`)
      .all(s.id) as GlossRow[];

    return {
      partOfSpeech: parseJsonArray(s.pos),
      field: parseJsonArray(s.field),
      misc: parseJsonArray(s.misc),
      dialect: parseJsonArray(s.dialect),
      info: parseJsonArray(s.info),
      related: parseJsonUnknown(s.related),
      antonym: parseJsonUnknown(s.antonym),
      glosses: glossRows.map((g) => ({
        lang: g.lang,
        text: g.text,
        type: g.type,
      })),
    };
  });

  return {
    id: entryRow.id,
    common: entryRow.common === 1,
    kanji: kanjiRows.map((k) => ({
      text: k.text,
      common: k.common === 1,
      tags: parseJsonArray(k.tags),
    })),
    kana: kanaRows.map((k) => ({
      text: k.text,
      common: k.common === 1,
      tags: parseJsonArray(k.tags),
      appliesToKanji: parseJsonArray(k.applies_to_kanji),
    })),
    senses,
  };
}

/**
 * Look up a word by exact match on kanji or kana text.
 * Returns all matching entries (there can be multiple for homonyms).
 */
export function lookupExact(word: string): DictEntry[] {
  const db = getDictDb();

  // Find entry IDs via kanji match
  const kanjiEntryIds = (
    db
      .prepare(`SELECT DISTINCT entry_id FROM kanji WHERE text = ?`)
      .all(word) as { entry_id: string }[]
  ).map((r) => r.entry_id);

  // Find entry IDs via kana match
  const kanaEntryIds = (
    db
      .prepare(`SELECT DISTINCT entry_id FROM kana WHERE text = ?`)
      .all(word) as { entry_id: string }[]
  ).map((r) => r.entry_id);

  // Merge unique IDs (kanji matches first)
  const seen = new Set<string>();
  const entryIds: string[] = [];
  for (const id of [...kanjiEntryIds, ...kanaEntryIds]) {
    if (!seen.has(id)) {
      seen.add(id);
      entryIds.push(id);
    }
  }

  // Build full entries
  return entryIds.map((id) => {
    const row = db
      .prepare(`SELECT id, common FROM entries WHERE id = ?`)
      .get(id) as EntryRow;
    return buildEntry(db, row);
  });
}

/**
 * Full-text search across kanji, kana, and English glosses.
 * Returns up to `limit` results.
 */
export function lookupFts(query: string, limit = 10): DictEntry[] {
  const db = getDictDb();

  // FTS5 query — try prefix match
  const ftsQuery = `${query}*`;
  const rows = db
    .prepare(
      `SELECT rowid FROM dict_fts WHERE dict_fts MATCH ? LIMIT ?`
    )
    .all(ftsQuery, limit) as { rowid: number }[];

  // Map rowids back to entry IDs via direct rowid lookup
  const entryRows = rows
    .map((r) => {
      return db
        .prepare(`SELECT id, common FROM entries WHERE rowid = ?`)
        .get(r.rowid) as EntryRow | undefined;
    })
    .filter((r): r is EntryRow => r !== undefined);

  return entryRows.map((row) => buildEntry(db, row));
}

/**
 * Main lookup function: tries exact match first, falls back to FTS.
 */
export function lookupWord(word: string): DictEntry[] {
  const exact = lookupExact(word);
  if (exact.length > 0) return exact;
  return lookupFts(word, 5);
}

/**
 * Get the tags mapping (tag code → description).
 */
export function getDictTags(): Record<string, string> {
  const db = getDictDb();
  const row = db
    .prepare(`SELECT value FROM meta WHERE key = 'tags'`)
    .get() as { value: string } | undefined;
  if (!row) return {};
  try {
    return JSON.parse(row.value);
  } catch {
    return {};
  }
}
