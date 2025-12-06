# Fix Plan: Reduce High-Frequency Re-Renders in Reader

## Background
- Scroll-driven progress updates call `setChapterProgress` on every scroll tick, which updates `bookProgress` and triggers `onProgressChange` in `ReaderPage`, leading to `App.handleReaderProgressChange` mutating global `books` state on every pixel scroll.
- Sentence analysis processing loop updates `sentenceItems` multiple times per batch (`idle`→`loading`→`loaded`/`error`) in a tight `while (true)`, causing cascaded renders when many sentences exist.

## Goals
- Throttle or coalesce UI state updates so scrolling and sentence processing do not cause excessive renders.
- Keep UX responsive (progress feels live; analysis updates remain timely) while cutting render frequency.

## Plan
1) **Progress update throttling**
   - Add minimal delta threshold (e.g., 0.5–1%) before calling `setChapterProgress`/`setBookProgress`.
   - Optionally debounce `onProgressChange` dispatch to App so `books` state is not mutated on every scroll tick.

2) **Batch sentence analysis state updates**
   - In `processPendingSentences`, build the next `sentenceItems` array and apply with a single `setSentenceItems` per processed sentence batch (or per idle macro task).
   - Use `Promise.resolve().then()` or `requestIdleCallback` to yield between batches to keep the UI responsive.

3) **Validation**
   - Profile with React DevTools “Highlight updates” and Performance tab; verify updates occur in batches during scroll and analysis.
   - Confirm reading progress UI still feels accurate and analysis statuses update without noticeable lag.

## Risks & Mitigations
- Progress feels less granular if threshold too high → tune threshold to small values and keep header/footer progress bar smooth.
- Batching analysis updates might delay error display → keep batch size small or flush immediately when a sentence errors.
