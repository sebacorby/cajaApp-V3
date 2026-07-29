# Specification: specs/006-future-debt-row-deletion

PRD: [PRD.md](./PRD.md)

## FEAT-029: Bulk Delete Future Debt Rows

type: functional

Scenarios: [FEAT-029-future-debt-row-deletion.feature](./features/FEAT-029-future-debt-row-deletion.feature)

Active: features/FEAT-029-future-debt-row-deletion.feature

---

## Supplementary Notes

### Inline confirmation UX

The "Eliminar N filas" button shows an inline confirmation state directly on the button or as an adjacent inline popover — no full modal dialog. The user sees "Confirmar eliminar" / "Cancelar" inline. Clicking outside or Cancel dismisses the confirmation without deleting.

### Manual row deletion

Rows with `isManual = true` correspond to `ManualCardPurchase` records. When deleted, both the `CardInstallmentProjection` and the `ManualCardPurchase` are removed from the database in the same operation.

### Pending rows

All rows in the future debt view are eligible for selection and deletion, including rows that show `missing_card_reference` in the `pendientes` state.
