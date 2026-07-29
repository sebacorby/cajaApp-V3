# Design: 004-fix-future-debt-card-reference

## Stack

| Aspect | Choice | Rationale |
|---|---|---|
| Language / runtime | TypeScript / Node.js | Unchanged |
| Core framework | Fastify backend + Next.js frontend | Unchanged |
| Data persistence | SQLite via Prisma ORM | Unchanged |
| ORM | Prisma | Unchanged |

## Dependencies

No dependency changes. No packages added, removed, or swapped.

## Data Model

No schema changes. The Prisma `CardStatementRow` model already has a `groupKey` field; the fix corrects which value is written to it.

```
CardStatementRow.groupKey  ← must store GROUP ID (string), not section ID
```

The join chain used at read time:
```
CardInstallmentProjection.rowId
  → CardStatementRow.id
  → CardStatementRow.groupKey   ← BUG: stored section ID; FIX: store group ID
  → CardStatementGroup.groupKey  (where CardStatementGroup.groupKey = CardStatementGroup.id)
  → CardStatementGroup.cardLast4
```

## Interface

No API changes. The fix is internal to the `acceptDraft` write path.

## Architecture Decisions

### Fix groupKey value, not join logic

| | |
|---|---|
| **Choice** | Fix `groupKey: r.groupId` → `groupKey: r.id` in `cards.service.ts acceptDraft()` |
| **Alternatives** | (1) Denormalize `cardLast4` onto `CardInstallmentProjection` (schema migration, more invasive); (2) Change the `normalizeProjection` join logic to accept section IDs (would change the meaning of `groupKey` across the model) |
| **Rationale** | The join logic in `normalizeProjection` is correct. Only the written value is wrong. The minimal fix is to write the correct field. |

## File Structure

```
workspace/backend/src/modules/cards/cards.service.ts  — fix groupKey assignment (1 line)
workspace/backend/src/modules/cards/__tests__/        — add integration test for cardLast4 derivation
```

## Validation Rules

No new validation rules. The fix restores the correct behavior that validation rules already assume.