# Sentence Analysis DB Upsert – Missing Named Parameter Fix Plan

## Problem Diagnosis
- **Error**: `RangeError: Missing named parameter "paragraphId"` triggered via `ipcRenderer.invoke("db:sentenceAnalysis:upsert", payload)`.
- **Context**:
  - `SentenceAnalysisRepository.upsert` prepares an INSERT/UPSERT statement with named parameters `@paragraphId`, `@chapterId`, `@sentenceId`.
  - The renderer calls `sentenceAnalysis.upsert` with payloads omitting `paragraphId` (and sometimes other optional locators).
  - better-sqlite3 requires every named parameter referenced in the statement to be supplied; `undefined` properties are stripped from the bound object, so the driver throws.
- **Root cause**: The repository does not normalize optional locator fields to `null` when absent, leading to missing named parameters in the statement execution.

## Remediation Plan
1. **Normalize Upsert Bindings**
   - Update `SentenceAnalysisRepository.upsert` to always supply all named parameters (`chapterId`, `paragraphId`, `sentenceId`) with explicit `null` when the payload omits them.
   - Ensure `sentenceHash` generation still receives `undefined` for optional locators so hash semantics remain unchanged.
2. **Audit Other Statements**
   - Review related repository methods (`getByContextStmt`, potential job enqueue statements) to confirm they already normalize optional parameters (or adjust accordingly).
3. **Validation**
   - Re-run the sentence analysis flow in the reader:
     - Trigger a fresh analysis to hit the upsert path.
     - Confirm no `RangeError` appears and tokens persist to the database.
   - Optionally inspect the stored record via a quick query/log to verify null handling.

## Task Breakdown
1. Modify `SentenceAnalysisRepository.upsert` bindings to map optional fields with `?? null`.
2. Double-check for other named-parameter statements that may suffer from the same issue; fix if needed.
3. Test the end-to-end sentence analysis request to ensure the error is resolved without regressions.
