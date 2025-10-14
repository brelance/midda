import crypto from "node:crypto";
import db from "./databse";
import { TokenData } from "../../../../src/types/types";

export type ReadingStatus = "not-started" | "reading" | "completed";

function toNullable<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export interface BookRecord {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverPath?: string;
  filePath: string;
  sourcePath?: string;
  status: ReadingStatus;
  progress: number;
  currentChapterId?: string;
  lastReadChapterId?: string;
  metadataLanguage?: string;
  metadataPublisher?: string;
  metadataIdentifier?: string;
  addedAt: string;
  updatedAt: string;
}

export interface BookUpsertPayload {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverPath?: string;
  filePath: string;
  sourcePath?: string;
  status?: ReadingStatus;
  progress?: number;
  currentChapterId?: string;
  lastReadChapterId?: string;
  metadataLanguage?: string;
  metadataPublisher?: string;
  metadataIdentifier?: string;
}

export class BookRepository {
  private readonly upsertStmt = db.prepare(`
    INSERT INTO books (
      id, title, author, description, cover_path, file_path, source_path,
      status, progress, current_chapter_id, last_read_chapter_id,
      metadata_language, metadata_publisher, metadata_identifier
    )
    VALUES (
      @id, @title, @author, @description, @coverPath, @filePath, @sourcePath,
      @status, @progress, @currentChapterId, @lastReadChapterId,
      @metadataLanguage, @metadataPublisher, @metadataIdentifier
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      description = excluded.description,
      cover_path = excluded.cover_path,
      file_path = excluded.file_path,
      source_path = excluded.source_path,
      status = excluded.status,
      progress = excluded.progress,
      current_chapter_id = excluded.current_chapter_id,
      last_read_chapter_id = excluded.last_read_chapter_id,
      metadata_language = excluded.metadata_language,
      metadata_publisher = excluded.metadata_publisher,
      metadata_identifier = excluded.metadata_identifier,
      updated_at = CURRENT_TIMESTAMP
  `);

  private readonly getStmt = db.prepare(`
    SELECT
      id,
      title,
      author,
      description,
      cover_path,
      file_path,
      source_path,
      status,
      progress,
      current_chapter_id,
      last_read_chapter_id,
      metadata_language,
      metadata_publisher,
      metadata_identifier,
      added_at,
      updated_at
    FROM books
    WHERE id = ?
  `);

  private readonly allStmt = db.prepare(`
    SELECT
      id,
      title,
      author,
      description,
      cover_path,
      file_path,
      source_path,
      status,
      progress,
      current_chapter_id,
      last_read_chapter_id,
      metadata_language,
      metadata_publisher,
      metadata_identifier,
      added_at,
      updated_at
    FROM books
    ORDER BY updated_at DESC
  `);

  private readonly deleteStmt = db.prepare(
    `DELETE FROM books WHERE id = ?`
  );

  upsert(payload: BookUpsertPayload): BookRecord {
    const defaults: Pick<BookUpsertPayload, "status" | "progress"> = {
      status: "not-started",
      progress: 0,
    };

    const runResult = this.upsertStmt.run({
      ...defaults,
      ...payload,
    });

    if (runResult.changes === 0) {
      throw new Error("Failed to upsert book record");
    }

    const record = this.getStmt.get(payload.id) as BookRow | undefined;
    if (!record) {
      throw new Error("Failed to retrieve book after upsert");
    }

    return mapBookRow(record);
  }

  getById(id: string): BookRecord | null {
    const record = this.getStmt.get(id) as BookRow | undefined;
    return record ? mapBookRow(record) : null;
  }

  getAll(): BookRecord[] {
    const rows = this.allStmt.all() as BookRow[];
    return rows.map(mapBookRow);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_path: string | null;
  file_path: string;
  source_path: string | null;
  status: ReadingStatus;
  progress: number;
  current_chapter_id: string | null;
  last_read_chapter_id: string | null;
  metadata_language: string | null;
  metadata_publisher: string | null;
  metadata_identifier: string | null;
  added_at: string;
  updated_at: string;
}

function mapBookRow(row: BookRow): BookRecord {
  return {
    id: row.id,
    title: row.title,
    author: toNullable(row.author),
    description: toNullable(row.description),
    coverPath: toNullable(row.cover_path),
    filePath: row.file_path,
    sourcePath: toNullable(row.source_path),
    status: row.status,
    progress: row.progress,
    currentChapterId: toNullable(row.current_chapter_id),
    lastReadChapterId: toNullable(row.last_read_chapter_id),
    metadataLanguage: toNullable(row.metadata_language),
    metadataPublisher: toNullable(row.metadata_publisher),
    metadataIdentifier: toNullable(row.metadata_identifier),
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

export interface ChapterRecord {
  bookId: string;
  chapterId: string;
  title?: string;
  href?: string;
  orderIndex: number;
  contentHtml?: string;
  isRead: boolean;
  wordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterUpsertPayload {
  bookId: string;
  chapterId: string;
  title?: string;
  href?: string;
  orderIndex: number;
  contentHtml?: string;
  isRead?: boolean;
  wordCount?: number;
}

export class ChapterRepository {
  private readonly upsertStmt = db.prepare(`
    INSERT INTO chapters (
      book_id,
      chapter_id,
      title,
      href,
      order_index,
      content_html,
      is_read,
      word_count
    ) VALUES (
      @bookId,
      @chapterId,
      @title,
      @href,
      @orderIndex,
      @contentHtml,
      @isRead,
      @wordCount
    )
    ON CONFLICT(book_id, chapter_id) DO UPDATE SET
      title = excluded.title,
      href = excluded.href,
      order_index = excluded.order_index,
      content_html = excluded.content_html,
      is_read = excluded.is_read,
      word_count = excluded.word_count,
      updated_at = CURRENT_TIMESTAMP
  `);

  private readonly getByBookStmt = db.prepare(`
    SELECT
      book_id,
      chapter_id,
      title,
      href,
      order_index,
      content_html,
      is_read,
      word_count,
      created_at,
      updated_at
    FROM chapters
    WHERE book_id = ?
    ORDER BY order_index ASC
  `);

  private readonly deleteByBookStmt = db.prepare(
    `DELETE FROM chapters WHERE book_id = ?`
  );

  bulkUpsert(chapters: ChapterUpsertPayload[]): void {
    const insert = db.transaction((items: ChapterUpsertPayload[]) => {
      for (const item of items) {
        this.upsertStmt.run({
          ...item,
          isRead: item.isRead ? 1 : 0,
        });
      }
    });

    insert(chapters);
  }

  getByBookId(bookId: string): ChapterRecord[] {
    const rows = this.getByBookStmt.all(bookId) as ChapterRow[];
    return rows.map(mapChapterRow);
  }

  deleteByBookId(bookId: string): boolean {
    const result = this.deleteByBookStmt.run(bookId);
    return result.changes > 0;
  }
}

interface ChapterRow {
  book_id: string;
  chapter_id: string;
  title: string | null;
  href: string | null;
  order_index: number;
  content_html: string | null;
  is_read: number;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

function mapChapterRow(row: ChapterRow): ChapterRecord {
  return {
    bookId: row.book_id,
    chapterId: row.chapter_id,
    title: toNullable(row.title),
    href: toNullable(row.href),
    orderIndex: row.order_index,
    contentHtml: toNullable(row.content_html),
    isRead: row.is_read === 1,
    wordCount: toNullable(row.word_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ChapterReadingPositionRecord {
  bookId: string;
  chapterId: string;
  scrollProgress: number;
  scrollOffset?: number;
  viewportHeight?: number;
  updatedAt: string;
}

export interface ChapterReadingPositionUpsertPayload {
  bookId: string;
  chapterId: string;
  scrollProgress: number;
  scrollOffset?: number;
  viewportHeight?: number;
}

export class ChapterReadingPositionRepository {
  private readonly upsertStmt = db.prepare(`
    INSERT INTO chapter_reading_positions (
      book_id,
      chapter_id,
      scroll_progress,
      scroll_offset,
      viewport_height
    ) VALUES (
      @bookId,
      @chapterId,
      @scrollProgress,
      @scrollOffset,
      @viewportHeight
    )
    ON CONFLICT(book_id, chapter_id) DO UPDATE SET
      scroll_progress = excluded.scroll_progress,
      scroll_offset = excluded.scroll_offset,
      viewport_height = excluded.viewport_height,
      updated_at = CURRENT_TIMESTAMP
  `);

  private readonly getStmt = db.prepare(`
    SELECT
      book_id,
      chapter_id,
      scroll_progress,
      scroll_offset,
      viewport_height,
      updated_at
    FROM chapter_reading_positions
    WHERE book_id = ? AND chapter_id = ?
  `);

  private readonly deleteStmt = db.prepare(`
    DELETE FROM chapter_reading_positions
    WHERE book_id = ? AND chapter_id = ?
  `);

  upsert(payload: ChapterReadingPositionUpsertPayload): ChapterReadingPositionRecord {
    const result = this.upsertStmt.run(payload);
    if (result.changes === 0) {
      throw new Error("Failed to upsert reading position");
    }

    const row = this.getStmt.get(
      payload.bookId,
      payload.chapterId
    ) as ChapterReadingPositionRow | undefined;

    if (!row) {
      throw new Error("Failed to read position after upsert");
    }

    return mapChapterReadingPositionRow(row);
  }

  get(bookId: string, chapterId: string): ChapterReadingPositionRecord | null {
    const row = this.getStmt.get(bookId, chapterId) as
      | ChapterReadingPositionRow
      | undefined;
    return row ? mapChapterReadingPositionRow(row) : null;
  }

  delete(bookId: string, chapterId: string): boolean {
    const res = this.deleteStmt.run(bookId, chapterId);
    return res.changes > 0;
  }
}

interface ChapterReadingPositionRow {
  book_id: string;
  chapter_id: string;
  scroll_progress: number;
  scroll_offset: number | null;
  viewport_height: number | null;
  updated_at: string;
}

function mapChapterReadingPositionRow(
  row: ChapterReadingPositionRow
): ChapterReadingPositionRecord {
  return {
    bookId: row.book_id,
    chapterId: row.chapter_id,
    scrollProgress: row.scroll_progress,
    scrollOffset: toNullable(row.scroll_offset),
    viewportHeight: toNullable(row.viewport_height),
    updatedAt: row.updated_at,
  };
}

export interface SentenceAnalysisRecord {
  id: number;
  bookId: string;
  chapterId?: string;
  paragraphId?: string;
  sentenceId?: string;
  sentenceHash: string;
  text: string;
  tokens: TokenData[];
  createdAt: string;
  updatedAt: string;
}

export interface SentenceAnalysisUpsertPayload {
  bookId: string;
  text: string;
  tokens: TokenData[];
  chapterId?: string;
  paragraphId?: string;
  sentenceId?: string;
}

export class SentenceAnalysisRepository {
  private readonly upsertStmt = db.prepare(`
    INSERT INTO sentence_analysis_records (
      book_id,
      chapter_id,
      paragraph_id,
      sentence_id,
      sentence_hash,
      text,
      tokens_json
    ) VALUES (
      @bookId,
      @chapterId,
      @paragraphId,
      @sentenceId,
      @sentenceHash,
      @text,
      @tokensJson
    )
    ON CONFLICT(book_id, sentence_hash) DO UPDATE SET
      chapter_id = excluded.chapter_id,
      paragraph_id = excluded.paragraph_id,
      sentence_id = excluded.sentence_id,
      text = excluded.text,
      tokens_json = excluded.tokens_json,
      updated_at = CURRENT_TIMESTAMP
  `);

  private readonly getByHashStmt = db.prepare(`
    SELECT
      id,
      book_id,
      chapter_id,
      paragraph_id,
      sentence_id,
      sentence_hash,
      text,
      tokens_json,
      created_at,
      updated_at
    FROM sentence_analysis_records
    WHERE book_id = ? AND sentence_hash = ?
  `);

  private readonly getByContextStmt = db.prepare(`
    SELECT
      id,
      book_id,
      chapter_id,
      paragraph_id,
      sentence_id,
      sentence_hash,
      text,
      tokens_json,
      created_at,
      updated_at
    FROM sentence_analysis_records
    WHERE book_id = @bookId
      AND (@chapterId IS NULL OR chapter_id = @chapterId)
      AND (@paragraphId IS NULL OR paragraph_id = @paragraphId)
    ORDER BY created_at DESC
  `);

  upsert(payload: SentenceAnalysisUpsertPayload): SentenceAnalysisRecord {
    const sentenceHash = computeSentenceHash(
      payload.bookId,
      payload.text,
      payload.chapterId,
      payload.paragraphId,
      payload.sentenceId
    );

    const tokensJson = JSON.stringify(payload.tokens);

    const result = this.upsertStmt.run({
      ...payload,
      sentenceHash,
      tokensJson,
    });

    if (result.changes === 0) {
      throw new Error("Failed to upsert sentence analysis record");
    }

    const row = this.getByHashStmt.get(
      payload.bookId,
      sentenceHash
    ) as SentenceAnalysisRow | undefined;

    if (!row) {
      throw new Error("Failed to load sentence analysis after upsert");
    }

    return mapSentenceAnalysisRow(row);
  }

  getBySentence(
    bookId: string,
    text: string,
    context?: {
      chapterId?: string;
      paragraphId?: string;
      sentenceId?: string;
    }
  ): SentenceAnalysisRecord | null {
    const sentenceHash = computeSentenceHash(
      bookId,
      text,
      context?.chapterId,
      context?.paragraphId,
      context?.sentenceId
    );
    const row = this.getByHashStmt.get(
      bookId,
      sentenceHash
    ) as SentenceAnalysisRow | undefined;
    return row ? mapSentenceAnalysisRow(row) : null;
  }

  listByContext(bookId: string, filters?: { chapterId?: string; paragraphId?: string }): SentenceAnalysisRecord[] {
    const rows = this.getByContextStmt.all({
      bookId,
      chapterId: filters?.chapterId ?? null,
      paragraphId: filters?.paragraphId ?? null,
    }) as SentenceAnalysisRow[];
    return rows.map(mapSentenceAnalysisRow);
  }
}

interface SentenceAnalysisRow {
  id: number;
  book_id: string;
  chapter_id: string | null;
  paragraph_id: string | null;
  sentence_id: string | null;
  sentence_hash: string;
  text: string;
  tokens_json: string;
  created_at: string;
  updated_at: string;
}

function mapSentenceAnalysisRow(
  row: SentenceAnalysisRow
): SentenceAnalysisRecord {
  let tokens: TokenData[] = [];
  try {
    tokens = JSON.parse(row.tokens_json) as TokenData[];
  } catch (error) {
    console.error("Failed to parse tokens_json:", error);
  }
  return {
    id: row.id,
    bookId: row.book_id,
    chapterId: toNullable(row.chapter_id),
    paragraphId: toNullable(row.paragraph_id),
    sentenceId: toNullable(row.sentence_id),
    sentenceHash: row.sentence_hash,
    text: row.text,
    tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function computeSentenceHash(
  bookId: string,
  text: string,
  chapterId?: string,
  paragraphId?: string,
  sentenceId?: string
): string {
  const hash = crypto.createHash("sha256");
  hash.update(bookId);
  hash.update("\0");
  hash.update(chapterId ?? "");
  hash.update("\0");
  hash.update(paragraphId ?? "");
  hash.update("\0");
  hash.update(sentenceId ?? "");
  hash.update("\0");
  hash.update(text);
  return hash.digest("hex");
}

export type SentenceAnalysisJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export interface SentenceAnalysisJobRecord {
  jobId: number;
  bookId: string;
  chapterId?: string;
  sentenceHash: string;
  text: string;
  status: SentenceAnalysisJobStatus;
  error?: string;
  resultRecordId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SentenceAnalysisJobUpsertPayload {
  bookId: string;
  chapterId?: string;
  sentenceHash?: string;
  text: string;
  status?: SentenceAnalysisJobStatus;
  error?: string;
  resultRecordId?: number;
}

export class SentenceAnalysisJobRepository {
  private readonly insertStmt = db.prepare(`
    INSERT INTO sentence_analysis_jobs (
      book_id,
      chapter_id,
      sentence_hash,
      text,
      status,
      error,
      result_record_id
    ) VALUES (
      @bookId,
      @chapterId,
      @sentenceHash,
      @text,
      @status,
      @error,
      @resultRecordId
    )
    ON CONFLICT(book_id, sentence_hash) DO UPDATE SET
      chapter_id = excluded.chapter_id,
      text = excluded.text,
      status = excluded.status,
      error = excluded.error,
      result_record_id = excluded.result_record_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  private readonly updateStatusStmt = db.prepare(`
    UPDATE sentence_analysis_jobs
    SET status = @status,
        error = @error,
        result_record_id = @resultRecordId,
        updated_at = CURRENT_TIMESTAMP
    WHERE job_id = @jobId
  `);

  private readonly getPendingStmt = db.prepare(`
    SELECT
      job_id,
      book_id,
      chapter_id,
      sentence_hash,
      text,
      status,
      error,
      result_record_id,
      created_at,
      updated_at
    FROM sentence_analysis_jobs
    WHERE status IN ('pending','failed')
    ORDER BY updated_at ASC
    LIMIT @limit
  `);

  private readonly deleteStmt = db.prepare(`
    DELETE FROM sentence_analysis_jobs
    WHERE job_id = ?
  `);

  enqueue(payload: SentenceAnalysisJobUpsertPayload): SentenceAnalysisJobRecord {
    const sentenceHash =
      payload.sentenceHash ??
      computeSentenceHash(
        payload.bookId,
        payload.text,
        payload.chapterId,
        undefined,
        undefined
      );

    const result = this.insertStmt.run({
      ...payload,
      sentenceHash,
      status: payload.status ?? "pending",
    });

    if (result.changes === 0) {
      throw new Error("Failed to enqueue sentence analysis job");
    }

    const job = this.getByHash(payload.bookId, sentenceHash);
    if (!job) {
      throw new Error("Failed to load sentence analysis job after enqueue");
    }
    return job;
  }

  updateStatus(jobId: number, status: SentenceAnalysisJobStatus, options?: { error?: string; resultRecordId?: number }): boolean {
    const res = this.updateStatusStmt.run({
      jobId,
      status,
      error: options?.error ?? null,
      resultRecordId: options?.resultRecordId ?? null,
    });
    return res.changes > 0;
  }

  getPending(limit = 20): SentenceAnalysisJobRecord[] {
    const rows = this.getPendingStmt.all({ limit }) as SentenceAnalysisJobRow[];
    return rows.map(mapSentenceAnalysisJobRow);
  }

  delete(jobId: number): boolean {
    const res = this.deleteStmt.run(jobId);
    return res.changes > 0;
  }

  private readonly getByHashStmt = db.prepare(`
    SELECT
      job_id,
      book_id,
      chapter_id,
      sentence_hash,
      text,
      status,
      error,
      result_record_id,
      created_at,
      updated_at
    FROM sentence_analysis_jobs
    WHERE book_id = ? AND sentence_hash = ?
  `);

  private getByHash(bookId: string, sentenceHash: string): SentenceAnalysisJobRecord | null {
    const row = this.getByHashStmt.get(bookId, sentenceHash) as
      | SentenceAnalysisJobRow
      | undefined;
    return row ? mapSentenceAnalysisJobRow(row) : null;
  }
}

interface SentenceAnalysisJobRow {
  job_id: number;
  book_id: string;
  chapter_id: string | null;
  sentence_hash: string;
  text: string;
  status: SentenceAnalysisJobStatus;
  error: string | null;
  result_record_id: number | null;
  created_at: string;
  updated_at: string;
}

function mapSentenceAnalysisJobRow(
  row: SentenceAnalysisJobRow
): SentenceAnalysisJobRecord {
  return {
    jobId: row.job_id,
    bookId: row.book_id,
    chapterId: toNullable(row.chapter_id),
    sentenceHash: row.sentence_hash,
    text: row.text,
    status: row.status,
    error: toNullable(row.error),
    resultRecordId: toNullable(row.result_record_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UserPreferenceRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export class UserPreferencesRepository {
  private readonly upsertStmt = db.prepare(`
    INSERT INTO user_preferences (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  private readonly getStmt = db.prepare(`
    SELECT key, value, updated_at
    FROM user_preferences
    WHERE key = ?
  `);

  private readonly deleteStmt = db.prepare(`
    DELETE FROM user_preferences WHERE key = ?
  `);

  set(key: string, value: string): UserPreferenceRecord {
    const result = this.upsertStmt.run({ key, value });
    if (result.changes === 0) {
      throw new Error("Failed to persist user preference");
    }
    const row = this.getStmt.get(key) as UserPreferenceRow | undefined;
    if (!row) {
      throw new Error("Failed to fetch user preference after set");
    }
    return mapUserPreferenceRow(row);
  }

  get(key: string): UserPreferenceRecord | null {
    const row = this.getStmt.get(key) as UserPreferenceRow | undefined;
    return row ? mapUserPreferenceRow(row) : null;
  }

  delete(key: string): boolean {
    const res = this.deleteStmt.run(key);
    return res.changes > 0;
  }
}

interface UserPreferenceRow {
  key: string;
  value: string;
  updated_at: string;
}

function mapUserPreferenceRow(
  row: UserPreferenceRow
): UserPreferenceRecord {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  };
}
