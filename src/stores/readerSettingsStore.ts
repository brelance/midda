import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadingMode, ScrollMode, ReaderTheme } from "../types/reader";

export interface ReaderSettingsState {
  // ── Values ──
  fontSize: number;
  lineHeight: number;
  theme: ReaderTheme;
  fontFamily: string;
  scrollMode: ScrollMode;
  readingMode: ReadingMode;
  enableTokenHoverTts: boolean;
  analysisTtsLanguage: string;

  // ── Actions ──
  setFontSize: (v: number) => void;
  setLineHeight: (v: number) => void;
  setTheme: (v: ReaderTheme) => void;
  setFontFamily: (v: string) => void;
  setScrollMode: (v: ScrollMode) => void;
  setReadingMode: (v: ReadingMode) => void;
  setEnableTokenHoverTts: (v: boolean) => void;
  setAnalysisTtsLanguage: (v: string) => void;
}

/**
 * One-time migration: read values from the old per-key localStorage entries
 * (e.g. `reader.fontSize`) and merge them into the Zustand-managed state so
 * that users who upgrade don't lose their preferences.
 */
const migrateOldLocalStorageKeys = (
  state: ReaderSettingsState
): ReaderSettingsState => {
  if (typeof window === "undefined") return state;

  const ls = window.localStorage;
  const oldKeys = [
    "reader.fontSize",
    "reader.lineHeight",
    "reader.theme",
    "reader.fontFamily",
    "reader.scrollMode",
    "reader.readingMode",
    "reader.enableTokenHoverTts",
  ] as const;

  // If none of the old keys exist, there's nothing to migrate.
  const hasAnyOld = oldKeys.some((key) => ls.getItem(key) !== null);
  if (!hasAnyOld) return state;

  const migrated = { ...state };

  const readNum = (key: string, fallback: number): number => {
    const raw = ls.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
  };

  migrated.fontSize = readNum("reader.fontSize", state.fontSize);
  migrated.lineHeight = readNum("reader.lineHeight", state.lineHeight);

  const savedTheme = ls.getItem("reader.theme") as ReaderTheme | null;
  if (
    savedTheme &&
    ["light", "warm", "green", "dark"].includes(savedTheme)
  ) {
    migrated.theme = savedTheme;
  }

  const savedFont = ls.getItem("reader.fontFamily");
  if (savedFont !== null) migrated.fontFamily = savedFont;

  const savedScroll = ls.getItem("reader.scrollMode");
  if (savedScroll === "page") migrated.scrollMode = "page";

  const savedReading = ls.getItem("reader.readingMode");
  if (savedReading === "double") migrated.readingMode = "double";
  if (savedReading === "study-double") migrated.readingMode = "study-double";

  const savedHoverTts = ls.getItem("reader.enableTokenHoverTts");
  if (savedHoverTts === "true") migrated.enableTokenHoverTts = true;

  // Clean up old keys after migration
  for (const key of oldKeys) {
    ls.removeItem(key);
  }

  return migrated;
};

export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      lineHeight: 1.8,
      theme: "light" as ReaderTheme,
      fontFamily: "",
      scrollMode: "scroll" as ScrollMode,
      readingMode: "single" as ReadingMode,
      enableTokenHoverTts: false,
      analysisTtsLanguage: "ja-JP",

      setFontSize: (v) => set({ fontSize: v }),
      setLineHeight: (v) => set({ lineHeight: v }),
      setTheme: (v) => set({ theme: v }),
      setFontFamily: (v) => set({ fontFamily: v }),
      setScrollMode: (v) => set({ scrollMode: v }),
      setReadingMode: (v) => set({ readingMode: v }),
      setEnableTokenHoverTts: (v) => set({ enableTokenHoverTts: v }),
      setAnalysisTtsLanguage: (v) => set({ analysisTtsLanguage: v }),
    }),
    {
      name: "reader-settings",
      merge: (persisted, current) => {
        const base = { ...current, ...(persisted as Partial<ReaderSettingsState>) };
        return migrateOldLocalStorageKeys(base);
      },
    }
  )
);
