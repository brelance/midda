/**
 * Read-only connection to the bundled JMdict SQLite dictionary.
 *
 * - Dev: reads from  <project>/resources/jmdict.db
 * - Prod: reads from  <resourcesPath>/jmdict.db  (extraResources)
 */
import Database from "better-sqlite3";
import type { Database as DB } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

function resolveDictPath(): string {
  // Production: electron-builder extraResources puts it next to app.asar
  const prodPath = path.join(process.resourcesPath, "jmdict.db");
  if (fs.existsSync(prodPath)) return prodPath;

  // Development: project root / resources
  const devPath = path.join(app.getAppPath(), "resources", "jmdict.db");
  if (fs.existsSync(devPath)) return devPath;

  // Fallback: CWD-based (for running scripts outside packaged app)
  const cwdPath = path.join(process.cwd(), "resources", "jmdict.db");
  if (fs.existsSync(cwdPath)) return cwdPath;

  throw new Error(
    `JMdict database not found. Tried:\n  ${prodPath}\n  ${devPath}\n  ${cwdPath}\nRun "npx tsx scripts/import-jmdict.ts" to generate it.`
  );
}

let dictDb: DB | undefined;

export function getDictDb(): DB {
  if (!dictDb) {
    const dbPath = resolveDictPath();
    dictDb = new Database(dbPath, { readonly: true });
    console.log("[dict] Opened JMdict database at", dbPath);
  }
  return dictDb;
}

export function closeDictDb(): void {
  if (dictDb) {
    dictDb.close();
    dictDb = undefined;
  }
}

/**
 * Returns true if the dictionary database file exists.
 * Useful for graceful degradation when dict is not yet imported.
 */
export function isDictAvailable(): boolean {
  try {
    resolveDictPath();
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true if the examples tables exist in the dictionary database.
 * A pre-change jmdict.db may lack these tables; this avoids "no such table"
 * errors at runtime when the user hasn't reimported the dictionary.
 */
let _examplesAvailable: boolean | undefined;
export function isExamplesAvailable(): boolean {
  if (_examplesAvailable !== undefined) return _examplesAvailable;
  try {
    const db = getDictDb();
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='examples'"
      )
      .get();
    _examplesAvailable = !!row;
  } catch {
    _examplesAvailable = false;
  }
  return _examplesAvailable;
}
