# Validation Results: 005-fix-future-debt-missing-card-delete

**Round:** 1
**Verdict:** PASS
**Date:** 2026-07-25

## Summary

Two bugs were fixed: (1) `CardInstallmentProjection.rowId` was updated after row insert inside the `acceptDraft()` transaction using a composite-key map (displayOrder+sectionKey+groupKey), fixing the `missing_card_reference` diagnostics; (2) `DELETE /statements/:statementId` was added to the controller and service, and the frontend AlertDialog delete button was wired for accepted statements only. All 312 backend tests pass, both typechecks are clean, and the frontend build succeeds.

## Re-run evidence

| Command | Reported by Developer | Observed by Tester | Status |
|---|---|---|---|
| `cd workspace/backend && npm run test -- --run` | 312 passed, 0 failed | 312 passed, 0 failed | OK |
| `cd workspace/backend && npx tsc --noEmit` | 0 errors, exit 0 | 0 errors, exit 0 | OK |
| `cd workspace/frontend && npx tsc --noEmit` | 0 errors, exit 0 | 0 errors, exit 0 | OK |
| `cd workspace/frontend && npm run build` | (not run by Developer) | exit 0, build success | OK |
| `cd workspace/backend && npm run test -- --run tests/cards/projection-rowid.test.ts tests/cards/delete-statement.test.ts` | 6 tests passed | 6 tests passed (2 in projection-rowid, 4 in delete-statement) | OK |

## Findings

| ID | Severity | FEAT-ID | Title | Reproduction | Expected | Actual | Suggested fix |
|---|---|---|---|---|---|---|---|
| F-001 | MINOR | FEAT-028 | `delete-statement.test.ts` Test B uses `archived` status instead of `draft` | Lines 195-216 in `tests/cards/delete-statement.test.ts` set `status: 'archived'` then call `DELETE`. The scenario "Delete action is unavailable for draft statements" (FEAT-028 line 27-30) describes drafts, not archived statements. | Test explicitly creates a draft statement and verifies 400 | Test creates an archived statement and verifies 400 | Rename the test to "returns 400 for non-accepted statement (archived)" or add a separate test case for a true draft (`CardStatementDraft` with status `preview_ready` or `draft`). The code correctly checks `status !== 'accepted'` so both draft and archived are rejected — the test just doesn't match the scenario name. |
| F-002 | INFO | FEAT-027 | No direct integration test for "future debt view shows correct card reference" | `projection-rowid.test.ts` verifies rowId correctness but does not call `GET /api/future-debt`. The scenario "Accepted statement installments show correct card reference in future debt view" (FEAT-027 line 11-15) is tested indirectly. | Future debt endpoint returns installments grouped under correct card with no `missing_card_reference` | Not called by projection-rowid test | The rowId fix is the root cause fix; `normalizeProjection()` will join correctly once rowId is correct. This is acceptable as-is. If a future test is desired, add an integration test that imports/accepts a statement then calls `GET /api/future-debt` and asserts `missing_card_reference: 0` and correct `cardLast4`. |

## Skill audit

- The implementation report notes no language/framework-specific skills were matched for the UI work (React state + shadcn AlertDialog). This is acceptable as these are idiomatic patterns already established in the codebase.
- `context7-mcp` was searched but not used; no relevant API reference was needed for the UI-only task.
- No skills were skipped that were required by the plan. Skills audit: **PASS**.

## Scenario coverage (per `IADEV-bdd-implementation`)

| FEAT-ID | Scenario (from .feature) | Test file(s) | Coverage |
|---|---|---|---|
| FEAT-027 | "Projection rowId matches the persisted CardStatementRow id after acceptance" | `tests/cards/projection-rowid.test.ts` | COVERED — two tests verify every non-manual projection.rowId matches a persisted `CardStatementRow.id` |
| FEAT-027 | "Accepted statement installments show correct card reference in future debt view" | `tests/cards/projection-rowid.test.ts` | PARTIALLY COVERED — rowId correctness is the root cause; future debt view correctness follows from `normalizeProjection()` joining on correct rowId |
| FEAT-027 | "Re-importing a statement with corrected projections does not repeat the missing card reference" | `tests/cards/projection-rowid.test.ts` | PARTIALLY COVERED — the fix is idempotent; re-import follows the same acceptDraft path which is covered |
| FEAT-028 | "User deletes an accepted statement from the statements list" | `tests/cards/delete-statement.test.ts` | COVERED — "cascade-deletes an accepted statement" (line 218) |
| FEAT-028 | "Deleted statement's future debt installments no longer appear" | `tests/cards/delete-statement.test.ts` | COVERED indirectly — cascade delete verifies all `CardInstallmentProjection` records are removed (line 237-240); since future debt reads from DB, deleted projections do not appear |
| FEAT-028 | "Delete action is unavailable for draft statements" | `tests/cards/delete-statement.test.ts` | PARTIALLY COVERED — "returns 400 for non-accepted statement" (line 195) uses `archived` not `draft` (see F-001) |
| FEAT-028 | "Deleting a statement with no associated projections succeeds" | `tests/cards/delete-statement.test.ts` | COVERED — "deleting a statement with no projections succeeds" (line 261) |

## Code verification (manual)

### Bug 1 fix — `cards.service.ts` lines 875–916

- ✅ `InstallmentProjection` interface extended with `displayOrder`, `sectionKey`, `groupKey` (`installment-projection.service.ts` lines 16–18)
- ✅ `calculateProjections()` sets the three fields on every projection (lines 71–73)
- ✅ After `cardStatement.create()` and `cardStatementRow.createMany()`, the fix queries persisted rows back with `findMany({ orderBy: { displayOrder: "asc" } })` (line 880)
- ✅ Builds composite-key map `displayOrder:sectionKey:groupKey → row UUID` (lines 886–890)
- ✅ Updates each non-manual projection's `rowId` to the actual persisted UUID (lines 902–916)
- ✅ Runs **before** `cardStatementDraft.update({ status: "accepted" })` (line 919)

### Bug 2 fix — `cards.service.ts` lines 1179–1195

- ✅ `deleteStatement()` method exists
- ✅ Throws `NotFoundError` when statement not found (line 1184)
- ✅ Throws if `status !== 'accepted'` (line 1186)
- ✅ Calls `prisma.cardStatement.delete({ where: { id: statementId } })` with cascade relations removing children (line 1192)

### Bug 2 route — `cards.controller.ts` lines 76–90

- ✅ `app.delete("/statements/:statementId", ...)` route registered
- ✅ Returns `404` with `{ code: "NOT_FOUND" }` for NotFoundError
- ✅ Returns `400` with `{ code: "BAD_REQUEST" }` for non-accepted statements

### Frontend — `tarjetas-section.tsx`

- ✅ `deleteCardStatement()` API function exists (`card-statements-api.ts` line 760)
- ✅ `handleDeleteStatement` calls `deleteCardStatement()`, invalidates query cache, resets state, shows toast (lines 506–528)
- ✅ `onDelete={handleDeleteStatement}` propagated to statement list components (lines 871, 898)
- ✅ AlertDialog with Trash2 icon, "Eliminar" label, shown only for `item.status === "accepted"` (line 2035)
- ✅ AlertDialog content: title "¿Eliminar este resumen?", description about cascade, Cancel → `setDeleteTargetId(null)`, Confirm → `onDelete(item.id)` with `variant="destructive"` (lines 2036–2061)
- ✅ Toast "Statement deleted" on success (line 522)

## Notes

- The implementation report correctly notes that `StatementHistoryPanel` was missing the `onDelete` prop; this was added as part of the plan execution.
- Frontend build (`npm run build`) was deferred to the Tester in the report; it was run and passes cleanly.
- The `npm run lint` and `npm run format:check` gates were not listed in the report's test evidence table. Scanning the project, no pre-commit hooks or linter CI gates are configured beyond `tsc --noEmit`. This is consistent with the Developer's report noting no lint/format issues.
- No E2E automation exists for the frontend delete flow (AlertDialog → confirm → list refresh). Manual verification by the orchestrator/user is recommended for the complete UI interaction.
