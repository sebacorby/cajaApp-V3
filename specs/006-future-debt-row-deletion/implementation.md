# 006-future-debt-row-deletion — Implementation Plan

> **For the Developer agent:** Execute this plan task by task using the `IADEV-test-driven-development` skill. Track each `- [ ]` checkbox; only check it when the verification command in that step passes.

## Goal

Allow the user to select one or more rows in the Future Debt view and delete them with an inline confirmation (no modal). For `isManual = true` rows, both the `CardInstallmentProjection` and its related `ManualCardPurchase` are deleted in a single database transaction.

## Architecture summary

- **Backend:** Fastify REST API; `future.service.ts` gains a `deleteProjectionRow(id)` method; the existing read-only service grows one write-capable method behind the existing module boundary.
- **Frontend:** Next.js + TanStack Query; the `FutureDebtView` gains ephemeral checkbox-selection state (`useState<Set<string>>`); a new `DeleteRowsButton` component renders inline in the section header.
- **Persistence:** Prisma ORM with SQLite; cascade delete for manual rows handled in a `prisma.$transaction` (no new FK constraints needed for this implementation path).
- **API contract:** `DELETE /api/future-debt/rows/:id` → `204 No Content` on success; `404 Not Found` if the projection does not exist; `400 Bad Request` if the ID is not valid CUID.

## Tech stack

- Language / runtime: TypeScript 5 (backend) / TypeScript 5 (frontend)
- Backend: Node.js 24 + Fastify 5
- Frontend: Next.js 16 + React 19 + TanStack Query 5
- ORM: Prisma 6 (backend) / Prisma 6 (frontend)
- Database: SQLite (`file:./dev.db`)
- Testing: Vitest 3 (backend unit) / Playwright 1 (frontend E2E)
- UI primitives: shadcn/ui + Radix UI (Checkbox, Button)
- Validation: Zod (shared between Fastify route schemas and frontend API client)

## Scope

**In scope (this plan delivers):**
- `DELETE /api/future-debt/rows/:id` endpoint with cascade delete for manual rows
- Frontend checkbox column in `FutureDebtView` (one checkbox per `FutureDebtRow` and `FutureDebtPendingRow`)
- Frontend select-all checkbox in the month/card list header
- `selectedIds: Set<string>` ephemeral state in `FutureDebtView`
- "Eliminar N filas" button rendered in the section header, inline with horizon/refresh controls
- Inline confirmation state (`idle | confirming`) on the button — no modal dialog
- N parallel `DELETE` fetch calls via `Promise.all` for N selected rows
- TanStack Query cache invalidation after deletion; `selectedIds` cleared on success
- Error handling: 404 silently removes ID from selection; network failure shows toast and keeps selection

**Out of scope (do NOT touch in this plan):**
- Bulk DELETE endpoint accepting an array of IDs (per-row is the chosen design)
- Undo / trash mechanism
- Modifying the future debt recalculation logic (totals recompute as a side effect of standard projection logic)
- Any changes to the `GET /api/future-debt` response shape
- Changes to card statement deletion (FEAT-028 surface)

**Minimalism guardrail:** the Developer must reject any addition not listed under "In scope". If the spec implies a real gap, escalate via `<questions>` instead of expanding scope silently.

## Package & dependency recommendations

No dependency changes. All required capabilities (checkbox UI, inline confirmation, HTTP DELETE, Prisma transaction, Zod validation) are served by existing packages.

| Action | Package | Why this package | Why not the alternative | Confirmation needed? |
|---|---|---|---|---|
| keep | fastify, prisma, next, tanstack-query, radix-ui, zod | Already cover all needs | — | no |

## Source artifacts

- PRD: `specs/006-future-debt-row-deletion/PRD.md`
- Behavior specification: `specs/006-future-debt-row-deletion/gherkin.md` + `specs/006-future-debt-row-deletion/functional/features/FEAT-029-future-debt-row-deletion.feature` _(consumed via `IADEV-bdd-implementation`)_
- Discovery: `specs/006-future-debt-row-deletion/functional/discovery.md`
- Proposal: `specs/006-future-debt-row-deletion/code/proposal.md`
- Specs: `specs/006-future-debt-row-deletion/code/specs.md`
- Design: `specs/006-future-debt-row-deletion/code/design.md`
- Tasks (high level): `specs/006-future-debt-row-deletion/test/tasks.md`

## Feature -> task index

| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-029 | Bulk delete future debt rows | Task 1, Task 2, Task 3, Task 4 |

---

## File Structure

```
workspace/backend/src/modules/future/
  future.service.ts          — add deleteProjectionRow(id)
  future.controller.ts       — add DELETE handler
  future.routes.ts           — register DELETE /rows/:id
  future.schemas.ts          — add Zod schema for the CUID path param (reuse or extend)

workspace/backend/src/modules/future/__tests__/
  api.test.ts                — add tests for DELETE endpoint

workspace/frontend/src/
  components/finance/transactions/
    FutureDebtView.tsx        — add checkbox column, select-all, DeleteRowsButton
  lib/finance/
    future-debt-api.ts        — add deleteFutureDebtRow(id): Promise<void>
```

---

## Task 1: Backend — DELETE /api/future-debt/rows/:id

**Files:**
- `workspace/backend/src/modules/future/future.service.ts` — add `deleteProjectionRow(id: string): Promise<void>`
- `workspace/backend/src/modules/future/future.controller.ts` — add `delete` route handler
- `workspace/backend/src/modules/future/future.routes.ts` — register `DELETE /rows/:id`
- `workspace/backend/src/modules/future/__tests__/api.test.ts` — add integration tests

**Skills the Developer should look for:** anything for Fastify route/controller patterns, anything for Prisma transactions.

### Step 1.1: Add failing tests for DELETE /api/future-debt/rows/:id

**Files to create/modify:** `workspace/backend/src/modules/future/__tests__/api.test.ts`

Add the following `describe("DELETE /api/future-debt/rows/:id")` block inside the existing test file, after the existing GET tests.

**Test: deletes a regular (non-manual) projection row**
- Setup: fixture has a `CardInstallmentProjection` with `isManual = false`
- Act: `DELETE /api/future-debt/rows/:id` with that projection's ID
- Assert: `204 No Content`; subsequent GET for future-debt no longer includes that row

**Test: deletes a manual projection row and cascades to ManualCardPurchase**
- Setup: fixture has a `CardInstallmentProjection` with `isManual = true` AND a `ManualCardPurchase` with `id = projection.rowId`
- Act: `DELETE /api/future-debt/rows/:id` with that projection's ID
- Assert: `204 No Content`; both the projection and the ManualCardPurchase are gone from the DB

**Test: returns 404 for non-existent ID**
- Act: `DELETE /api/future-debt/rows/:id` with a CUID that does not exist
- Assert: `404 Not Found`

**Test: returns 400 for malformed ID (not a CUID)**
- Act: `DELETE /api/future-debt/rows/:id` with `id = "not-a-cuid"`
- Assert: `400 Bad Request`

Run: `cd workspace/backend && npm run test -- --run src/modules/future/__tests__/api.test.ts`
Expected: the 4 new tests fail (route not registered, method not found — 404 from Fastify).

---

### Step 1.2: Implement deleteProjectionRow in future.service.ts

**File:** `workspace/backend/src/modules/future/future.service.ts`

Add the following method to the `FutureDebtService` class:

```typescript
async deleteProjectionRow(id: string): Promise<void> {
  // 1. Load the projection by id; throw NotFoundError if not found
  // 2. Prisma transaction:
  //   - If isManual: find ManualCardPurchase where id = projection.rowId, delete it
  //   - Delete CardInstallmentProjection by id
  // 3. Return void (caller sends 204)
}
```

**Key contracts:**
- Throws `AppError` with code `"NOT_FOUND"` and status `404` if the projection does not exist.
- Uses `prisma.$transaction` to atomically delete both records for manual rows.
- The cascade path for manual rows: `prisma.manualCardPurchase.deleteMany({ where: { id: projection.rowId } })` before deleting the projection.
- No return value — caller is responsible for HTTP status.

**Edge cases:**
- If `isManual = true` but the `ManualCardPurchase` with `id = projection.rowId` is already gone (orphan), the projection delete should still succeed (delete the projection, log a warning).
- Invalid CUID format is handled in the controller (Step 1.4), not here.

Run the tests from Step 1.1.
Expected: tests still fail because the route is not registered.

---

### Step 1.3: Add DELETE route and handler

**Files:**
- `workspace/backend/src/modules/future/future.controller.ts`
- `workspace/backend/src/modules/future/future.routes.ts`

**In `future.controller.ts`:** Add a new route inside the `futureController` plugin, after the existing `app.get("/")`:

```typescript
app.delete("/rows/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  // CUID validation: if (!isCUID(id)) throw AppError("INVALID_ID", "...", 400)
  await service.deleteProjectionRow(id);
  return reply.status(204).send();
});
```

**In `future.routes.ts`:** No changes needed — the controller plugin already accepts the service via DI.

**Key contracts:**
- Path param `id` is validated as CUID format; returns `400 Bad Request` if invalid.
- Calls `service.deleteProjectionRow(id)`.
- Returns `204 No Content` with no body on success.
- Propagates `AppError` from service (404 Not Found → forwarded as 404 to client).

Run: `cd workspace/backend && npm run test -- --run src/modules/future/__tests__/api.test.ts`
Expected: all 4 tests pass.

---

### Step 1.4: Commit

```bash
cd workspace/backend
git add src/modules/future/future.service.ts src/modules/future/future.controller.ts src/modules/future/__tests__/api.test.ts
git commit -m "feat(future): add DELETE /api/future-debt/rows/:id with cascade delete for manual rows"
```

---

## Task 2: Frontend API Client — add delete call

**Files:**
- `workspace/frontend/src/lib/finance/future-debt-api.ts` — add `deleteFutureDebtRow(id): Promise<void>`

**Skills the Developer should look for:** anything for Zod validation, anything for HTTP client patterns.

### Step 2.1: Add deleteFutureDebtRow to future-debt-api.ts

**File:** `workspace/frontend/src/lib/finance/future-debt-api.ts`

Add at the bottom of the file, after the existing `fetchFutureDebt` function:

```typescript
export async function deleteFutureDebtRow(id: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/future-debt/rows/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (response.status === 204) return;
  if (!response.ok) throw await parseErrorResponse(response);
  // For any other 2xx (should not happen per contract), return undefined
}
```

**Assertion sketch:**
- Input: valid CUID string
- `fetch` called with correct URL and `DELETE` method
- 204 response → returns `undefined` (no JSON body needed)
- 404 response → throws `FutureDebtApiError` with status 404
- Network error → throws (fetch propagates)
- Other error → throws `FutureDebtApiError`

Run: `cd workspace/frontend && npx tsc --noEmit` (verify typecheck passes)
Expected: exit 0, 0 errors.

---

### Step 2.2: Commit

```bash
cd workspace/frontend
git add src/lib/finance/future-debt-api.ts
git commit -m "feat(future-debt): add deleteFutureDebtRow API client for DELETE /api/future-debt/rows/:id"
```

---

## Task 3: Frontend — Checkbox UI (select rows, select all)

**Files:**
- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx` — add checkbox column, select-all, selection state

**Skills the Developer should look for:** anything for React state management with useState, anything for shadcn/ui Checkbox component.

### Step 3.1: Write failing tests for checkbox selection

**Note for the Developer:** No dedicated test file for the checkbox UI exists yet. Write the assertions as inline comments in the component file (as a contract sketch), or create `workspace/frontend/src/components/finance/transactions/__tests__/FutureDebtView.selection.test.tsx` if the project has a test setup for components. The key behaviors to verify at the component level:

**Test sketch — individual row selection:**
- Render `FutureDebtView` with a known dataset
- Simulate clicking a checkbox on a specific row
- Assert: `selectedIds` state includes that row's ID
- Assert: button "Eliminar N filas" appears with count 1

**Test sketch — select all:**
- Render `FutureDebtView` with N rows
- Simulate clicking the select-all checkbox
- Assert: `selectedIds` state includes all N row IDs

**Test sketch — pending rows are selectable:**
- Render `FutureDebtView` with pending rows
- Click checkbox on a pending row
- Assert: that row's ID is in `selectedIds`

For now, implement the feature and use manual verification (Playwright E2E covers this scenario).

---

### Step 3.2: Add selectedIds state and select-all to FutureDebtView

**File:** `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`

**Changes to `FutureDebtView` function component:**
1. Add `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());`
2. Add `const allRowIds = useMemo(() => [...getAllRowIds(data)], [data])` helper to collect every selectable row ID (confirmed rows from `data.months[*].cards[*].rows[*].id` AND pending rows from `data.pendientes.rows[*].id`).
3. Add `const selectedCount = selectedIds.size`.

**Changes to `RowDisplay` (confirmed rows):**
- Add a `Checkbox` as the first child of the row grid, before the description.
- Props: `checked={selectedIds.has(row.id)}`, `onCheckedChange={() => { onToggleRow(row.id) }}`.
- New prop: `onToggle: (id: string) => void` passed from parent.

**Changes to `CardGroup`:**
- Add a select-all checkbox in the card header row, above or alongside the card label.
- `checked={areAllSelected}`, `onCheckedChange={() => onToggleAll(card.rows.map(r => r.id))}`.
- New prop: `selectedIds`, `onToggle`, `onToggleAll` passed from parent.

**Changes to `MonthCard`:**
- Pass `selectedIds`, `onToggle`, `onToggleAll` down to `CardGroup`.

**Changes to `PendingRowDisplay`:**
- Same pattern as `RowDisplay`: first child is a `Checkbox`, `selectedIds.has(row.id)`, `onCheckedChange` calls `onToggle`.
- New prop: `onToggle: (id: string) => void`.

**New helper functions in `FutureDebtView`:**
```typescript
function toggleRow(id: string) {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function toggleAll(ids: string[]) {
  const allSelected = ids.every(id => selectedIds.has(id));
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (allSelected) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    return next;
  });
}
```

Run: `cd workspace/frontend && npx tsc --noEmit`
Expected: exit 0, 0 errors. If type errors, fix them before proceeding.

---

### Step 3.3: Commit

```bash
cd workspace/frontend
git add src/components/finance/transactions/FutureDebtView.tsx
git commit -m "feat(future-debt): add checkbox column and select-all to FutureDebtView"
```

---

## Task 4: Frontend — DeleteRowsButton with inline confirmation

**Files:**
- `workspace/frontend/src/components/finance/transactions/DeleteRowsButton.tsx` — new file
- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx` — wire the button into the section header

**Skills the Developer should look for:** anything for TanStack Query mutations, anything for inline confirmation UX patterns.

### Step 4.1: Write failing tests for DeleteRowsButton

**Test sketch — idle state:**
- Render with `selectedCount = 3`
- Assert: button shows "Eliminar 3 filas"
- Assert: no confirmation UI visible

**Test sketch — confirming state:**
- Click "Eliminar 3 filas"
- Assert: button shows "Confirmar" and "Cancelar" inline
- Assert: no modal overlay

**Test sketch — cancel:**
- Click "Eliminar 3 filas" → confirm state → click "Cancelar"
- Assert: back to idle, selection preserved

**Test sketch — confirm triggers deletion:**
- Render with 2 selected IDs
- Click "Eliminar 2 filas" → confirm state → click "Confirmar"
- Assert: `deleteFutureDebtRow` called twice (once per ID) in parallel

**Test sketch — 404 handled:**
- One of the N parallel requests returns 404
- Assert: no error thrown to user (404 silently acknowledged); the other deletes proceed

### Step 4.2: Implement DeleteRowsButton component

**File:** `workspace/frontend/src/components/finance/transactions/DeleteRowsButton.tsx` (new file)

```typescript
"use client";

import { useState, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteFutureDebtRow } from "@/lib/finance/future-debt-api";

type ConfirmState = "idle" | "confirming";

interface DeleteRowsButtonProps {
  selectedIds: Set<string>;
  onDeleted: () => void;   // called after all deletions succeed — invalidates query, clears selection
  onError?: (message: string) => void;  // for toast notifications
}
```

**Internal state:** `const [confirmState, setConfirmState] = useState<ConfirmState>("idle");`

**Render logic:**
```
if (selectedIds.size === 0) → return null (hidden when nothing selected)

if (confirmState === "idle"):
  → <Button variant="destructive" onClick={() => setConfirmState("confirming")}>
      <Trash2 className="size-4" />
      Eliminar {selectedIds.size} {selectedIds.size === 1 ? "fila" : "filas"}
    </Button>

if (confirmState === "confirming":
  → <div className="flex items-center gap-2">
      <span className="text-sm">¿Eliminar {selectedIds.size} {selectedIds.size === 1 ? "fila" : "filas"}?</span>
      <Button variant="destructive" size="sm" onClick={handleConfirm}>
        Confirmar
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirmState("idle")}>
        Cancelar
      </Button>
    </div>
```

**handleConfirm:**
```typescript
const handleConfirm = async () => {
  const ids = Array.from(selectedIds);
  try {
    await Promise.all(ids.map(id => deleteFutureDebtRow(id)));
    setConfirmState("idle");
    onDeleted();
  } catch (err) {
    setConfirmState("idle");
    // If 404, treat as success (row already gone)
    if (err instanceof FutureDebtApiError && err.status === 404) {
      onDeleted();  // invalidate anyway
      return;
    }
    onError?.(err instanceof Error ? err.message : "Error al eliminar");
  }
};
```

**Edge cases:**
- Click outside the confirming button area → should dismiss confirmation (handled by parent if needed — out of scope for this component, simple button is fine).
- 404 from one of N parallel requests → silently acknowledge, still call `onDeleted()` to refresh.
- Network failure → show error via `onError`, keep selection intact.

**Assertion sketch:**
- `selectedIds.size === 0` → renders nothing (`null`)
- `selectedIds.size > 0` + `idle` → "Eliminar N filas" button
- Click → `confirming` state → inline "Confirmar" + "Cancelar"
- Cancel → back to `idle`
- Confirm with 2 selected → `deleteFutureDebtRow` called twice with correct IDs
- On 404 from one call → no error propagates, `onDeleted` still called

Run: `cd workspace/frontend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

---

### Step 4.3: Wire DeleteRowsButton into FutureDebtView section header

**File:** `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`

In the section header (the `div` containing `h2`, description, and the right-side controls), after the refresh `Button`:

```tsx
{selectedCount > 0 && (
  <DeleteRowsButton
    selectedIds={selectedIds}
    onDeleted={() => {
      setSelectedIds(new Set());
      void futureDebtQuery.refetch();
    }}
    onError={(msg) => {
      // TODO: wire to toast (use toast hook from shadcn if available)
      console.error(msg);
    }}
  />
)}
```

Also pass `selectedIds`, `onToggle`, and `onToggleAll` down to `MonthCard`, `CardGroup`, `RowDisplay`, and `PendingRowDisplay`.

Run: `cd workspace/frontend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

---

### Step 4.4: Commit

```bash
cd workspace/frontend
git add src/components/finance/transactions/DeleteRowsButton.tsx
git add src/components/finance/transactions/FutureDebtView.tsx
git commit -m "feat(future-debt): add DeleteRowsButton with inline confirmation"
```

---

## Task 5: Frontend — TanStack Query invalidation and optimistic update

**Files:**
- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx` — wire `onDeleted` to `queryClient.invalidateQueries`

**Skills the Developer should look for:** anything for TanStack Query cache invalidation, anything for React Query hooks.

### Step 5.1: Wire TanStack Query invalidation

**File:** `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`

Import `useQueryClient` from `@tanstack/react-query`.

Inside `FutureDebtView`:
```typescript
const queryClient = useQueryClient();
```

Update the `onDeleted` handler in `DeleteRowsButton`:
```typescript
onDeleted={() => {
  setSelectedIds(new Set());
  void queryClient.invalidateQueries({ queryKey: ["future-debt"] });
}}
```

**Assertion sketch:**
- After `handleConfirm` in `DeleteRowsButton` resolves successfully:
  - `queryClient.invalidateQueries({ queryKey: ["future-debt"] })` is called
  - `selectedIds` is reset to empty `Set`
  - The `FutureDebtView` re-fetches and the deleted rows disappear

Run: `cd workspace/frontend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

---

### Step 5.2: Commit

```bash
cd workspace/frontend
git add src/components/finance/transactions/FutureDebtView.tsx
git commit -m "feat(future-debt): invalidate future-debt query after row deletion"
```

---

## Task 6: Verification (run by the Developer)

### Step 6.1: Linter

Run: `cd workspace/backend && npm run lint 2>&1 || true` (and `cd workspace/frontend && npm run lint 2>&1 || true`)
Expected: exit 0, 0 errors. If lint errors exist, fix them before proceeding.

### Step 6.2: Formatter check

Run: `cd workspace/backend && npx prettier --check src/modules/future/ src/modules/future/__tests__/` and `cd workspace/frontend && npx prettier --check src/components/finance/transactions/FutureDebtView.tsx src/components/finance/transactions/DeleteRowsButton.tsx src/lib/finance/future-debt-api.ts`
Expected: exit 0 (no files would be reformatted).

### Step 6.3: Type checker

Run: `cd workspace/backend && npx tsc --noEmit` and `cd workspace/frontend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

### Step 6.4: Backend unit tests

Run: `cd workspace/backend && npm run test -- --run src/modules/future/__tests__/api.test.ts`
Expected: 0 failures.

### Step 6.5: Full backend test suite

Run: `cd workspace/backend && npm run test -- --run`
Expected: 0 failures.

### Step 6.6: Confirm scenario coverage (per `IADEV-bdd-implementation`)

Create `specs/006-future-debt-row-deletion/implementation_report.md` and document the test coverage mapping:

| Scenario (FEAT-029) | Test file | Layer |
|---|---|---|
| Each row displays a checkbox | Playwright E2E (manual) | E2E |
| User can select an individual row | Playwright E2E (manual) | E2E |
| User can select all rows at once | Playwright E2E (manual) | E2E |
| User clicks delete and sees inline confirmation | Playwright E2E (manual) | E2E |
| User cancels the deletion | Playwright E2E (manual) | E2E |
| User confirms and rows are deleted from DB | `api.test.ts` | Integration |
| Manual rows delete both projection and ManualCardPurchase | `api.test.ts` | Integration |
| After deletion, rows disappear from UI immediately | Playwright E2E (manual) | E2E |

Note: the E2E scenarios require a running server (backend + frontend). These are listed in the Tester handoff below.

---

## Task 7: Tester handoff (run by the Tester, not the Developer)

The Developer lists the following gates in `specs/006-future-debt-row-deletion/implementation_report.md` under `## Test run evidence -> Deferred to the Tester`. The Tester runs them in `IADEV-validating-implementation` Pass 2.

| Gate | Configured? | Command the Tester should run |
|---|---|---|
| Integration tests (backend) | yes | `cd workspace/backend && npm run test -- --run src/modules/future/__tests__/` |
| E2E tests — FEAT-029 | yes | `cd workspace/frontend && npx playwright test FEAT-029.spec.ts` |
| Build / packaging | yes | `cd workspace/frontend && npm run build` |
| Backend smoke | yes | `cd workspace/backend && npm run test -- --run tests/smoke/` |
| Typecheck (both) | yes (already run by Developer in Task 6) | `cd workspace/backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit` |

---

## Feature scenarios (FEAT-029) — BDD layer assignment

Per `IADEV-bdd-implementation`, assign each Gherkin scenario to the right test layer:

| Scenario | Layer | Test artifact |
|---|---|---|
| Each row displays a checkbox | E2E (UI verification) | Playwright spec |
| User can select an individual row | E2E | Playwright spec |
| User can select all rows at once | E2E | Playwright spec |
| User clicks delete and sees inline confirmation | E2E | Playwright spec |
| User cancels the deletion | E2E | Playwright spec |
| User confirms and rows are deleted from the database | Integration | `api.test.ts` |
| Manual rows delete both projection and ManualCardPurchase | Integration | `api.test.ts` |
| After deletion, rows disappear from the UI immediately | E2E | Playwright spec |
