# ReaderPage Progress Callback Loop – Analysis & Remediation Plan

## Problem Diagnosis
- **Observed warning**: `App.tsx:193 Warning: Maximum update depth exceeded` while rendering `ReaderPage`.
- **Trigger conditions**:
  - `ReaderPage` calls `onProgressChange(bookProgress)` from a `useEffect`.
  - Parent `App` re-renders in response and recreates the inline handler `handleReaderProgressChange`.
  - Because the handler reference changes on every render, `ReaderPage`'s effect fires again even when `bookProgress` is unchanged, creating an infinite update loop.
- **Root cause**: Unstable function props (`onProgressChange`, possibly `onChapterChange`) passed to `ReaderPage`, combined with an effect that depends on those props, results in repeated state updates.

## Proposed Remediation
1. **Stabilize reader callbacks in `App.tsx`**  
   - Wrap `updateBookById`, `handleReaderChapterChange`, and `handleReaderProgressChange` with `useCallback` so their identities only change when their logical dependencies change.

2. **Audit effect dependencies in `ReaderPage.tsx`**  
   - Confirm that effects invoking callbacks depend on stable values only.  
   - If additional dynamic callbacks remain, consider capturing them in refs to avoid unnecessary effect triggers.

3. **Regression check**  
   - Verify the warning disappears and navigation/progress updates still persist.  
   - Manually test chapter navigation, progress updates, and sentence analysis toggle to ensure no new regressions.

## Task Breakdown
1. **Callback stabilization**
   - Introduce `useCallback` wrappers for `updateBookById`, `handleReaderChapterChange`, and `handleReaderProgressChange`.
   - Ensure dependency arrays are correct (`readerBookId` updates should still propagate).
2. **ReaderPage effect review**
   - Revisit the `useEffect` that calls `onProgressChange` and confirm no further guard is required once callbacks are stable.
3. **Testing**
   - Reload reader view; confirm console is free of maximum depth warnings.
   - Exercise progress, chapter change, and sentence analysis features to confirm expected behavior.

## Risks & Mitigations
- **Risk**: Incorrect dependencies in `useCallback` may freeze state updates.  
  - *Mitigation*: Carefully include `readerBookId` and other stateful values in dependency arrays; add unit/integration tests if available.
- **Risk**: Other props with unstable references may still trigger similar loops.  
  - *Mitigation*: Monitor console after fix; extend memoization as needed.
