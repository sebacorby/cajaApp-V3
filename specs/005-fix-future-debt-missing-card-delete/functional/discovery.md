# Discovery — 005-fix-future-debt-missing-card-delete

## Change & PRD

- **Spec folder:** `specs/005-fix-future-debt-missing-card-delete`
- **PRD:** `PRD.md`
- **Type:** Bug fix (functional)

---

## Summary

Bug 1: When a card statement draft is accepted, `CardInstallmentProjection` records are created BEFORE the `CardStatementRow` records are inserted. The projection's `rowId` stores the preview row's `id` (from AI extraction). However, when rows are inserted into the database, they receive new UUIDs via `@default(uuid())`. At future-debt query time, `normalizeProjection()` tries `rows.get(projection.rowId)` but the map is keyed by the actual persisted row UUIDs — not the preview IDs. The join fails, `cardLast4` is null, and the `missing_card_reference` diagnostic fires.

Bug 2: There is no `DELETE /statements/:statementId` endpoint in `cards.controller.ts`. Only drafts can be deleted. The Prisma schema has proper `onDelete: Cascade` relations, but the API surface does not expose statement deletion.

---

## Root Cause Analysis

### Bug 1 — Step-by-step trace

**Step 1: Projections are created with preview row IDs**

In `cards.service.ts acceptDraft()` (lines 855–869):

```typescript
await tx.cardInstallmentProjection.createMany({
  data: projections.map((p) => ({
    statementId: statement.id,
    rowId: p.rowId,          // ← p.rowId is from the preview (preview row's id)
    monthKey: p.monthKey,
    // ...
  })),
});
```

`p.rowId` comes from `installmentProjectionService.calculateProjections()`, which uses `row.id` from the preview rows.

**Step 2: Rows are inserted AFTER projections, with new UUIDs**

Lines 827–846 insert `CardStatementRow` records:

```typescript
rows: {
  create: preview.rows.map((r) => ({
    sectionKey: r.sectionId,
    groupKey: r.id,       // ← r.id is the preview row's id (used as groupKey, not row.id)
    // ...
  })),
},
```

Each `CardStatementRow` has `@id @default(uuid())` in the Prisma schema — a fresh UUID is generated at insert time.

**Step 3: The row→projection join fails at query time**

In `future.service.ts normalizeProjection()` (line 122):

```typescript
const row = projection.isManual ? undefined : rows.get(projection.rowId);
```

`rows` is a `Map<string, RawCardStatementRow>` keyed by `row.id` — the actual persisted UUIDs.

`projection.rowId` is the preview row's id (e.g., 'g-1' or a preview UUID), which does not exist in the map.

Result: `row` is `undefined`, `group` is `undefined`, `cardLast4` is `null`, and the `missing_card_reference` diagnostic fires.

**The core issue:** Projections are created with preview row IDs, but those IDs are not updated after the actual rows are inserted with database-generated UUIDs.

**Step 4: The spec 004 fix (groupKey) does not solve this**

Spec 004 changed `groupKey: r.groupId` → `groupKey: r.id` (line 830). This fixes the group key value stored on the row itself, but it does NOT fix the `projection.rowId` mismatch. Both bugs are independent.

**The fix:** After inserting `CardStatementRow` records, UPDATE the `CardInstallmentProjection.rowId` values to match the actual persisted row IDs. The `statementId` is known, so we can do a correlated update or a second query to get the inserted row IDs and update projections accordingly.

---

### Bug 2 — Step-by-step trace

**Step 1: No delete endpoint for statements**

`cards.controller.ts` (238 lines total) only exposes:
- `DELETE /drafts/:draftId` — for drafts (line 156)
- No `DELETE /statements/:statementId` for accepted statements

**Step 2: Prisma cascade is configured but unused**

In `schema.prisma`:
- `CardStatement` → `sections`, `groups`, `rows`, `projections`, `manualPurchases` all have `onDelete: Cascade`
- If a `DELETE` were issued for a `CardStatement`, all children would be cascade-deleted

**Step 3: Frontend has no delete action for statements**

No delete button exists in the UI for accepted card statements. The `FutureDebtView` shows statements but does not offer deletion.

**The fix:** Add `DELETE /statements/:statementId` endpoint in `cards.controller.ts` and corresponding `cardsService.deleteStatement()` method. Add a delete button/menu in the frontend statement list/detail view.

---

## Features

| FEAT-ID | Name | Type |
|---------|------|------|
| FEAT-027 | Fix projection rowId reference after statement acceptance | functional |
| FEAT-028 | Allow deleting accepted card statements | functional |

---

## Resolved Decisions

**Bug 1:**
- **Root cause confirmed:** Projection `rowId` references the preview row's id, but `CardStatementRow.id` is a database-generated UUID. The join in `normalizeProjection()` always fails for newly accepted statements.
- **Affected code path:** `cards.service.ts acceptDraft()` creates projections before rows and never updates `rowId` to the actual persisted IDs.
- **Fix approach:** After inserting rows, query the inserted row IDs (by statementId + matching on the non-UUID attributes like `displayOrder` and `sectionKey`), then update `CardInstallmentProjection.rowId` to the actual UUIDs. Alternatively, pass the actual row IDs into the projection create call after rows are inserted.
- **Alternative considered (rejected):** Denormalizing `cardLast4` directly onto `CardInstallmentProjection` — more invasive schema change, when the real issue is a temporal ordering bug in acceptance.

**Bug 2:**
- **Root cause confirmed:** No API endpoint and no UI affordance for deleting accepted `CardStatement` records.
- **Affected code path:** `cards.controller.ts` — missing `DELETE /statements/:statementId` route; `cards.service.ts` — missing `deleteStatement()` method.
- **Fix approach:** Add `DELETE /statements/:statementId` endpoint that calls a new `cardsService.deleteStatement(statementId)` which deletes the `CardStatement` record (cascade handles children). Add delete button to the frontend statement list.

---

## Open Questions for Planning

**Bug 1:**
1. What is the safest way to correlate inserted rows with their preview counterparts for the `rowId` update? Options: (a) use `displayOrder + sectionKey + groupKey` as a composite key, (b) capture the inserted IDs in a lookup table during the transaction, (c) re-query rows after insert and update projections.
2. Should a data migration be provided to fix existing accepted statements whose projections have stale `rowId` values?

**Bug 2:**
1. Should deletion require user confirmation? (Likely yes — destructive action)
2. Should deleted statements be soft-deleted (archived) rather than hard-deleted, for audit purposes?
3. Should the delete action also clean up any `CardInstallmentProjection` records that reference the deleted statement, even with cascade?

---

## Collision Check

No collisions detected against the active feature set. These are bug fixes addressing broken/incomplete behavior in FEAT-023 (future debt traceability) and FEAT-001 (card statement import). The fixes do not change expected behavior — they restore correct behavior and add missing functionality.

---

## Codebase Context

- **Tech stack:** TypeScript, Fastify backend, Next.js frontend, Prisma ORM, SQLite
- **Backend modules touched:**
  - `modules/cards/cards.service.ts` — `acceptDraft()` creates projections with stale `rowId`; needs `deleteStatement()` method
  - `modules/cards/cards.controller.ts` — missing `DELETE /statements/:statementId` route
  - `modules/future/future.service.ts` — `normalizeProjection()` performs the join that fails due to stale `rowId`
  - `modules/projections/installment-projection.service.ts` — produces projections with preview row IDs
- **Prisma models:**
  - `CardInstallmentProjection.rowId` — stores preview row id, not persisted row id
  - `CardStatementRow.id` — `@id @default(uuid())` — database-generated UUID
  - `CardStatement` and all children — `onDelete: Cascade` configured but API not exposed
- **Frontend:** Statement list/detail views (`FutureDebtView.tsx`, card statement pages) — no delete affordance for accepted statements
