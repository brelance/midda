import Database from "better-sqlite3";
import type { Database as DB } from "better-sqlite3";
import path from "node:path";
import { app } from "electron";

const DB_FILE_NAME = "language-data.db";
const dbPath = path.join(app.getPath("userData"), DB_FILE_NAME);

let db: DB | undefined;

function initializeSchema(database: DB): void {
  database.pragma("foreign_keys = ON");

  const ddlStatements = `
    BEGIN;

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      description TEXT,
      cover_path TEXT,
      file_path TEXT NOT NULL,
      source_path TEXT,
      status TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started','reading','completed')),
      progress REAL NOT NULL DEFAULT 0,
      current_chapter_id TEXT,
      last_read_chapter_id TEXT,
      metadata_language TEXT,
      metadata_publisher TEXT,
      metadata_identifier TEXT,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chapters (
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      title TEXT,
      href TEXT,
      order_index INTEGER NOT NULL,
      content_html TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (book_id, chapter_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapter_reading_positions (
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      scroll_progress REAL NOT NULL DEFAULT 0,
      scroll_offset INTEGER,
      viewport_height INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (book_id, chapter_id),
      FOREIGN KEY (book_id, chapter_id) REFERENCES chapters(book_id, chapter_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sentence_analysis_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL,
      chapter_id TEXT,
      paragraph_id TEXT,
      sentence_id TEXT,
      sentence_hash TEXT NOT NULL,
      text TEXT NOT NULL,
      tokens_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sentence_analysis_jobs (
      job_id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL,
      chapter_id TEXT,
      sentence_hash TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed')),
      error TEXT,
      result_record_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (result_record_id) REFERENCES sentence_analysis_records(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_progress ON books(progress);
    CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_unique ON chapters(book_id, chapter_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(book_id, order_index);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_records(book_id, sentence_hash);
    CREATE INDEX IF NOT EXISTS idx_sentence_analysis_locator ON sentence_analysis_records(book_id, chapter_id, paragraph_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sentence_analysis_jobs_hash ON sentence_analysis_jobs(book_id, sentence_hash);

    COMMIT;
  `;

  database.exec(ddlStatements);
}

try {
  db = new Database(dbPath);
  console.log("Database connected successfully at", dbPath);
  initializeSchema(db);
} catch (error) {
  console.error("Failed to connect to the database:", error);
  app.quit();
  throw error instanceof Error ? error : new Error(String(error));
}

process.on("exit", () => {
  if (db) {
    db.close();
    console.log("Database connection closed.");
  }
});

export default db!;
