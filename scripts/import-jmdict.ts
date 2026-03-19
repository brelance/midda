/**
 * JMdict JSON → SQLite import script
 *
 * Usage:  npx tsx scripts/import-jmdict.ts
 *
 * Downloads jmdict-eng-common JSON from GitHub Releases (jmdict-simplified),
 * then inserts every entry into a local SQLite database at resources/jmdict.db.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import Database from "better-sqlite3";

// ── Config ──────────────────────────────────────────────────────────────────
const GITHUB_RELEASES_API =
  "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest";
const ASSET_PREFIX = "jmdict-eng-common-";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESOURCES_DIR = path.join(ROOT, "resources");
const DB_PATH = path.join(RESOURCES_DIR, "jmdict.db");

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url: string, dest: string) {
  console.log(`⬇  Downloading …\n   ${url}`);
  execSync(`curl -L -o "${dest}" "${url}"`, { stdio: "inherit" });
}

function unzip(zipPath: string, outDir: string) {
  console.log(`📦 Unzipping ${path.basename(zipPath)} …`);
  execSync(`unzip -o "${zipPath}" -d "${outDir}"`, { stdio: "inherit" });
}

/**
 * Query the GitHub API for the latest release and find the
 * jmdict-eng-common ZIP asset download URL & filename.
 */
async function resolveDownloadUrl(): Promise<{
  url: string;
  zipName: string;
}> {
  console.log("🔍 Querying GitHub for latest jmdict-simplified release …");
  const res = await fetch(GITHUB_RELEASES_API, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  const release = (await res.json()) as {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
  };

  console.log(`   Latest release tag: ${release.tag_name}`);

  const asset = release.assets.find(
    (a) => a.name.startsWith(ASSET_PREFIX) && a.name.endsWith(".json.zip")
  );
  if (!asset) {
    throw new Error(
      `No asset matching "${ASSET_PREFIX}*.json.zip" found in release ${release.tag_name}`
    );
  }

  return { url: asset.browser_download_url, zipName: asset.name };
}

// ── Schema ──────────────────────────────────────────────────────────────────
function createSchema(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = DELETE;

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id     TEXT PRIMARY KEY,
      common INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS kanji (
      entry_id TEXT NOT NULL,
      text     TEXT NOT NULL,
      common   INTEGER NOT NULL DEFAULT 0,
      tags     TEXT,
      FOREIGN KEY (entry_id) REFERENCES entries(id)
    );

    CREATE TABLE IF NOT EXISTS kana (
      entry_id          TEXT NOT NULL,
      text              TEXT NOT NULL,
      common            INTEGER NOT NULL DEFAULT 0,
      tags              TEXT,
      applies_to_kanji  TEXT,
      FOREIGN KEY (entry_id) REFERENCES entries(id)
    );

    CREATE TABLE IF NOT EXISTS senses (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL,
      pos      TEXT,
      field    TEXT,
      misc     TEXT,
      dialect  TEXT,
      info     TEXT,
      related  TEXT,
      antonym  TEXT,
      FOREIGN KEY (entry_id) REFERENCES entries(id)
    );

    CREATE TABLE IF NOT EXISTS glosses (
      sense_id INTEGER NOT NULL,
      lang     TEXT NOT NULL DEFAULT 'eng',
      text     TEXT NOT NULL,
      type     TEXT,
      FOREIGN KEY (sense_id) REFERENCES senses(id)
    );
  `);
}

function createIndices(db: Database.Database) {
  console.log("🔑 Creating indices …");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kanji_text  ON kanji(text);
    CREATE INDEX IF NOT EXISTS idx_kana_text   ON kana(text);
    CREATE INDEX IF NOT EXISTS idx_senses_entry ON senses(entry_id);
    CREATE INDEX IF NOT EXISTS idx_glosses_sense ON glosses(sense_id);
  `);
}

function createFts(db: Database.Database) {
  console.log("🔍 Building FTS5 full-text index …");
  // Materialised FTS approach: populate explicitly
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS dict_fts USING fts5(
      kanji_texts,
      kana_texts,
      gloss_texts,
      content=''
    );
  `);

  // Populate FTS from joined data
  db.exec(`
    INSERT INTO dict_fts(rowid, kanji_texts, kana_texts, gloss_texts)
    SELECT
      e.rowid,
      COALESCE((SELECT GROUP_CONCAT(k.text, ' ') FROM kanji k WHERE k.entry_id = e.id), ''),
      COALESCE((SELECT GROUP_CONCAT(ka.text, ' ') FROM kana ka WHERE ka.entry_id = e.id), ''),
      COALESCE((
        SELECT GROUP_CONCAT(g.text, ' ')
        FROM glosses g
        JOIN senses s ON g.sense_id = s.id
        WHERE s.entry_id = e.id
      ), '')
    FROM entries e;
  `);
}

// ── Import logic ────────────────────────────────────────────────────────────

interface JMdictWord {
  id: string;
  kanji: { text: string; common: boolean; tags: string[] }[];
  kana: {
    text: string;
    common: boolean;
    tags: string[];
    appliesToKanji: string[];
  }[];
  sense: {
    partOfSpeech: string[];
    appliesToKanji: string[];
    appliesToKana: string[];
    related: unknown[];
    antonym: unknown[];
    field: string[];
    dialect: string[];
    misc: string[];
    info: string[];
    languageSource: unknown[];
    gloss: { lang: string; text: string; gender: string | null; type: string | null }[];
  }[];
}

function importWords(db: Database.Database, words: JMdictWord[]) {
  const insertEntry = db.prepare(
    `INSERT OR IGNORE INTO entries (id, common) VALUES (?, ?)`
  );
  const insertKanji = db.prepare(
    `INSERT INTO kanji (entry_id, text, common, tags) VALUES (?, ?, ?, ?)`
  );
  const insertKana = db.prepare(
    `INSERT INTO kana (entry_id, text, common, tags, applies_to_kanji) VALUES (?, ?, ?, ?, ?)`
  );
  const insertSense = db.prepare(
    `INSERT INTO senses (entry_id, pos, field, misc, dialect, info, related, antonym) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertGloss = db.prepare(
    `INSERT INTO glosses (sense_id, lang, text, type) VALUES (?, ?, ?, ?)`
  );

  const importAll = db.transaction(() => {
    for (const word of words) {
      const isCommon =
        word.kanji.some((k) => k.common) || word.kana.some((k) => k.common)
          ? 1
          : 0;

      insertEntry.run(word.id, isCommon);

      for (const k of word.kanji) {
        insertKanji.run(
          word.id,
          k.text,
          k.common ? 1 : 0,
          k.tags.length ? JSON.stringify(k.tags) : null
        );
      }

      for (const k of word.kana) {
        insertKana.run(
          word.id,
          k.text,
          k.common ? 1 : 0,
          k.tags.length ? JSON.stringify(k.tags) : null,
          JSON.stringify(k.appliesToKanji)
        );
      }

      for (const s of word.sense) {
        const { lastInsertRowid: senseId } = insertSense.run(
          word.id,
          s.partOfSpeech.length ? JSON.stringify(s.partOfSpeech) : null,
          s.field.length ? JSON.stringify(s.field) : null,
          s.misc.length ? JSON.stringify(s.misc) : null,
          s.dialect.length ? JSON.stringify(s.dialect) : null,
          s.info.length ? JSON.stringify(s.info) : null,
          s.related.length ? JSON.stringify(s.related) : null,
          s.antonym.length ? JSON.stringify(s.antonym) : null
        );

        for (const g of s.gloss) {
          insertGloss.run(senseId, g.lang, g.text, g.type);
        }
      }
    }
  });

  importAll();
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 JMdict import starting …\n");

  ensureDir(RESOURCES_DIR);

  // 1. Resolve the latest release download URL
  const { url: downloadUrl, zipName } = await resolveDownloadUrl();
  const zipPath = path.join(RESOURCES_DIR, zipName);

  // 2. Download if needed
  if (!fs.existsSync(zipPath)) {
    download(downloadUrl, zipPath);
  } else {
    console.log(`✅ ZIP already exists: ${zipPath}`);
  }

  // 3. Clean old JSON files to avoid reading stale data on upgrade
  for (const f of fs.readdirSync(RESOURCES_DIR)) {
    if (f.startsWith("jmdict-eng-common-") && f.endsWith(".json")) {
      fs.unlinkSync(path.join(RESOURCES_DIR, f));
    }
  }

  // 4. Unzip, then find the extracted JSON
  unzip(zipPath, RESOURCES_DIR);

  const jsonFile = fs.readdirSync(RESOURCES_DIR).find(
    (f) => f.startsWith("jmdict-eng-common-") && f.endsWith(".json")
  );
  if (!jsonFile) {
    throw new Error(
      `No jmdict-eng-common-*.json found in ${RESOURCES_DIR} after unzip`
    );
  }
  const jsonPath = path.join(RESOURCES_DIR, jsonFile);
  console.log(`   Extracted: ${jsonFile}`);

  // 4. Read JSON
  console.log(`📖 Reading ${jsonFile} …`);
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw) as {
    version: string;
    dictDate: string;
    tags: Record<string, string>;
    words: JMdictWord[];
  };

  console.log(`   Version: ${data.version}, Date: ${data.dictDate}`);
  console.log(`   Words: ${data.words.length}`);
  console.log(`   Tags: ${Object.keys(data.tags).length}\n`);

  // 4. Create / recreate DB
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("🗑  Removed existing jmdict.db");
  }

  const db = new Database(DB_PATH);
  createSchema(db);

  // 5. Store metadata
  const insertMeta = db.prepare(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`
  );
  insertMeta.run("version", data.version);
  insertMeta.run("dictDate", data.dictDate);
  insertMeta.run("importedAt", new Date().toISOString());

  // Store tags
  insertMeta.run("tags", JSON.stringify(data.tags));

  // 6. Import words in batches
  const BATCH_SIZE = 5000;
  const total = data.words.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = data.words.slice(i, i + BATCH_SIZE);
    importWords(db, batch);
    const progress = Math.min(i + BATCH_SIZE, total);
    console.log(`   Imported ${progress} / ${total} entries …`);
  }

  // 7. Create indices & FTS
  createIndices(db);
  createFts(db);

  // 8. Ensure DELETE journal mode (not WAL) for read-only deployment
  db.exec("PRAGMA journal_mode = DELETE");
  db.exec("VACUUM");

  // 9. Stats
  const entryCount = (
    db.prepare("SELECT COUNT(*) as c FROM entries").get() as { c: number }
  ).c;
  const kanjiCount = (
    db.prepare("SELECT COUNT(*) as c FROM kanji").get() as { c: number }
  ).c;
  const kanaCount = (
    db.prepare("SELECT COUNT(*) as c FROM kana").get() as { c: number }
  ).c;
  const senseCount = (
    db.prepare("SELECT COUNT(*) as c FROM senses").get() as { c: number }
  ).c;
  const glossCount = (
    db.prepare("SELECT COUNT(*) as c FROM glosses").get() as { c: number }
  ).c;

  const fileSizeMB = (fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ Import complete!`);
  console.log(`   Entries: ${entryCount}`);
  console.log(`   Kanji:   ${kanjiCount}`);
  console.log(`   Kana:    ${kanaCount}`);
  console.log(`   Senses:  ${senseCount}`);
  console.log(`   Glosses: ${glossCount}`);
  console.log(`   DB size: ${fileSizeMB} MB`);
  console.log(`   Path:    ${DB_PATH}`);

  db.close();
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
