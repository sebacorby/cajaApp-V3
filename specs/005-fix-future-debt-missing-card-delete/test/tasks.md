# Tasks: Fix Future Debt Missing Card Reference + Allow Deleting Erroneous Records

---

## 1. Bug 1 — Fix Projection RowId Reference (acceptDraft)

- [ ] 1.1 Capture `displayOrder`, `sectionKey`, and `groupKey` on each projection object in `installmentProjectionService.calculateProjections()`
  - Add these three fields to the projection object returned by `calculateProjections()` so they are available in `acceptDraft()`
- [ ] 1.2 In `acceptDraft()`, after inserting `CardStatementRow` records, query them back ordered by `displayOrder`
  - Build a map from composite key `${displayOrder}:${sectionKey}:${groupKey}` → `row.id`
- [ ] 1.3 Update `CardInstallmentProjection.rowId` for each non-manual projection using the map
  - Do this inside the same transaction before `acceptDraft()` returns
- [ ] 1.4 Write data fixup script / Prisma raw query to repair existing accepted statements with stale `rowId`
  - For each accepted `CardStatement`, find rows by `displayOrder + sectionKey + groupKey`, then update `projection.rowId` to match the actual row ID
- [ ] 1.5 Add unit test: accept a draft and immediately verify `CardInstallmentProjection.rowId` matches the persisted `CardStatementRow.id`
  - RED first: assert `projection.rowId === persistedRow.id` (should fail before fix)
  - GREEN: pass after fix

---

## 2. Bug 2 — Add DELETE /statements/:statementId

- [ ] 2.1 Add `deleteStatement(statementId)` method to `CardsService` in `cards.service.ts`
  - Verify statement exists and `status === "accepted"` (throw otherwise)
  - Hard-delete via `prisma.cardStatement.delete({ where: { id: statementId } })`
  - Return `{ success: true, deletedId: string }`
- [ ] 2.2 Add `DELETE /statements/:statementId` route to `cards.controller.ts`
  - Call `cardsService.deleteStatement()`, return the result
- [ ] 2.3 Add RED integration test: `DELETE /statements/:statementId` returns 404 for non-existent ID
  - Add RED test: deleting a draft statement returns 400 error
  - GREEN after implementation
- [ ] 2.4 Add RED integration test: after `DELETE /statements/:statementId`, the statement and all children are gone
  - Verify `CardStatement.findUnique` returns null
  - Verify projections, rows, groups, sections, manualPurchases are cascade-deleted
  - GREEN after implementation

---

## 3. Frontend — Delete Affordance for Accepted Statements

- [ ] 3.1 Add delete button to the card statements list UI
  - Show only for statements with `status === "accepted"`
  - Draft statements continue to use the existing discard action
- [ ] 3.2 Wire up confirmation dialog (Radix UI `AlertDialog`)
  - Message: "Are you sure you want to delete this statement? This will remove all associated data including future debt installments. This action cannot be undone."
  - Confirm button label: "Delete"
  - Cancel button label: "Cancel"
- [ ] 3.3 On confirm, call `DELETE /statements/:statementId` and refresh the statements list
  - Show success toast
  - Remove deleted statement from local state
- [ ] 3.4 Handle error case: if delete fails, show error toast and do not close dialog

---

## 4. Verification

- [ ] 4.1 Run `vitest` — all backend tests pass
  - Especially the new tests for FEAT-027 and FEAT-028
- [ ] 4.2 Run full backend test suite (`npm run test` in backend workspace)
  - Verify no regressions in existing card statement and future debt tests
- [ ] 4.3 Manual verification — accept a draft and check future debt view
  - Installments should show correct card label (e.g., "Banco Galicia •••• 4521")
  - No entries should show `missing_card_reference`
- [ ] 4.4 Manual verification — delete an accepted statement from the statements list
  - Statement disappears from list
  - Future debt view shows no installments from the deleted statement
- [ ] 4.5 Run frontend build (`npm run build` in frontend workspace)
  - Verify no TypeScript errors introduced by the frontend changes
