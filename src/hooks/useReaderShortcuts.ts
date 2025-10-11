import { useEffect } from "react";

interface ReaderShortcutOptions {
  onExit?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onToggleToc?: () => void;
  enabled?: boolean;
}

export const useReaderShortcuts = ({
  onExit,
  onNextChapter,
  onPrevChapter,
  onToggleToc,
  enabled = true,
}: ReaderShortcutOptions): void => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          onNextChapter?.();
          event.preventDefault();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          onPrevChapter?.();
          event.preventDefault();
          break;
        case "Escape":
          onExit?.();
          event.preventDefault();
          break;
        case "t":
        case "T":
          onToggleToc?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [enabled, onExit, onNextChapter, onPrevChapter, onToggleToc]);
};
