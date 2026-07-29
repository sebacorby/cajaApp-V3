# Design: Fix Future Debt Missing Card Reference + Allow Deleting Erroneous Records

## Stack

| Aspect | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Same as existing codebase |
| Backend runtime | Node.js (Fastify) | Same as existing backend |
| Database | SQLite via Prisma ORM | Same as existing stack |
| Frontend | Next.js (React, Tailwind, Radix UI) | Same as existing frontend |
| Testing | Vitest | Same as existing backend test runner |
| No new dependencies | — | Both fixes use existing packages |

## Dependencies

No dependency changes. Both fixes use existing packages (Prisma, Fastify, Radix UI).

---

## Data Model

No schema changes. The fix uses the existing Prisma models.

**`CardInstallmentProjection`** (existing):
```
rowId: String     // must store actual CardStatementRow.id (UUID), not preview row id
```

**`CardStatement`** (existing):
```
id: String @id @default(uuid())   // PK
status: String                     // "accepted" | "archived" | "superseded"
```

**Cascade relations** (existing, confirmed correct):
```
CardStatement → sections      (onDelete: Cascade)
CardStatement → groups        (onDelete: Cascade)
CardStatement → rows           (onDelete: Cascade)
CardStatement → projections    (onDelete: Cascade)
CardStatement → manualPurchases(onDelete: Cascade)
```

---

## Interface

### Bug 1 — No new endpoint; fix is in `acceptDraft()` transaction

The `POST /drafts/:draftId/accept` endpoint (existing) is modified internally. No API contract change.

### Bug 2 — New endpoint

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| `DELETE` | `/statements/:statementId` | — | path param: `statementId` (UUID) | `{ success: true, deletedId: string }` |

**Error responses:**
- `404` — statement not found
- `400` — attempting to delete a draft statement (must use `DELETE /drafts/:draftId` instead)

---

## Architecture Decisions

### Bug 1 — How to correlate preview row IDs with persisted row IDs

| | |
|---|---|
| **Choice** | Query persisted rows after insert; build a composite-key map `(displayOrder, sectionKey, groupKey) → persisted row.id`; update projections in the same transaction |
| **Alternatives considered** | (a) Add a `previewRowId` transient field to correlate during insert — more invasive schema change; (b) Store a lookup table during the transaction — adds complexity; (c) Denormalize `cardLast4` onto projection — too invasive |
| **Rationale** | Approach (a) is the safest: uses only existing fields, no schema change, works inside a single transaction, and the composite key is guaranteed unique because `displayOrder` is unique per statement and `groupKey` is unique per section |

### Bug 2 — Hard delete vs. soft delete

| | |
|---|---|
| **Choice** | Hard delete (actual `DELETE` SQL) |
| **Alternatives** | Soft-delete / archival (add `deletedAt` / `status: "deleted"`) |
| **Rationale** | `archiveStatement` already provides soft-delete semantics for statements. `deleteStatement` is for removing erroneous data the user explicitly wants gone. Cascade Prisma relations already configured and tested. |

---

## File Structure

```
workspace/backend/src/modules/cards/
  cards.service.ts          # MODIFIED: add deleteStatement(); fix acceptDraft() rowId update
  cards.controller.ts       # MODIFIED: add DELETE /statements/:statementId route
  cards.schemas.ts          # MODIFIED: add statement delete response schema (if needed)

workspace/backend/src/modules/future/
  future.service.ts         # NO CHANGE — join logic is correct; data fix makes it work

workspace/frontend/src/
  (statement list component) # MODIFIED: add delete button + confirmation dialog
```

---

## Bug 1 Fix — Code Pattern (in `acceptDraft()`)

The fix inserts projections with a placeholder `rowId` (the preview ID), then updates to the real UUIDs **after** the rows are inserted, all inside the transaction.

```typescript
// After rows are inserted (lines 827–848 in existing code)...
const statement = await tx.cardStatement.create({
  data: {
    // ... sections, groups, rows created here
    rows: {
      create: preview.rows.map((r) => ({
        sectionKey: r.sectionId,
        groupKey: r.id,
        displayOrder: r.displayOrder,
        // ...
      })),
    },
  },
});

// FIX: Query persisted rows and build composite-key map
const persistedRows = await tx.cardStatementRow.findMany({
  where: { statementId: statement.id },
  orderBy: { displayOrder: "asc" },
});

const rowIdMap = new Map<string, string>();
for (const row of persistedRows) {
  const compositeKey = `${row.displayOrder}:${row.sectionKey}:${row.groupKey}`;
  rowIdMap.set(compositeKey, row.id);
}

// FIX: Update projection rowIds to actual persisted UUIDs
// (Only for projections that have the preview row id — skip manual projections)
const previewRowIds = new Set(projections.map((p) => p.rowId));
if (previewRowIds.size > 0) {
  for (const projection of projections) {
    if (projection.isManual) continue;
    const compositeKey = `${projection.displayOrder}:${projection.sectionKey}:${projection.groupKey}`;
    const actualRowId = rowIdMap.get(compositeKey);
    if (actualRowId && actualRowId !== projection.rowId) {
      await tx.cardInstallmentProjection.updateMany({
        where: { id: projection.id, rowId: projection.rowId },
        data: { rowId: actualRowId },
      });
    }
  }
}
```

**Note:** The `displayOrder`, `sectionKey`, and `groupKey` values on the projection must also be captured from the preview rows when projections are created. The `installmentProjectionService.calculateProjections()` call must be updated to include these fields on each projection object so the composite key can be constructed.

**Alternative for `calculateProjections`:** Instead of adding fields to the projection object, use the preview rows themselves to build the map — after rows are inserted, iterate over `preview.rows` and `persistedRows` in matching `displayOrder` sequence to build the map directly (both arrays are ordered by `displayOrder`).

---

## Bug 2 Fix — Code Pattern

### Backend: `cards.service.ts`

```typescript
async deleteStatement(statementId: string): Promise<{ success: true; deletedId: string }> {
  const statement = await prisma.cardStatement.findUnique({
    where: { id: statementId },
  });
  if (!statement) throw new NotFoundError("Statement");
  if (statement.status !== "accepted") {
    throw new Error("Only accepted statements can be deleted via this endpoint. Use discardDraft() for drafts.");
  }

  await prisma.cardStatement.delete({ where: { id: statementId } });
  logger.info({ statementId }, "Card statement hard-deleted");
  return { success: true, deletedId: statementId };
}
```

### Backend: `cards.controller.ts`

```typescript
app.delete("/statements/:statementId", async (request, reply) => {
  const params = request.params as { statementId: string };
  const result = await cardsService.deleteStatement(params.statementId);
  return reply.send(result);
});
```

---

## Validation Rules

| Entity | Field | Rule |
|---|---|---|
| `CardInstallmentProjection` | `rowId` | Must be a valid UUID referencing an existing `CardStatementRow.id` within the same statement |
| `CardStatement` (delete) | `status` | Must be `"accepted"` — drafts cannot be hard-deleted via this endpoint |
