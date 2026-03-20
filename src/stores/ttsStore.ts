import { useEffect } from "react";
import { create } from "zustand";

export interface TtsState {
  /** ID of the sentence currently being spoken, or null if idle */
  playingSentenceId: string | null;
  /** High-level playback status */
  status: "idle" | "playing" | "paused";

  // ── Actions ──
  setPlaying: (sentenceId: string) => void;
  setStopped: () => void;
}

export const useTtsStore = create<TtsState>()((set) => ({
  playingSentenceId: null,
  status: "idle",

  setPlaying: (sentenceId) =>
    set({ playingSentenceId: sentenceId, status: "playing" }),
  setStopped: () => set({ playingSentenceId: null, status: "idle" }),
}));

/**
 * Hook that subscribes to the native TTS state change events and keeps
 * the Zustand store in sync.  Mount this once in a component that lives
 * for the duration of the reader session (e.g. StudyDoublePanel or ReaderPage).
 */
export function useTtsStateSync() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.api?.tts?.onStateChange
    ) {
      return;
    }
    const unsubscribe = window.api.tts.onStateChange((state) => {
      if (state.status === "playing" && state.currentSentenceId) {
        useTtsStore.getState().setPlaying(state.currentSentenceId);
      } else {
        useTtsStore.getState().setStopped();
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);
}
