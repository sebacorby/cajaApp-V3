# 004-fix-future-debt-card-reference -- Implementation Plan

> **For the Developer agent:** Execute this plan task by task using the `IADEV-test-driven-development` skill. Track each `- [ ]` checkbox; only check it when the verification command in that step passes.

## Goal

Fix `cards.service.ts acceptDraft()` so that `CardStatementRow.groupKey` stores the group ID (`r.id`) instead of the section ID (`r.groupId`). This restores the correct row→group join used by `future.service.ts normalizeProjection()` to derive `cardLast4`, eliminating the `missing_card_reference` diagnostic on future debt installments.

## Architecture summary

The card statement write path (`acceptDraft`) persists `CardInstallmentProjection` records for each future installment, but deliberately omits `cardLast4` from the projection — that value is derived at read time by joining `projection.rowId → CardStatementRow.id → CardStatementRow.groupKey → CardStatementGroup.cardLast4`. A typo in the `groupKey` assignment (using the section ID instead of the group ID) broke the third hop of that join. The fix is a single-field correction in the write path; the read path (`normalizeProjection`) requires no changes.

## Tech stack

- Language / runtime: TypeScript / Node.js 24.18.0
- Framework: Fastify backend + Next.js frontend
- Persistence: SQLite via Prisma ORM
- Testing: Vitest (unit/integration)

## Scope

**In scope (this plan delivers):**
- One-line fix in `cards.service.ts acceptDraft()` line ~830: `groupKey: r.groupId` → `groupKey: r.id`
- Integration test in `workspace/backend/tests/cards/accept-draft-group-key.test.ts` that verifies `CardStatementRow.groupKey` holds the group ID after acceptance and that `normalizeProjection` resolves `cardLast4` correctly

**Out of scope (do NOT touch in this plan):**
- Any changes to `future.service.ts normalizeProjection()` — the join logic is correct; only the written value was wrong
- Schema migration to denormalize `cardLast4` onto `CardInstallmentProjection`
- Data migration for already-accepted statements with incorrect `groupKey` values
- Any other `groupKey: r.groupId` occurrences in the codebase (e.g., the `ai-processor-worker.ts` which is a separate module)

## Package & dependency recommendations

No dependency changes.

## Source artifacts

- PRD: `specs/004-fix-future-debt-card-reference/PRD.md`
- Behavior specification: `specs/004-fix-future-debt-card-reference/gherkin.md` + `features/FEAT-026-fix-card-reference.feature`
- Discovery: `specs/004-fix-future-debt-card-reference/discovery.md`
- Proposal: `specs/004-fix-future-debt-card-reference/proposal.md`
- Specs: `specs/004-fix-future-debt-card-reference/specs.md`
- Design: `specs/004-fix-future-debt-card-reference/design.md`
- Tasks (high level): `specs/004-fix-future-debt-card-reference/test/tasks.md`

## Feature -> task index

| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-026 | Fix card reference in future debt projections | Task 1, Task 2 |

---

## Task 1: Write failing integration test for cardLast4 derivation

**Files:**
- `workspace/backend/tests/cards/accept-draft-group-key.test.ts` (new)

**Skills the Developer should look for:** anything for integration testing with a live SQLite database via Prisma; Vitest test structure patterns used in `cards.controller.accept.test.ts`.

### Steps

- [ ] **Step 1.1: Write the failing integration test**

Create `workspace/backend/tests/cards/accept-draft-group-key.test.ts`.

The test must:
1. Seed a `CardStatementPreview` with at least one group (with `cardLast4: "4521"`) and at least one row of type `"transaction"` with `installmentCurrent: 1` and `installmentTotal: 3` (3 installments = 2 future projections).
2. Call the `POST /api/card-statements/drafts/:draftId/accept` endpoint (same pattern as `cards.controller.accept.test.ts`).
3. After acceptance, directly query Prisma for the created `CardStatementRow` and assert that `groupKey` equals the row's `id` (the group ID), **not** the `sectionId`.
4. Call `future.service.ts normalizeProjection()` on the created projection records (import `normalizeProjection` from `future.service.ts` or use the public route `GET /api/future-debt`).
5. Assert that the normalized occurrence has `cardLast4 === "4521"` (not null).
6. Assert that `cardLabel` is populated (not null), containing the brand and card digits.
7. Assert that `missing_card_reference` is **not** in the diagnostics.

**Assertion sketch (inputs / expected outputs):**
```
Given: preview with group { id: "g-1", cardLast4: "4521", brand: "Visa" }
       and row { id: "r-1", sectionId: "s-1", groupId: "s-1" } (row.groupId === sectionId)
When: acceptDraft + normalizeProjection
Then: CardStatementRow.groupKey === "r-1"          (group ID, not section ID)
      normalized.cardLast4 === "4521"              (not null)
      normalized.cardLabel includes "Visa" and "4521"
      diagnostics does NOT contain "missing_card_reference"
```

The test must **fail before the fix** because `groupKey` will be `"s-1"` (section ID) instead of `"r-1"` (group ID), causing the group lookup to return undefined and `cardLast4` to be null.

Use the same `seedPreviewReadyDraft`, app-building, and cleanup patterns from `cards.controller.accept.test.ts`. Prisma models involved: `CardStatement`, `CardStatementGroup`, `CardStatementRow`, `CardInstallmentProjection`. Cleanup must delete all of these after each test.

Run: `cd workspace/backend && npm run test -- --run tests/cards/accept-draft-group-key.test.ts`
Expected: test **fails** — assertion on `groupKey` returns the wrong value (section ID instead of group ID)

---

## Task 2: Fix groupKey assignment in acceptDraft()

**Files:**
- `workspace/backend/src/modules/cards/cards.service.ts` (1 line)

**Skills the Developer should look for:** anything for TypeScript service-layer patterns in Fastify; reading Prisma schema for `CardStatementRow`.

### Steps

- [ ] **Step 2.1: Verify the failing test is still failing (RED confirmation)**

Run the test from Task 1 and confirm it fails with the wrong `groupKey` value.

Run: `cd workspace/backend && npm run test -- --run tests/cards/accept-draft-group-key.test.ts`
Expected: FAIL — `groupKey` is `"s-1"` (section ID) but should be `"r-1"` (group ID)

- [ ] **Step 2.2: Apply the fix**

In `workspace/backend/src/modules/cards/cards.service.ts`, inside the `rows.create` block of `acceptDraft()` (around line 830), change:

```typescript
// BEFORE (wrong — stores section ID)
groupKey: r.groupId,

// AFTER (correct — stores group ID / row ID)
groupKey: r.id,
```

The `CardStatementRow` Prisma model uses `groupKey` as the foreign key to `CardStatementGroup.groupKey`. The `CardStatementPreviewRow` type has `id` (the group ID for the join) and `groupId` (the section ID, which is incorrect for this join). The groups map in `normalizeProjection` is keyed by `${statementId}:${group.groupKey}` where `group.groupKey === CardStatementGroup.id` — so the row's `groupKey` must be `r.id`, not `r.groupId`.

Run: `cd workspace/backend && npm run test -- --run tests/cards/accept-draft-group-key.test.ts`
Expected: PASS — `groupKey` is now the group ID, `cardLast4` is `"4521"`, `cardLabel` is populated, no `missing_card_reference` diagnostic

- [ ] **Step 2.3: Commit**

```bash
git add workspace/backend/tests/cards/accept-draft-group-key.test.ts workspace/backend/src/modules/cards/cards.service.ts
git commit -m "fix(cards): use row ID as groupKey in acceptDraft — restores cardLast4 join

Before: groupKey: r.groupId stored the section ID, breaking the row→group join
in normalizeProjection and causing missing_card_reference on all future
installments.

After: groupKey: r.id stores the actual group ID, restoring the correct
cardLast4 derivation.

FEAT-026"
```

---

## Task 3: Verification

### Steps

- [ ] **Step 3.1: Linter**

Run: `cd workspace/backend && npm run lint`
Expected: exit 0, 0 errors.

- [ ] **Step 3.2: Type checker**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

- [ ] **Step 3.3: Full unit test suite**

Run: `cd workspace/backend && npm run test -- --run`
Expected: 0 failures, 0 errors.

- [ ] **Step 3.4: Confirm scenario coverage**

For every scenario in `FEAT-026-fix-card-reference.feature`:

| Scenario | Covered by | Layer |
|---|---|---|
| Cuota futura muestra la referencia de tarjeta correcta | `accept-draft-group-key.test.ts` | Integration |
| Múltiples cuotas de la misma tarjeta se agrupan correctamente | Same test (multiple rows in preview) | Integration |
| Cuota sin referencia de tarjeta aparece en pendientes | Covered by existing tests (unrelated to this bug) | Unit |
| Identificación de tarjeta a través de la traza de origen | Same test + `normalizeProjection` path | Integration |

Missing coverage is a verification failure even if every gate is green.

---

## Task 4: Write implementation_report.md

**Files:**
- `specs/004-fix-future-debt-card-reference/implementation_report.md` (new)

Summarize: the fix applied (1 line, `groupKey: r.id`), test written, verification results, scope decisions, and any deferred items (existing data with wrong `groupKey` requires a separate data-fix migration — out of scope).

---

## Deferred to Tester (not run by Developer)

| Gate | Command |
|---|---|
| Integration tests (full suite) | `cd workspace/backend && npm run test -- --run` |
| API smoke test | `cd workspace/backend && npm run test -- --run tests/smoke/` |
| Build | `cd workspace/backend && npm run build` |

---

## Future work (not in this plan)

- One-time data migration for already-accepted `CardStatementRow` records that have incorrect `groupKey` (section ID instead of group ID) — tracked separately.
- Consider denormalizing `cardLast4` onto `CardInstallmentProjection` to make projections self-contained and avoid runtime joins — requires schema migration, out of scope for this fix.
