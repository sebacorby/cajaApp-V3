# Discovery — 006-future-debt-row-deletion

## Change & PRD

- **Spec folder:** `specs/006-future-debt-row-deletion`
- **PRD:** `PRD.md`
- **Type:** Functional enhancement

---

## Summary

Add the ability to select and bulk-delete individual future debt rows from the future debt view. Each row gets a checkbox; a "Eliminar N filas" button with inline confirmation triggers deletion. For manual rows, both the projection and the underlying `ManualCardPurchase` are deleted. All rows including `pendientes` are selectable.

---

## Features

| FEAT-ID | Name | Type |
|---------|------|------|
| FEAT-029 | Bulk delete future debt rows | functional |

---

## Resolved Decisions

- **Confirmation style:** Inline confirmation on the "Eliminar N filas" button — no modal dialog. The button switches to a confirm state or shows an inline popover/tooltip with Confirm/Cancel actions.
- **Manual row deletion scope:** When a row with `isManual = true` is deleted, both the `CardInstallmentProjection` record AND the related `ManualCardPurchase` record are deleted from the database.
- **Pending rows eligibility:** All rows in the future debt view are selectable, including rows in `pendientes` (missing card reference state). There is no special exclusion.
- **UI update:** After deletion, rows disappear from the UI immediately (optimistic update / no manual refresh required).
- **No undo:** Deletion is final. No trash/undo mechanism is provided.

---

## Open Questions for Planning

1. Does the `DELETE` call target a single endpoint with an array of IDs, or is it one call per row?
2. Should a deletion require the user to be on a specific screen/section, or is the delete button accessible globally in the future debt view?
3. Is there a maximum number of rows that can be deleted in one operation?

---

## Collision Check

No collisions detected against the active feature set. FEAT-028 (delete accepted card statements) deletes entire statements with cascade. This feature targets individual installment projection rows (not whole statements) with fine-grained selection. They are complementary — FEAT-028 removes statements; FEAT-029 removes individual future debt rows.

---

## Codebase Context

- **Backend module touched:** `modules/future/future.service.ts` — query and normalize projections; `modules/cards/cards.service.ts` — may need a method to delete individual projections; `modules/manual-purchases/` — `ManualCardPurchase` entity
- **Frontend:** `FutureDebtView.tsx` or equivalent — needs checkbox selection UI and inline confirmation on delete button
- **Prisma models:** `CardInstallmentProjection` (has `isManual` flag), `ManualCardPurchase`
- **API:** Likely a new `DELETE /future-debt/rows` endpoint accepting an array of projection IDs, or `DELETE /future-debt/rows/:id` per row
