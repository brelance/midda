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
const EXAMPLES_ASSET_PREFIX = "jmdict-examples-eng-";

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

interface ReleaseAssetInfo {
  url: string;
  zipName: string;
}

/**
 * Query the GitHub API for the latest release and find the
 * jmdict-eng-common and jmdict-examples-eng ZIP asset download URLs.
 */
async function resolveDownloadUrls(): Promise<{
  dict: ReleaseAssetInfo;
  examples: ReleaseAssetInfo;
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

  const dictAsset = release.assets.find(
    (a) => a.name.startsWith(ASSET_PREFIX) && a.name.endsWith(".json.zip")
  );
  if (!dictAsset) {
    throw new Error(
      `No asset matching "${ASSET_PREFIX}*.json.zip" found in release ${release.tag_name}`
    );
  }

  const examplesAsset = release.assets.find(
    (a) => a.name.startsWith(EXAMPLES_ASSET_PREFIX) && a.name.endsWith(".json.zip")
  );
  if (!examplesAsset) {
    throw new Error(
      `No asset matching "${EXAMPLES_ASSET_PREFIX}*.json.zip" found in release ${release.tag_name}`
    );
  }

  return {
    dict: { url: dictAsset.browser_download_url, zipName: dictAsset.name },
    examples: { url: examplesAsset.browser_download_url, zipName: examplesAsset.name },
  };
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

function createExamplesSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS examples (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id  TEXT NOT NULL,
      sense_idx INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS example_sentences (
      example_id INTEGER NOT NULL,
      lang       TEXT NOT NULL,
      text       TEXT NOT NULL,
      FOREIGN KEY (example_id) REFERENCES examples(id)
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
    CREATE INDEX IF NOT EXISTS idx_examples_entry ON examples(entry_id);
    CREATE INDEX IF NOT EXISTS idx_example_sentences_example ON example_sentences(example_id);
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

/** Entry structure in the jmdict-examples-eng JSON */
interface JMdictExamplesWord {
  id: string;
  kanji: unknown[];
  kana: unknown[];
  sense: {
    partOfSpeech: string[];
    gloss: unknown[];
    examples?: {
      text: string;
      sentences: { lang: string; text: string }[];
    }[];
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

function importExamples(db: Database.Database, words: JMdictExamplesWord[]) {
  const insertExample = db.prepare(
    `INSERT INTO examples (entry_id, sense_idx) VALUES (?, ?)`
  );
  const insertExampleSentence = db.prepare(
    `INSERT INTO example_sentences (example_id, lang, text) VALUES (?, ?, ?)`
  );
  // Only import examples for entries that exist in our (common) dict
  const entryExists = db.prepare(
    `SELECT 1 FROM entries WHERE id = ?`
  );

  const importAll = db.transaction(() => {
    let exampleCount = 0;
    let sentenceCount = 0;
    let skipped = 0;

    for (const word of words) {
      // Skip entries not in our common dict
      if (!entryExists.get(word.id)) {
        skipped++;
        continue;
      }

      for (let senseIdx = 0; senseIdx < word.sense.length; senseIdx++) {
        const sense = word.sense[senseIdx];
        if (!sense.examples || sense.examples.length === 0) continue;

        for (const example of sense.examples) {
          if (!example.sentences || example.sentences.length === 0) continue;

          const { lastInsertRowid: exampleId } = insertExample.run(
            word.id,
            senseIdx
          );
          exampleCount++;

          for (const sentence of example.sentences) {
            insertExampleSentence.run(exampleId, sentence.lang, sentence.text);
            sentenceCount++;
          }
        }
      }
    }

    return { exampleCount, sentenceCount, skipped };
  });

  return importAll();
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 JMdict import starting …\n");

  ensureDir(RESOURCES_DIR);

  // 1. Resolve the latest release download URLs
  const { dict: dictAsset, examples: examplesAsset } = await resolveDownloadUrls();
  const dictZipPath = path.join(RESOURCES_DIR, dictAsset.zipName);
  const examplesZipPath = path.join(RESOURCES_DIR, examplesAsset.zipName);

  // 2. Download dict if needed
  if (!fs.existsSync(dictZipPath)) {
    download(dictAsset.url, dictZipPath);
  } else {
    console.log(`✅ Dict ZIP already exists: ${dictZipPath}`);
  }

  // 3. Download examples if needed
  if (!fs.existsSync(examplesZipPath)) {
    download(examplesAsset.url, examplesZipPath);
  } else {
    console.log(`✅ Examples ZIP already exists: ${examplesZipPath}`);
  }

  // 4. Clean old JSON files to avoid reading stale data on upgrade
  for (const f of fs.readdirSync(RESOURCES_DIR)) {
    if (
      (f.startsWith("jmdict-eng-common-") || f.startsWith("jmdict-examples-eng-")) &&
      f.endsWith(".json")
    ) {
      fs.unlinkSync(path.join(RESOURCES_DIR, f));
    }
  }

  // 5. Unzip dict
  unzip(dictZipPath, RESOURCES_DIR);

  const dictJsonFile = fs.readdirSync(RESOURCES_DIR).find(
    (f) => f.startsWith("jmdict-eng-common-") && f.endsWith(".json")
  );
  if (!dictJsonFile) {
    throw new Error(
      `No jmdict-eng-common-*.json found in ${RESOURCES_DIR} after unzip`
    );
  }
  const dictJsonPath = path.join(RESOURCES_DIR, dictJsonFile);
  console.log(`   Extracted dict: ${dictJsonFile}`);

  // 6. Read dict JSON
  console.log(`📖 Reading ${dictJsonFile} …`);
  const raw = fs.readFileSync(dictJsonPath, "utf-8");
  const data = JSON.parse(raw) as {
    version: string;
    dictDate: string;
    tags: Record<string, string>;
    words: JMdictWord[];
  };

  console.log(`   Version: ${data.version}, Date: ${data.dictDate}`);
  console.log(`   Words: ${data.words.length}`);
  console.log(`   Tags: ${Object.keys(data.tags).length}\n`);

  // 7. Create / recreate DB
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("🗑  Removed existing jmdict.db");
  }

  const db = new Database(DB_PATH);
  createSchema(db);
  createExamplesSchema(db);

  // 8. Store metadata
  const insertMeta = db.prepare(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`
  );
  insertMeta.run("version", data.version);
  insertMeta.run("dictDate", data.dictDate);
  insertMeta.run("importedAt", new Date().toISOString());
  insertMeta.run("tags", JSON.stringify(data.tags));

  // 9. Import words in batches
  const BATCH_SIZE = 5000;
  const total = data.words.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = data.words.slice(i, i + BATCH_SIZE);
    importWords(db, batch);
    const progress = Math.min(i + BATCH_SIZE, total);
    console.log(`   Imported ${progress} / ${total} entries …`);
  }

  // 10. Unzip and import examples
  console.log(`\n📖 Importing example sentences …`);
  unzip(examplesZipPath, RESOURCES_DIR);

  const examplesJsonFile = fs.readdirSync(RESOURCES_DIR).find(
    (f) => f.startsWith("jmdict-examples-eng-") && f.endsWith(".json")
  );
  if (!examplesJsonFile) {
    throw new Error(
      `No jmdict-examples-eng-*.json found in ${RESOURCES_DIR} after unzip`
    );
  }
  const examplesJsonPath = path.join(RESOURCES_DIR, examplesJsonFile);
  console.log(`   Extracted examples: ${examplesJsonFile}`);

  console.log(`📖 Reading ${examplesJsonFile} …`);
  const examplesRaw = fs.readFileSync(examplesJsonPath, "utf-8");
  const examplesData = JSON.parse(examplesRaw) as {
    words: JMdictExamplesWord[];
  };
  console.log(`   Example entries to process: ${examplesData.words.length}`);

  let totalExamples = 0;
  let totalSentences = 0;
  const exTotal = examplesData.words.length;
  for (let i = 0; i < exTotal; i += BATCH_SIZE) {
    const batch = examplesData.words.slice(i, i + BATCH_SIZE);
    const { exampleCount, sentenceCount, skipped } = importExamples(db, batch);
    totalExamples += exampleCount;
    totalSentences += sentenceCount;
    const progress = Math.min(i + BATCH_SIZE, exTotal);
    console.log(`   Processed ${progress} / ${exTotal} example entries (skipped ${skipped} non-common) …`);
  }
  console.log(`   ✅ Examples: ${totalExamples}, Sentences: ${totalSentences}`);

  // Clean up extracted JSON files to save space
  try {
    fs.unlinkSync(examplesJsonPath);
    console.log(`   🗑  Cleaned up ${examplesJsonFile}`);
  } catch { /* ignore */ }

  insertMeta.run("examplesImportedAt", new Date().toISOString());
  insertMeta.run("examplesCount", String(totalExamples));
  insertMeta.run("sentencesCount", String(totalSentences));

  // 11. Create indices & FTS
  createIndices(db);
  createFts(db);

  // 12. Ensure DELETE journal mode (not WAL) for read-only deployment
  db.exec("PRAGMA journal_mode = DELETE");
  db.exec("VACUUM");

  // 13. Stats
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
  const exampleRowCount = (
    db.prepare("SELECT COUNT(*) as c FROM examples").get() as { c: number }
  ).c;
  const exSentenceCount = (
    db.prepare("SELECT COUNT(*) as c FROM example_sentences").get() as { c: number }
  ).c;

  const fileSizeMB = (fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ Import complete!`);
  console.log(`   Entries:    ${entryCount}`);
  console.log(`   Kanji:      ${kanjiCount}`);
  console.log(`   Kana:       ${kanaCount}`);
  console.log(`   Senses:     ${senseCount}`);
  console.log(`   Glosses:    ${glossCount}`);
  console.log(`   Examples:   ${exampleRowCount}`);
  console.log(`   Sentences:  ${exSentenceCount}`);
  console.log(`   DB size:    ${fileSizeMB} MB`);
  console.log(`   Path:       ${DB_PATH}`);

  db.close();
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
