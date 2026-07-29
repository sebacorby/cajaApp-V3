# Tasks: 006-future-debt-row-deletion

## 1. Backend — Delete Endpoint

- [ ] 1.1 Add `DELETE /api/future-debt/rows/:id` route in `future.routes.ts`
  - Route registers at `future.routes.ts`; method DELETE, path `/rows/:id`
- [ ] 1.2 Add `deleteProjectionRow(id: string)` in `future.service.ts`
  - Uses Prisma transaction: load projection, check `isManual`, delete `ManualCardPurchase` if manual, delete `CardInstallmentProjection`
  - Returns `204 No Content` on success; throws `NotFoundError` if projection not found
- [ ] 1.3 Add `deleteRow` handler in `future.controller.ts`
  - Parses `id` from path params, calls service, returns `204`
- [ ] 1.4 Handle malformed ID in controller
  - Returns `400 Bad Request` if CUID format is invalid

## 2. Frontend — Row Checkbox UI

- [ ] 2.1 Add checkbox to each `FutureDebtRow`
  - Controlled checkbox; calls `onSelect(id)` callback from parent
- [ ] 2.2 Add "select all" checkbox in list header
  - Checks/unchecks all visible rows; updates selection count
- [ ] 2.3 Add `selectedIds: Set<string>` state to `FutureDebtView`
  - `useState` for ephemeral selection; no persistence needed
- [ ] 2.4 Compute "Eliminar N filas" button label from `selectedIds.size`
  - Format: "Eliminar N filas" where N = count; hidden when count = 0

## 3. Frontend — Delete Button & Inline Confirmation

- [ ] 3.1 Add `DeleteRowsButton` component
  - Renders "Eliminar N filas" button in section header next to horizon/refresh controls
- [ ] 3.2 Implement inline confirmation state inside `DeleteRowsButton`
  - State: `idle | confirming`; idle shows "Eliminar N filas"; confirming shows "Confirmar" / "Cancelar" inline (no modal)
  - Click outside or Cancel → back to `idle`; Confirm → trigger deletion
- [ ] 3.3 Wire confirm action to TanStack Query mutation
  - N parallel `mutationFn: () => fetch(DELETE /api/future-debt/rows/:id)` calls for N selected IDs
  - Uses `Promise.all` to wait for all deletions
- [ ] 3.4 Optimistic UI update on mutation success
  - Invalidate/query invalidation for the future debt list; deleted rows disappear immediately
  - Clear `selectedIds` after successful deletion; reset button to `idle` state

## 4. Edge Cases

- [ ] 4.1 Handle 404 from DELETE endpoint
  - If a row was already deleted (concurrent edit), remove its ID from `selectedIds` silently; log warning
- [ ] 4.2 Handle network failure on one or more of N parallel requests
  - Show error toast; keep `selectedIds` intact so user can retry
- [ ] 4.3 Ensure pending rows (`missing_card_reference` state) are selectable
  - No filtering applied to selection — all rows in the query result are eligible

## 5. Verification

- [ ] 5.1 Run targeted tests for row deletion
  - Backend: test `DELETE /api/future-debt/rows/:id` for regular row, manual row (cascade), and non-existent ID
  - Frontend: verify checkbox selection, select-all, inline confirmation flow, and optimistic update
- [ ] 5.2 Run full test suite
  - All existing tests pass; new BDD scenarios from FEAT-029 executable against live system
- [ ] 5.3 Manual smoke test
  - Select 3 rows → click "Eliminar 3 filas" → confirm → rows disappear from list; totals recalculate correctly
