/**
 * IPC handler for local dictionary lookups.
 *
 * Channel: "word-dict-local"
 * Input:   { word: string }
 * Output:  DictEntry[] | null
 */
import { ipcMain } from "electron";
import { isDictAvailable, isExamplesAvailable } from "./dictDatabase";
import {
  lookupWord,
  getDictTags,
  lookupExamples,
  type DictEntry,
  type DictExample,
} from "./dictRepository";

export interface LocalDictResult {
  found: boolean;
  entries: DictEntry[];
  tags?: Record<string, string>;
}

export function setupLocalDictApiHandler(): void {
  ipcMain.handle(
    "word-dict-local",
    async (
      _event,
      payload: { word: string; includeTags?: boolean }
    ): Promise<LocalDictResult> => {
      const word =
        typeof payload.word === "string" ? payload.word.trim() : "";
      if (!word) {
        return { found: false, entries: [] };
      }

      if (!isDictAvailable()) {
        console.warn(
          "[dict] JMdict database not available. Run import-jmdict first."
        );
        return { found: false, entries: [] };
      }

      try {
        const entries = lookupWord(word);
        const result: LocalDictResult = {
          found: entries.length > 0,
          entries,
        };

        if (payload.includeTags) {
          result.tags = getDictTags();
        }

        return result;
      } catch (err) {
        console.error("[dict] Lookup error:", err);
        return { found: false, entries: [] };
      }
    }
  );

  ipcMain.handle(
    "word-dict-examples",
    async (
      _event,
      payload: { entryId: string; limit?: number }
    ): Promise<DictExample[]> => {
      const entryId =
        typeof payload.entryId === "string" ? payload.entryId.trim() : "";
      if (!entryId) return [];

      if (!isDictAvailable() || !isExamplesAvailable()) return [];

      try {
        return lookupExamples(entryId, payload.limit);
      } catch (err) {
        console.error("[dict] Examples lookup error:", err);
        return [];
      }
    }
  );
}
