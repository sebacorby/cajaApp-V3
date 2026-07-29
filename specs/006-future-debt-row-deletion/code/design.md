# Design: 006-future-debt-row-deletion

## Stack

| Aspect | Choice | Rationale |
|---|---|---|
| Backend runtime | Node.js / Fastify | Already established in project |
| Database ORM | Prisma | Already established in project |
| Frontend framework | Next.js | Already established in project |
| UI component library | Radix UI | Already established in project |
| Data fetching / cache | TanStack Query | Already established in project |
| State management | TanStack Query cache + React useState for selection | Selection state is ephemeral UI state; no Redux/Zustand needed |

## Dependencies

No dependency changes. All required capabilities (checkbox UI, inline confirmation, HTTP DELETE, Prisma transaction) are served by existing packages.

| Package | Action | Rationale |
|---|---|---|
| — | keep | No new packages required; existing Fastify/Prisma/Next.js/Radix/TanStack Query stack covers all needs |

## Data Model

No schema changes. `CardInstallmentProjection` and `ManualCardPurchase` models already exist. The feature operates on existing records:

```prisma
// CardInstallmentProjection — already has isManual flag
model CardInstallmentProjection {
  id              String   @id @default(cuid())
  isManual        Boolean  @default(false)
  manualPurchase  ManualCardPurchase?
  // ... other existing fields
}

// ManualCardPurchase — already has relation to CardInstallmentProjection
model ManualCardPurchase {
  id             String   @id @default(cuid())
  projectionId   String   @unique
  projection     CardInstallmentProjection @relation(fields: [projectionId], references: [id])
  // ... other existing fields
}
```

## Interface

### DELETE /api/future-debt/rows/:id

Deletes a single `CardInstallmentProjection` row by ID. For `isManual = true` rows, also deletes the related `ManualCardPurchase` in the same transaction.

| | |
|---|---|
| **Method** | DELETE |
| **Path** | `/api/future-debt/rows/:id` |
| **Auth** | Same as existing future-debt endpoints |
| **Path params** | `id: string` — the `CardInstallmentProjection.id` |
| **Success response** | `204 No Content` |
| **Error responses** | `404 Not Found` — projection does not exist; `401 Unauthorized` — missing/invalid auth |

**Request:** No body.

**Response body:** None.

## Architecture Decisions

### Per-row DELETE (not bulk endpoint)

| | |
|---|---|
| **Choice** | `DELETE /api/future-debt/rows/:id` — one endpoint, one row per request; frontend fires N parallel requests for N selected rows |
| **Alternatives** | Single `DELETE /api/future-debt/rows` accepting `ids: string[]` in body |
| **Rationale** | Simpler backend semantics (one ID to validate, no array processing), natural fit for TanStack Query invalidation (one invalidate per request), easier to retry on partial failure, no need to reason about partial bulk delete outcomes. Trade-off: N HTTP round-trips for large selections — accepted given no stated SLA constraint and Q3 decision (no cap). |

### Button location: section header

| | |
|---|---|
| **Choice** | "Eliminar N filas" button lives inline in the section header, adjacent to horizon/refresh controls |
| **Alternatives** | Floating action bar at bottom, toolbar outside header |
| **Rationale** | Keeps the action in the user's eye-line while scanning the list; avoids covering content with a fixed bottom bar; natural grouping with other list controls. |

## File Structure

```
backend/
  modules/future/
    future.service.ts          — add deleteRow(id) using Prisma transaction
    future.routes.ts          — add DELETE /api/future-debt/rows/:id route
    future.controller.ts      — add deleteRow handler

frontend/
  components/
    future-debt/
      FutureDebtView.tsx      — add checkboxes, select-all, "Eliminar N filas" button with inline confirmation
      FutureDebtRow.tsx        — add checkbox to each row
      DeleteRowsButton.tsx     — "Eliminar N filas" with inline confirm state
  hooks/
    useFutureDebtMutation.ts  — TanStack Query mutation for DELETE /api/future-debt/rows/:id
```

## Validation Rules

| Entity | Field | Rule |
|---|---|---|
| `CardInstallmentProjection` | `id` | Must exist at call time; returns 404 if not found |
| Request path param | `id` | Must be a valid CUID format; returns 400 if malformed |
