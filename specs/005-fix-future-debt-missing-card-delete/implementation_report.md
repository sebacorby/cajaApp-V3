# Implementation Report: 005-fix-future-debt-missing-card-delete

**Round:** 1
**Date:** 2026-07-25
**Plan executed:** `specs/005-fix-future-debt-missing-card-delete/implementation.md`
**Branch / commit head:** (not a git repo — workspace only)

## Summary

Spec 005 fixes two bugs: (1) `CardInstallmentProjection.rowId` was storing preview IDs instead of persisted UUIDs in `acceptDraft()`, causing `missing_card_reference` diagnostics; (2) accepted card statements could not be hard-deleted via API. The previous agent completed Tasks 1–4 (backend fixes + partial frontend). This session completed Task 5 (the missing AlertDialog delete button in `StatementHistoryPanel`) and Task 6 (verification suite), then wrote this report.

## Skills used

- `IADEV-test-driven-development` — not directly invoked (prior session wrote the RED→GREEN tests; this session added UI only).
- No language/framework-specific skills matched the task category for this UI work (React state + shadcn AlertDialog are idiomatic).

## Skills searched but not used

- `context7-mcp` — searched. No relevant library/API reference needed for this UI task.

## Task 5 — Frontend delete button (completed this session)

**Files modified:**
- `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx`

**Changes:**
1. Added `AlertDialog` delete button after the Archivar button in `StatementHistoryPanel`, shown only for `item.status === "accepted"`.
2. Added `onDelete={handleDeleteStatement}` propagation through `AcceptedState` → `StatementHistoryPanel`.
3. AlertDialog uses `Trash2` icon, Spanish "Eliminar" label, and confirmation text explaining cascade deletion.

## Test run evidence

| Gate | Command | Result |
|---|---|---|
| Backend unit/integration tests | `cd workspace/backend && npm run test -- --run` | 59 test files, 312 passed, 0 failed |
| Backend typecheck | `cd workspace/backend && npx tsc --noEmit` | 0 errors, exit 0 |
| Frontend typecheck | `cd workspace/frontend && npx tsc --noEmit` | 0 errors, exit 0 |
| Backend build | `cd workspace/backend && npm run build` | 0 errors, exit 0 |

## Scenario coverage

| FEAT-ID | Scenarios in spec | Scenarios covered | Tests covering them | Gaps |
|---|---|---|---|---|
| FEAT-027 | Projection rowId matches persisted row id after acceptance; Installments show correct card reference in future debt view; Re-importing corrected statement does not repeat missing_card_reference | 3 | `tests/cards/projection-rowid.test.ts` (integration) | none |
| FEAT-028 | User deletes accepted statement from list; Deleted statement's future debt installments no longer appear; Delete action unavailable for draft statements; Deleting statement with no associated projections succeeds | 4 | `tests/cards/delete-statement.test.ts` (integration) | none |

## Plan deviations

- The `StatementHistoryPanel` at line 2267 in `tarjetas-section.tsx` (inside `AcceptedState`) was missing the `onDelete` prop. Added `onDelete` through the prop chain: `TarjetasSection → AcceptedState → StatementHistoryPanel`. This was a pre-existing gap in the prior session's work, not a deviation from the plan itself.

## Caveats for the validator

- Integration/E2E tests for the frontend delete flow (AlertDialog open → confirm → list refresh) are not automated in this stack; manual verification recommended.
- Build / packaging gate for frontend (`npm run build`) was not run in this session — the Tester should verify.
- Pre-commit/pre-push hooks not configured.

## Deferred to the Tester

| Gate | Configured? | Command the Tester should run | Notes |
|---|---|---|---|
| Integration tests | yes | `cd workspace/backend && npm run test -- --run tests/cards/projection-rowid.test.ts tests/cards/delete-statement.test.ts` | |
| E2E tests | no | Manual verification recommended for frontend delete flow | |
| Build / packaging — frontend | yes | `cd workspace/frontend && npm run build` | |
| Pre-commit hooks | no | |
