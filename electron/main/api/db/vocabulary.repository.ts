import crypto from "node:crypto";
import db from "./database";

// ── Types ────────────────────────────────────────────────────────────────────

export type VocabStatus = "new" | "learning" | "mastered";

export interface VocabularyRecord {
  id: number;
  word: string;
  baseForm: string;
  reading?: string;
  romaji?: string;
  pos?: string;
  glosses?: string[];
  aiMeaning?: string;
  sourceBookId?: string;
  status: VocabStatus;
  reviewCount: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt?: string;
  createdAt: string;
  lastReviewedAt?: string;
}

export interface VocabularyContextRecord {
  id: number;
  vocabularyId: number;
  sentenceText: string;
  bookId?: string;
  chapterId?: string;
  createdAt: string;
}

export interface VocabularyUpsertPayload {
  word: string;
  baseForm: string;
  reading?: string;
  romaji?: string;
  pos?: string;
  glosses?: string[];
  aiMeaning?: string;
  sourceBookId?: string;
  /** Sentence context (written to vocabulary_contexts) */
  sentenceText?: string;
  sentenceBookId?: string;
  sentenceChapterId?: string;
}

// ── Internal row types ───────────────────────────────────────────────────────

interface VocabularyRow {
  id: number;
  word: string;
  base_form: string;
  reading: string | null;
  romaji: string | null;
  pos: string | null;
  glosses_json: string | null;
  ai_meaning: string | null;
  source_book_id: string | null;
  status: VocabStatus;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  created_at: string;
  last_reviewed_at: string | null;
}

interface VocabularyContextRow {
  id: number;
  vocabulary_id: number;
  sentence_text: string;
  sentence_hash: string;
  book_id: string | null;
  chapter_id: string | null;
  created_at: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function toNullable<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function mapVocabularyRow(row: VocabularyRow): VocabularyRecord {
  let glosses: string[] | undefined;
  if (row.glosses_json) {
    try {
      glosses = JSON.parse(row.glosses_json) as string[];
    } catch {
      glosses = undefined;
    }
  }

  return {
    id: row.id,
    word: row.word,
    baseForm: row.base_form,
    reading: toNullable(row.reading),
    romaji: toNullable(row.romaji),
    pos: toNullable(row.pos),
    glosses,
    aiMeaning: toNullable(row.ai_meaning),
    sourceBookId: toNullable(row.source_book_id),
    status: row.status,
    reviewCount: row.review_count,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    nextReviewAt: toNullable(row.next_review_at),
    createdAt: row.created_at,
    lastReviewedAt: toNullable(row.last_reviewed_at),
  };
}

function mapContextRow(row: VocabularyContextRow): VocabularyContextRecord {
  return {
    id: row.id,
    vocabularyId: row.vocabulary_id,
    sentenceText: row.sentence_text,
    bookId: toNullable(row.book_id),
    chapterId: toNullable(row.chapter_id),
    createdAt: row.created_at,
  };
}

function computeContextHash(
  sentenceText: string,
  bookId?: string,
  chapterId?: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${bookId ?? ""}:${chapterId ?? ""}:${sentenceText}`)
    .digest("hex")
    .slice(0, 16);
}

// ── Repository ───────────────────────────────────────────────────────────────

export class VocabularyRepository {
  // -- Vocabulary CRUD --

  private readonly upsertVocabStmt = db.prepare(`
    INSERT INTO vocabulary (
      word, base_form, reading, romaji, pos,
      glosses_json, ai_meaning, source_book_id
    ) VALUES (
      @word, @baseForm, @reading, @romaji, @pos,
      @glossesJson, @aiMeaning, @sourceBookId
    )
    ON CONFLICT(base_form) DO UPDATE SET
      word = excluded.word,
      reading = COALESCE(excluded.reading, vocabulary.reading),
      romaji = COALESCE(excluded.romaji, vocabulary.romaji),
      pos = COALESCE(excluded.pos, vocabulary.pos),
      glosses_json = COALESCE(excluded.glosses_json, vocabulary.glosses_json),
      ai_meaning = COALESCE(excluded.ai_meaning, vocabulary.ai_meaning),
      source_book_id = COALESCE(excluded.source_book_id, vocabulary.source_book_id)
  `);

  private readonly getVocabByBaseFormStmt = db.prepare(`
    SELECT * FROM vocabulary WHERE base_form = ?
  `);

  private readonly getAllVocabStmt = db.prepare(`
    SELECT * FROM vocabulary ORDER BY created_at DESC
  `);

  private readonly getAllBaseFormsStmt = db.prepare(`
    SELECT base_form FROM vocabulary
  `);

  private readonly updateStatusStmt = db.prepare(`
    UPDATE vocabulary SET status = @status WHERE id = @id
  `);

  private readonly deleteVocabStmt = db.prepare(`
    DELETE FROM vocabulary WHERE id = ?
  `);

  // -- Context CRUD --

  private readonly insertContextStmt = db.prepare(`
    INSERT OR IGNORE INTO vocabulary_contexts (
      vocabulary_id, sentence_text, sentence_hash, book_id, chapter_id
    ) VALUES (
      @vocabularyId, @sentenceText, @sentenceHash, @bookId, @chapterId
    )
  `);

  private readonly getContextsByVocabIdStmt = db.prepare(`
    SELECT * FROM vocabulary_contexts
    WHERE vocabulary_id = ?
    ORDER BY created_at DESC
  `);

  // -- Transaction --

  private readonly upsertTransaction = db.transaction(
    (payload: VocabularyUpsertPayload) => {
      const glossesJson = payload.glosses
        ? JSON.stringify(payload.glosses)
        : null;

      this.upsertVocabStmt.run({
        word: payload.word,
        baseForm: payload.baseForm,
        reading: payload.reading ?? null,
        romaji: payload.romaji ?? null,
        pos: payload.pos ?? null,
        glossesJson,
        aiMeaning: payload.aiMeaning ?? null,
        sourceBookId: payload.sourceBookId ?? null,
      });

      // Retrieve the row (could be newly inserted or existing)
      const vocabRow = this.getVocabByBaseFormStmt.get(
        payload.baseForm
      ) as VocabularyRow;

      // Insert context sentence if provided
      if (payload.sentenceText) {
        const sentenceHash = computeContextHash(
          payload.sentenceText,
          payload.sentenceBookId,
          payload.sentenceChapterId
        );
        this.insertContextStmt.run({
          vocabularyId: vocabRow.id,
          sentenceText: payload.sentenceText,
          sentenceHash,
          bookId: payload.sentenceBookId ?? null,
          chapterId: payload.sentenceChapterId ?? null,
        });
      }

      return mapVocabularyRow(vocabRow);
    }
  );

  // -- Public API --

  upsert(payload: VocabularyUpsertPayload): VocabularyRecord {
    return this.upsertTransaction(payload);
  }

  getAll(): VocabularyRecord[] {
    const rows = this.getAllVocabStmt.all() as VocabularyRow[];
    return rows.map(mapVocabularyRow);
  }

  getContexts(vocabId: number): VocabularyContextRecord[] {
    const rows = this.getContextsByVocabIdStmt.all(
      vocabId
    ) as VocabularyContextRow[];
    return rows.map(mapContextRow);
  }

  getAllBaseForms(): string[] {
    const rows = this.getAllBaseFormsStmt.all() as { base_form: string }[];
    return rows.map((r) => r.base_form);
  }

  updateStatus(id: number, status: VocabStatus): boolean {
    const result = this.updateStatusStmt.run({ id, status });
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const result = this.deleteVocabStmt.run(id);
    return result.changes > 0;
  }
}
