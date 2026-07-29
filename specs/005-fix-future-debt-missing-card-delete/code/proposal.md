# Proposal: Fix Future Debt Missing Card Reference + Allow Deleting Erroneous Records

## Why

### Bug 1 — Missing Card Reference After Statement Acceptance

When a card statement draft is accepted, all future debt installments show "missing_card_reference" instead of the correct card label (e.g., "Banco Galicia •••• 4521"). The user sees installments appearing in `pendientes` with no card association, making it impossible to understand which card each charge belongs to.

The root cause is a temporal ordering bug in `acceptDraft()`: `CardInstallmentProjection` records are created with `rowId` pointing to the preview row's ID (e.g., `'g-1'` or a preview UUID from the AI extraction), but the actual `CardStatementRow` records are inserted afterward with fresh database-generated UUIDs (`@id @default(uuid())`). At query time, `normalizeProjection()` in `future.service.ts` looks up `rows.get(projection.rowId)`, but the map is keyed by the actual persisted UUIDs — not the preview IDs. The join always fails, `cardLast4` is null, and the `missing_card_reference` diagnostic fires.

### Bug 2 — Cannot Delete Erroneous Records

A user who imports a card statement with wrong data (wrong amounts, wrong card, wrong dates) has no way to clean up the error. The UI has no delete option for accepted card statements. Only draft statements can be deleted via `DELETE /drafts/:draftId`. The Prisma schema already has `onDelete: Cascade` on all `CardStatement` children, but the API surface does not expose statement deletion.

---

## What Changes

### Bug 1 — Fix Projection RowId Reference

- Modify `cards.service.ts` `acceptDraft()` to update `CardInstallmentProjection.rowId` after rows are inserted
- Capture inserted row IDs by querying rows after insert (correlated via `displayOrder + sectionKey + groupKey`)
- Update each projection's `rowId` to the actual persisted UUID before the transaction commits
- Add a data fixup script to repair existing accepted statements that have stale `rowId` values

### Bug 2 — Add Statement Deletion Endpoint

- Add `DELETE /statements/:statementId` route to `cards.controller.ts`
- Add `cardsService.deleteStatement(statementId)` method that hard-deletes the `CardStatement` record
- Prisma cascade delete handles all children (sections, groups, rows, projections, manualPurchases)
- Add delete button / menu action in the frontend card statement list view
- Add user confirmation dialog before deletion

---

## Scope

**In scope:**
- Fix `CardInstallmentProjection.rowId` staleness in `acceptDraft()` (cards.service.ts)
- Add `DELETE /statements/:statementId` endpoint (cards.controller.ts + cards.service.ts)
- Frontend delete affordance with confirmation dialog (FutureDebtView or statement list)
- Data fixup query for existing accepted statements with stale `rowId`
- All related tests (unit + integration)

**Out of scope:**
- Soft-delete / archival of statements (handled by `archiveStatement` already)
- Changes to `normalizeProjection()` logic itself — the join is correct, the data is wrong
- Changes to the Prisma schema (no new fields or models needed)
- Multi-statement deletion (bulk delete)

---

## Capabilities

**New:**
- `DELETE /statements/:statementId` — delete an accepted card statement and all its children
- Frontend delete action with confirmation dialog

**Modified:**
- `acceptDraft()` — now updates `CardInstallmentProjection.rowId` to actual persisted row UUIDs after inserting `CardStatementRow` records

**Fixed (restored behavior):**
- Future debt installments correctly show card reference after statement acceptance
- No more `missing_card_reference` entries for newly accepted statements
- `cardLast4` correctly derived from the associated `CardStatementGroup`

---

## Inputs

- PRD: `specs/005-fix-future-debt-missing-card-delete/PRD.md`
- Discovery: `specs/005-fix-future-debt-missing-card-delete/functional/discovery.md`
- Gherkin: `specs/005-fix-future-debt-missing-card-delete/functional/gherkin.md`
- Feature files:
  - `specs/005-fix-future-debt-missing-card-delete/functional/features/FEAT-027-fix-projection-row-reference.feature`
  - `specs/005-fix-future-debt-missing-card-delete/functional/features/FEAT-028-delete-accepted-card-statement.feature`
