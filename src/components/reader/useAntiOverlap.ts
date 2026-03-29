/**
 * useAntiOverlap — utilities for DOM-measurement-based collision resolution
 * for 2D-projected text blocks in the ImageStudyPanel right pane.
 *
 * Provides:
 * - useBlockRefs(): ref management for block elements
 * - NudgeOffset type: pixel offset for transform: translate
 *
 * The actual collision resolution logic is inlined in ImageStudyPanel
 * via a useEffect that runs after each layout change.
 */

import { useCallback, useRef } from "react";

export interface NudgeOffset {
  /** Pixel offset to apply via transform: translate */
  dx: number;
  dy: number;
}

/**
 * Utility: register block refs for anti-overlap DOM measurement.
 * Usage in JSX: <div ref={setBlockRef(blockIndex)} ...>
 */
export function useBlockRefs(): {
  setBlockRef: (index: number) => (el: HTMLDivElement | null) => void;
  blockRefsMap: React.MutableRefObject<Map<number, HTMLDivElement>>;
} {
  const blockRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  const setBlockRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) {
        blockRefsMap.current.set(index, el);
      } else {
        blockRefsMap.current.delete(index);
      }
    },
    []
  );

  return { setBlockRef, blockRefsMap };
}
