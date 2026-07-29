# Discovery — 004-fix-future-debt-card-reference

## Change & PRD

- **Spec folder:** `specs/004-fix-future-debt-card-reference`
- **PRD:** `PRD.md` (the bug description above)
- **Type:** Bug fix (functional)

---

## Summary

When a card statement is imported and its draft is accepted, `CardInstallmentProjection` records are created for each future installment. However, these projection records do not store the `cardLast4` identifier. At read time, `future.service.ts` attempts to derive `cardLast4` by joining the projection's `rowId` → `CardStatementRow.groupKey` → `CardStatementGroup.cardLast4`. Due to a mismatch in how `groupKey` is stored during acceptance, this join fails and `cardLast4` is `null`. Without a valid `cardLast4`, the occurrence receives the `missing_card_reference` diagnostic and is moved to `pendientes` instead of being properly grouped under the card.

---

## Root Cause Analysis

### Step 1: How projections are created (acceptance flow)

In `cards.service.ts` `acceptDraft()` (lines 855–869), `CardInstallmentProjection` records are created:

```typescript
await tx.cardInstallmentProjection.createMany({
  data: projections.map((p) => ({
    statementId: statement.id,
    rowId: p.rowId,
    monthKey: p.monthKey,
    label: p.label,
    installmentCurrent: p.installmentCurrent,
    installmentTotal: p.installmentTotal,
    amountPesosRaw: p.amountPesos,
    amountDollarsRaw: p.amountDollars,
    currencyOriginal: p.currencyOriginal,
    isManual: false,
  })),
});
```

**Key observation:** No `cardLast4`, `holderName`, or `cardId` is stored in the projection.

### Step 2: How `cardLast4` is derived at read time

In `future.service.ts` `normalizeProjection()` (lines 114–188):

1. `last4` is derived from `manual?.cardLast4 ?? group?.cardLast4 ?? null` (line 130)
2. `group` is looked up via `groups.get(`${projection.statementId}:${row.groupKey}`)` (lines 126–128)
3. `cardId` is computed via `cardIdFor(projection.statementId, group, last4, holderName)` (line 133)
4. `cardIdFor()` returns `null` if `last4` is not set (lines 72–82)
5. When `cardId` is `null`, `cardLabel` is also `null` (line 180)

### Step 3: The mismatch — `row.groupKey` vs. `group.id`

The groups map is keyed by `${group.statementId}:${group.groupKey}` (line 307–310), where `group.groupKey` is the `groupKey` field from `CardStatementGroup`.

The row lookup uses `row.groupKey` (from `CardStatementRow`) as the second component of the key.

**The bug:** In `cards.service.ts` `acceptDraft()` (line 830), rows are created with:
```typescript
groupKey: r.groupId,
```

But `r.groupId` (from `CardStatementPreview`) is the **section ID**, not the group ID. The `CardStatementPreviewGroup` type has both `id` (group ID) and `sectionId` (section ID). The code incorrectly uses `r.groupId` (section ID) instead of `r.id` (group ID).

### Step 4: Consequence — group lookup fails

Since `row.groupKey` contains a section ID (e.g., `"section-1"`), and the groups map is keyed by the actual `group.groupKey` (e.g., `"group-1"`), the lookup:
```typescript
groups.get(`${projection.statementId}:${row.groupKey}`)
```
returns `undefined`, causing `group?.cardLast4` to be `null`.

### Step 5: Diagnostic and UI consequence

In `diagnostics.ts` (lines 64–70):
```typescript
if (!occurrence.cardId || !occurrence.cardLast4?.trim()) {
  diagnostics.missingCardRows += 1;
  pendingRows.push(pending(
    occurrence,
    "missing_card_reference",
    "La ocurrencia no tiene una referencia de tarjeta identificable y no se sumaron a una tarjeta.",
  ));
  continue;
}
```

The occurrence is moved to `pendientes` with the `missing_card_reference` diagnostic.

In the UI (`FutureDebtView.tsx`), the `Pendientes` section displays rows with the diagnostic badge "missing_card_reference", and `DiagnosticsPanel` shows "Sin tarjeta: N".

---

## Features

| FEAT-ID | Name | Type |
|---------|------|------|
| FEAT-026 | Fix card reference in future debt projections | functional |

---

## Resolved Decisions

- **Root cause identified:** `CardStatementRow.groupKey` stores a section ID (from `r.groupId`) instead of the actual group ID (`g.id`). This breaks the row→group join used to derive `cardLast4`.
- **Affected code path:** `cards.service.ts` `acceptDraft()` line 830 uses `groupKey: r.groupId` (section ID) instead of `groupKey: r.id` (group ID).
- **Schema limitation:** `CardInstallmentProjection` has no `cardLast4` field — it relies on runtime joins to derive it. The join is broken by the `groupKey` mismatch.
- **Alternative fix considered (rejected):** Denormalizing `cardLast4` directly onto `CardInstallmentProjection` would require a schema migration and is more invasive than fixing the `groupKey` assignment.

---

## Open Questions for Planning

1. Should `CardStatementRow.groupKey` be fixed to store the actual group ID (requiring a data migration for existing rows), or should `cardLast4` be denormalized onto `CardInstallmentProjection` (schema change)?
2. Should `CardInstallmentProjection` gain `cardLast4` and `holderName` fields to make the projection self-contained and avoid runtime joins?
3. Should a one-time migration script fix existing `CardStatementRow.groupKey` values for already-accepted statements?

---

## Collision Check

No collisions detected against the active feature set. This is a bug fix that addresses a broken behavior in FEAT-023 (future debt traceability and card grouping). The fix does not change the expected behavior — it restores the correct behavior that FEAT-023 already specified but was not correctly implemented.

---

## Codebase Context

- **Tech stack:** TypeScript, Fastify backend, Next.js frontend, Prisma ORM, SQLite
- **Backend modules touched:**
  - `modules/cards/cards.service.ts` — `acceptDraft()` creates projections with incorrect `groupKey`
  - `modules/future/future.service.ts` — `normalizeProjection()` derives `cardLast4` via broken join
  - `modules/projections/installment-projection.service.ts` — calculates projections without card context
- **Prisma models:**
  - `CardInstallmentProjection` — no `cardLast4`/`cardId` fields; relies on join
  - `CardStatementRow.groupKey` — stores section ID instead of group ID
  - `CardStatementGroup` — has `cardLast4` but not reachable via correct join key
- **Frontend:** `FutureDebtView.tsx` — correctly displays what the API returns; the bug is in the API not providing the card reference
