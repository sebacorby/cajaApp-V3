# Specs: Fix Future Debt Missing Card Reference + Allow Deleting Erroneous Records

Behavioral scenarios: [gherkin.md](../functional/gherkin.md)

---

## Requirements

### FEAT-027: Fix Projection RowId Reference After Statement Acceptance

**Type:** functional
**Scenarios:** [gherkin.md#feat-027](../functional/gherkin.md#feat-027-fix-projection-row-reference-after-statement-acceptance)

**Implementation notes:**
- `CardInstallmentProjection.rowId` must store the actual persisted `CardStatementRow.id` (a UUID), not the preview row's ID
- Correlation between preview rows and persisted rows uses composite key `(displayOrder, sectionKey, groupKey)` — these three fields are set from the preview data at insert time and are stable across the insert
- After inserting `CardStatementRow` records, query them back by `statementId` and build a `Map<compositeKey, rowId>` to update `CardInstallmentProjection.rowId` for all matching projections
- This update happens inside the same `$transaction` as the insert, before `acceptDraft()` returns
- Existing accepted statements with stale `rowId` values are repaired via a fixup query (see tasks)
- `normalizeProjection()` in `future.service.ts` does NOT change — the join logic is correct; the data written was wrong

---

### FEAT-028: Delete Accepted Card Statements

**Type:** functional
**Scenarios:** [gherkin.md#feat-028](../functional/gherkin.md#feat-028-delete-accepted-card-statements)

**Implementation notes:**
- `DELETE /statements/:statementId` hard-deletes the `CardStatement` record; Prisma `onDelete: Cascade` removes all children (sections, groups, rows, projections, manualPurchases) automatically
- `cardsService.deleteStatement(statementId)` first verifies the statement exists and is not a draft, then deletes it
- Frontend: confirmation dialog using `AlertDialog` (Radix UI) before issuing the delete request
- Deleted statements are removed from the database entirely (not soft-deleted/archived — use `archiveStatement` for that use case)
- The delete action is only available for accepted statements; drafts use `DELETE /drafts/:draftId` which calls `discardDraft()`
- Frontend route/UI for deletion: appears as a delete button in the statements list (not in the statement detail view)
