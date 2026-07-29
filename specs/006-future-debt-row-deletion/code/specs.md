# Specs: 006-future-debt-row-deletion

Behavioral scenarios: [gherkin.md](../functional/gherkin.md)

## Requirements

### FEAT-029: Bulk Delete Future Debt Rows

**Type:** functional
**Scenarios:** [gherkin.md#feat-029](../functional/gherkin.md#feat-029-bulk-delete-future-debt-rows)
**Feature file:** [../functional/features/FEAT-029-future-debt-row-deletion.feature](../functional/features/FEAT-029-future-debt-row-deletion.feature)

**Implementation notes:**
- All rows in the future debt view are eligible for selection, including rows in `pendientes` (missing card reference / `missing_card_reference` state). No rows are excluded.
- Deletion is per-row: the frontend issues N parallel `DELETE /api/future-debt/rows/:id` requests for N selected rows (Q1 decision).
- No cap on the number of rows selectable or deletable per operation (Q3 decision).
- The "Eliminar N filas" button lives in the section header, inline with horizon/refresh controls (Q2 decision).
- Inline confirmation uses button state change or adjacent popover — no modal dialog. Discovery already resolved this pattern.
- For `isManual = true` rows, the `CardInstallmentProjection` and the related `ManualCardPurchase` are deleted in a single Prisma transaction within the `DELETE /api/future-debt/rows/:id` handler.
- UI update is optimistic: after the user confirms deletion, the selected rows are removed from the TanStack Query cache immediately without requiring a manual refresh or page reload.
- No undo. Deletion is final.
