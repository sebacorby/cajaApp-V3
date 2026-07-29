# Specification: specs/005-fix-future-debt-missing-card-delete

PRD: [PRD.md](./PRD.md)

## FEAT-027: Fix Projection RowId Reference After Statement Acceptance

type: functional

Scenarios: [FEAT-027-fix-projection-row-reference.feature](./features/FEAT-027-fix-projection-row-reference.feature)

Active: features/FEAT-027-fix-projection-row-reference.feature

---

## FEAT-028: Delete Accepted Card Statements

type: functional

Scenarios: [FEAT-028-delete-accepted-card-statement.feature](./features/FEAT-028-delete-accepted-card-statement.feature)

Active: features/FEAT-028-delete-accepted-card-statement.feature

---

## Supplementary Notes

### Bug 1 — Root cause (product level)

When `acceptDraft()` creates `CardInstallmentProjection` records, it does so BEFORE inserting the `CardStatementRow` records. The projection's `rowId` field stores the preview row's `id` (from the AI extraction). However, when `CardStatementRow` records are inserted, they receive fresh UUIDs via `@default(uuid())`. At query time, `normalizeProjection()` in `future.service.ts` looks up `rows.get(projection.rowId)` — but the map is keyed by the actual persisted row UUIDs, not the preview IDs. The join always fails, `cardLast4` is null, and the `missing_card_reference` diagnostic fires.

The fix must update `CardInstallmentProjection.rowId` AFTER rows are inserted, to store the actual database-generated UUIDs.

### Bug 2 — Root cause (product level)

There is no `DELETE /statements/:statementId` endpoint in `cards.controller.ts`. Only draft statements can be deleted (`DELETE /drafts/:draftId`). The Prisma schema has proper `onDelete: Cascade` relations on all `CardStatement` children, but the API surface does not expose statement deletion. The frontend also lacks a delete affordance for accepted statements.

### Expected outcomes after fixes

1. Future debt installments are grouped under the correct card with proper card labels (e.g., "Banco Galicia •••• 4521") and no longer appear in `pendientes` with `missing_card_reference`.
2. Users can delete accepted statements with wrong data from the UI, removing all cascade-connected records (sections, groups, rows, projections, manual purchases).
