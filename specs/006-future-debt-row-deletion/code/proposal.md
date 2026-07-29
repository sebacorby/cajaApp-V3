# Proposal: 006-future-debt-row-deletion

## Why

The future debt view currently surfaces installment projections for both card-based and manual purchases, but users have no way to remove individual erroneous or unwanted rows. When a manual purchase is entered incorrectly or an individual installment projection is no longer relevant, the only recourse today is to wait for it to expire or to delete the entire source statement — both poor experiences.

Concretely: a user who imported a card statement and sees 12 monthly installments for a purchase they cancelled cannot delete just the unwanted installment rows; they must either live with the noise or delete the whole statement. Similarly, a user who created a manual future debt entry with a wrong amount has no self-service fix.

## What Changes

### Frontend — Row Selection UI

Add a checkbox to every row in the future debt list and a "select all" checkbox in the list header. When one or more rows are selected, an "Eliminar N filas" button appears in the section header (inline with horizon/refresh controls). The button uses an inline confirmation pattern — no modal dialog.

### Frontend — Deletion Flow

Clicking "Eliminar N filas" transitions the button to a confirm state showing "Confirmar" and "Cancelar" inline. On confirm, the frontend issues N parallel `DELETE /api/future-debt/rows/:id` requests (one per selected row). Deleted rows disappear from the UI immediately via TanStack Query cache invalidation / optimistic update. On cancel, the confirmation is dismissed and selection is preserved.

### Backend — Per-Row Delete Endpoint

Add `DELETE /api/future-debt/rows/:id` which accepts a single projection ID. The handler loads the `CardInstallmentProjection`, checks `isManual`, and:
- If `isManual = false`: deletes only the `CardInstallmentProjection` record.
- If `isManual = true`: deletes both the `CardInstallmentProjection` and the related `ManualCardPurchase` in a transaction.

The endpoint returns `204 No Content` on success and `404 Not Found` if the projection does not exist.

## Scope

**In scope:**
- Per-row checkbox selection with select-all in header
- "Eliminar N filas" button in section header, inline confirmation
- `DELETE /api/future-debt/rows/:id` endpoint with cascade delete for manual rows
- Optimistic UI update after deletion (rows disappear without refresh)
- Support for pending/missing-card-reference rows (all rows are selectable)

**Out of scope:**
- Bulk delete in a single request (N calls for N rows — Q1 decision)
- Undo / trash mechanism
- Modifying future debt recalculation logic (totals recalculate as a side effect of standard projection logic)

## Capabilities

**New:**
- Select and delete individual future debt rows from the future debt view
- Cascade delete of `ManualCardPurchase` when deleting a manual projection row

**Modified:** None

## Inputs

- PRD: `specs/006-future-debt-row-deletion/PRD.md`
- Discovery: `specs/006-future-debt-row-deletion/functional/discovery.md`
- Gherkin: `specs/006-future-debt-row-deletion/functional/gherkin.md`
- Scenarios: `specs/006-future-debt-row-deletion/functional/features/FEAT-029-future-debt-row-deletion.feature`
