# PRD — 006-future-debt-row-deletion

## Feature: Bulk Delete Future Debt Rows

### Title
Allow bulk deletion of individual future debt rows from the future debt view

### Problem Statement
The future debt view currently shows installment projections (both card-based and manual), but there is no way to delete individual erroneous or unwanted rows. Users need the ability to remove specific future debt entries, including manual purchases and individual installments from card statements.

### Expected Behavior

#### Row Selection
- Each future debt row in the list displays a checkbox on the left side.
- The user can select individual rows by clicking their checkboxes.
- The user can select all rows at once using a "select all" checkbox in the header.
- Pending rows (entries awaiting card reference resolution) are also selectable and deletable.

#### Deletion Flow
- When one or more rows are selected, a "Eliminar N filas" (Delete N rows) button appears.
- Clicking the button shows an **inline confirmation** directly on the button (e.g., the button text changes to "Confirmar eliminar" with a cancel option, or a confirmation tooltip/popover appears inline — no modal dialog).
- The user can cancel the deletion by clicking "Cancelar" or clicking outside the inline confirmation.
- On confirm, the selected rows are deleted from the database immediately.
- The UI updates right away: deleted rows disappear from the list without a page refresh.

#### Manual Purchase Deletion
- For rows that originate from manual purchases (`isManual = true`), deleting the row removes **both** the `CardInstallmentProjection` record and the underlying `ManualCardPurchase` record.

#### Post-Deletion
- After deletion, the future debt totals are recalculated.
- No undo is provided; the action is final.

---

## Clarifications (from Q&A)

| Question | Answer |
|----------|--------|
| Q1: Confirmation style | Inline confirmation on the "Eliminar N filas" button — no modal dialog |
| Q2: Manual row deletion | Deleting a manual row deletes both the projection AND the ManualCardPurchase |
| Q3: Pending rows | All rows including pending ones can be selected and deleted |
