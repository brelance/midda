# Fix Plan: Reader Memory OOM (V8 heap limit)

## Background
- Symptom: Renderer crashes with `V8 javascript OOM (Reached heap limit)` after browsing/reading multiple books.
- Root cause: `books` state stores full chapter HTML and base64 cover data for every selected/imported book and never prunes it. `ensureBookChapters` and `handleBookAdded` push complete chapter content into the long-lived `books` array; `handleSelectBook` triggers loading even when not entering the reader; `handleExitReader` doesn’t drop chapters. Memory grows unbounded as more books are touched.

## Goals
- Keep `books` state lightweight (metadata only) outside the reader.
- Load chapter content lazily when entering the reader; release it when exiting.
- Avoid unnecessary chapter loading on simple selection/navigation.

## Non-goals
- Changing DB schema or EPUB parsing logic.
- Altering reader UI/UX beyond data-loading timing.

## Plan
1) **Audit state flows (quick check)**  
   Confirm all entry points that hydrate `chapters` into `books` (`handleBookAdded`, `ensureBookChapters`, `handleSelectBook`, reader entry) and where we can clear them (`handleExitReader`, closing details pane).

2) **Make `books` metadata-only**  
   - In `handleBookAdded`: persist full chapter content to DB, but store only metadata (no `chapters` array) in `books`/`selectedBook`.  
   - In initial DB load: ensure `mapDbBookToBook` leaves `chapters` undefined until explicitly loaded.

3) **Lazy-load chapters only when required**  
   - Call `ensureBookChapters` only when entering the reader (and possibly when opening details pane if reading there is needed).  
   - Remove the call from `handleSelectBook` unless the UX requires immediate chapter availability.

4) **Release heavy data when leaving reader**  
   - On reader exit, strip `chapters` from `books` and `selectedBook` for the active book; keep progress/currentChapterId/lastReadChapterId and other metadata.  
   - Guard against dangling refs by cloning the book entry before clearing `chapters`.

5) **Optional hardening**  
   - Consider trimming base64 covers from `books` after rendering (keep path only) if still large.  
   - Add a safety cap: if a book’s `chapters` is loaded and `books` length grows, unload other books’ chapters.

6) **Validation**  
   - Manual: open DevTools Memory, select/import multiple books, enter/exit reader repeatedly; confirm heap stabilizes and snapshots show `chapters` absent when not in reader.  
   - Functional: ensure reader still loads chapters correctly and navigation persists progress.

## Risks & Mitigations
- Race conditions when exiting reader while a chapter load is in-flight → track bookId/chapterId in `ensureBookChapters`, ignore outdated responses.
- Possible UI regression if details pane expects `chapters` for listing → either keep a lightweight chapter list (without content) or load on-demand when pane opens. Document chosen behavior.
