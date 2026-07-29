# 005-fix-future-debt-missing-card-delete -- Implementation Plan

> **For the Developer agent:** Execute this plan task by task using the `IADEV-test-driven-development` skill. Track each `- [ ]` checkbox; only check it when the verification command in that step passes.

## Goal

Fix a temporal ordering bug in `acceptDraft()` where `CardInstallmentProjection.rowId` stores preview row IDs instead of persisted UUIDs, causing `missing_card_reference` diagnostics in the future debt view. Also add `DELETE /statements/:statementId` to allow hard-deleting accepted statements that contain erroneous data.

## Architecture summary

The backend uses TypeScript + Fastify + Prisma/SQLite. `cards.service.ts` holds the `acceptDraft()` transaction that creates a `CardStatement`, its sections/groups/rows, and `CardInstallmentProjection` records. The Future Debt read module (`future.service.ts`) joins projections to rows via `normalizeProjection()` — the join logic is correct; the data written by `acceptDraft()` was stale. The frontend uses Next.js with shadcn/ui + Radix UI; delete is wired from the statement list in `tarjetas-section.tsx`.

## Tech stack

- Language / runtime: TypeScript 5 on Node.js 24.18.0
- Backend framework: Fastify 5.2.1
- Database: SQLite via Prisma 6.5.0
- Frontend: Next.js 16.1.1 (React 19), Tailwind 4, Radix UI / shadcn/ui
- Testing: Vitest 3.0.4 (backend unit/integration), Playwright 1.61.1 (frontend E2E)

## Scope

**In scope (this plan delivers):**
- Fix `CardInstallmentProjection.rowId` staleness inside the `acceptDraft()` transaction (`cards.service.ts`)
- Add `DELETE /statements/:statementId` route + `cardsService.deleteStatement()` method
- Frontend delete affordance in the statements list with Radix UI `AlertDialog` confirmation
- Data fixup query for existing accepted statements with stale `rowId` values
- All unit/integration tests for the two bug fixes

**Out of scope (do NOT touch in this plan):**
- `normalizeProjection()` in `future.service.ts` — the join logic is correct; only the written data is wrong
- Prisma schema changes — no new fields, models, or relations
- `installmentProjectionService.calculateProjections()` signature change — composite key built from preview row data after insert
- Soft-delete / archival — `archiveStatement` already covers that use case
- Bulk deletion of statements

## Package & dependency recommendations

No dependency changes. Both fixes use existing packages (Prisma, Fastify, Radix UI).

## Source artifacts

- PRD: `specs/005-fix-future-debt-missing-card-delete/PRD.md`
- Behavior specification: `specs/005-fix-future-debt-missing-card-delete/gherkin.md` + `features/FEAT-027-fix-projection-row-reference.feature`, `features/FEAT-028-delete-accepted-card-statement.feature` _(consumed via `IADEV-bdd-implementation`)_
- Discovery: `specs/005-fix-future-debt-missing-card-delete/functional/discovery.md`
- Proposal: `specs/005-fix-future-debt-missing-card-delete/code/proposal.md`
- Specs: `specs/005-fix-future-debt-missing-card-delete/code/specs.md`
- Design: `specs/005-fix-future-debt-missing-card-delete/code/design.md`
- Tasks (high level): `specs/005-fix-future-debt-missing-card-delete/test/tasks.md`

## Feature -> task index

| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-027 | Fix Projection RowId Reference After Statement Acceptance | Task 1 (RED), Task 2 (GREEN) |
| FEAT-028 | Delete Accepted Card Statements | Task 3 (RED), Task 4 (GREEN) |

---

## Bug 1: Fix `CardInstallmentProjection.rowId` Staleness

### Task 1: RED — Write failing test for projection `rowId` correctness

**Files:**
- `workspace/backend/tests/cards/projection-rowid.test.ts` _(create)_

**Skills the Developer should look for:** anything for backend integration testing with a real database, anything for Vitest test setup with Prisma.

- [ ] **Step 1.1: Create `workspace/backend/tests/cards/projection-rowid.test.ts`**

Write a Vitest test that:
- Creates a `CardStatementDraft` with at least 2 sections, 1 group, and 1 installment transaction row (with `installmentRaw: "1/3"`)
- Accepts the draft via `POST /api/card-statements/drafts/:draftId/accept`
- Immediately queries `prisma.cardInstallmentProjection.findMany({ where: { statementId } })`
- Immediately queries `prisma.cardStatementRow.findMany({ where: { statementId } })`
- Asserts that **every** non-manual projection's `rowId` matches exactly one `CardStatementRow.id` from the row query
- Asserts that the future debt endpoint `GET /api/future-debt` returns zero `missing_card_reference` entries for the new statement

**Run:** `cd workspace/backend && npm run test -- --run tests/cards/projection-rowid.test.ts`
**Expected:** test fails — projection `rowId` values are preview IDs (e.g. `'g-1'` or preview UUIDs), not the persisted row UUIDs. Assertion `projection.rowId === row.id` fails.

---

### Task 2: GREEN — Apply Bug 1 fix in `acceptDraft()`

**Files:**
- `workspace/backend/src/modules/cards/cards.service.ts` — MODIFIED: fix `acceptDraft()`
- `workspace/backend/src/modules/projections/installment-projection.service.ts` — MODIFIED: extend `InstallmentProjection` interface

**Skills the Developer should look for:** anything for ORM data management in TypeScript (Prisma transactions).

- [ ] **Step 2.1: Extend `InstallmentProjection` interface**

In `workspace/backend/src/modules/projections/installment-projection.service.ts`, add three fields to the `InstallmentProjection` interface: `displayOrder: number`, `sectionKey: string`, `groupKey: string`.

The `calculateProjections()` method must set these three fields on every projection it creates, copying them from the corresponding `CardStatementRow` in the input array.

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2.2: Fix `acceptDraft()` — build composite-key map and update projection rowIds**

In `workspace/backend/src/modules/cards/cards.service.ts`, inside the `prisma.$transaction` callback, **after** the `tx.cardStatement.create(...)` call (line ~849 in the existing code), insert a new block that:

1. Queries all persisted rows for the new statement, ordered by `displayOrder`:
   ```typescript
   const persistedRows = await tx.cardStatementRow.findMany({
     where: { statementId: statement.id },
     orderBy: { displayOrder: "asc" },
   });
   ```

2. Builds a `Map<string, string>` (composite key → row UUID):
   ```typescript
   const rowIdMap = new Map<string, string>();
   for (const row of persistedRows) {
     const key = `${row.displayOrder}:${row.sectionKey}:${row.groupKey}`;
     rowIdMap.set(key, row.id);
   }
   ```

3. For each projection where `isManual === false`, looks up the actual row ID and updates it:
   ```typescript
   for (const projection of projections) {
     if (projection.isManual) continue;
     const key = `${projection.displayOrder}:${projection.sectionKey}:${projection.groupKey}`;
     const actualRowId = rowIdMap.get(key);
     if (actualRowId && actualRowId !== projection.rowId) {
       await tx.cardInstallmentProjection.updateMany({
         where: { id: projection.id, rowId: projection.rowId },
         data: { rowId: actualRowId },
       });
     }
   }
   ```

   This block must run **before** `tx.cardStatementDraft.update({ where: { id: draftId }, data: { status: "accepted" } })`.

**Run:** `cd workspace/backend && npm run test -- --run tests/cards/projection-rowid.test.ts`
**Expected:** test passes. All non-manual projection `rowId` values match persisted `CardStatementRow.id`.

- [ ] **Step 2.3: Write data-fixup script**

Create `workspace/backend/src/scripts/fix-stale-projection-rowids.ts`. The script:
1. Queries all accepted `CardStatement` records
2. For each statement, queries its `CardStatementRow` records ordered by `displayOrder`
3. Builds the same composite-key map
4. Queries all non-manual `CardInstallmentProjection` records for that statement
5. For each projection whose `rowId` does not match the map-derived ID, updates it

Run: `cd workspace/backend && npx tsx src/scripts/fix-stale-projection-rowids.ts`
Expected: script completes with no errors and logs how many projections were updated.

- [ ] **Step 2.4: Commit**

```bash
git add workspace/backend/src/modules/cards/cards.service.ts workspace/backend/src/modules/projections/installment-projection.service.ts workspace/backend/src/scripts/fix-stale-projection-rowids.ts workspace/backend/tests/cards/projection-rowid.test.ts
git commit -m "fix(cards): update CardInstallmentProjection.rowId after row insert in acceptDraft()

Fixes missing_card_reference diagnostics in future debt view.
Bug: projections were created with preview row IDs before CardStatementRow
records received database-generated UUIDs. After inserting rows we now
query them back, build a displayOrder+sectionKey+groupKey composite-key
map, and update each projection.rowId to the actual persisted UUID — all
inside the same transaction.

Adds data-fixup script for existing accepted statements.
Refs: FEAT-027"
```

---

## Bug 2: Add `DELETE /statements/:statementId`

### Task 3: RED — Write failing tests for delete endpoint

**Files:**
- `workspace/backend/tests/cards/delete-statement.test.ts` _(create)_

**Skills the Developer should look for:** anything for backend HTTP integration testing with Fastify, anything for Vitest with real HTTP server.

- [ ] **Step 3.1: Create `workspace/backend/tests/cards/delete-statement.test.ts`**

Write a Vitest test file with three test cases. Use the same pattern as `workspace/backend/tests/cards/drafts-discard.test.ts` for how to set up a Fastify instance with the cards routes and inject() calls.

**Test A — 404 for non-existent statement:**
- `DELETE /api/card-statements/statements/non-existent-uuid`
- Expected: `404` with `{ code: "NOT_FOUND" }` or similar

**Test B — 400 for draft statement:**
- Create a draft via `POST /api/card-statements/import` (or use an existing draft from fixtures)
- `DELETE /api/card-statements/statements/:draftStatementId` (where the ID belongs to a draft)
- Expected: `400` with an error message about drafts

**Test C — Cascade delete of accepted statement:**
- Import and accept a full card statement with installments (has `CardInstallmentProjection` records)
- `DELETE /api/card-statements/statements/:statementId`
- Expected: `200` with `{ success: true, deletedId: "<uuid>" }`
- After: `prisma.cardStatement.findUnique` returns `null`
- After: `prisma.cardInstallmentProjection.findMany` returns empty array for that statementId
- After: `prisma.cardStatementSection.findMany` returns empty array
- After: `prisma.cardStatementGroup.findMany` returns empty array
- After: `prisma.cardStatementRow.findMany` returns empty array

**Run:** `cd workspace/backend && npm run test -- --run tests/cards/delete-statement.test.ts`
**Expected:** All three tests fail. Route not registered (`404`), or `deleteStatement` method throws.

- [ ] **Step 3.2: Commit**

```bash
git add workspace/backend/tests/cards/delete-statement.test.ts
git commit -m "test(cards): add RED tests for DELETE /statements/:statementId

Tests 404 (not found), 400 (draft), and cascade delete of accepted statement.
Refs: FEAT-028"
```

---

### Task 4: GREEN — Apply Bug 2 fix (controller + service)

**Files:**
- `workspace/backend/src/modules/cards/cards.service.ts` — MODIFIED: add `deleteStatement()`
- `workspace/backend/src/modules/cards/cards.controller.ts` — MODIFIED: add `DELETE /statements/:statementId` route
- `workspace/frontend/src/lib/finance/card-statements-api.ts` — MODIFIED: add `deleteCardStatement()` to API client

**Skills the Developer should look for:** anything for Fastify route registration, anything for Prisma cascade deletes, anything for React state management with TanStack Query.

- [ ] **Step 4.1: Add `deleteStatement()` to `CardsService`**

In `workspace/backend/src/modules/cards/cards.service.ts`, add:

```typescript
async deleteStatement(statementId: string): Promise<{ success: true; deletedId: string }> {
  const statement = await prisma.cardStatement.findUnique({
    where: { id: statementId },
  });
  if (!statement) {
    throw new NotFoundError("Statement");
  }
  if (statement.status !== "accepted") {
    throw new Error(
      "Only accepted statements can be deleted via this endpoint. Use discardDraft() for drafts.",
    );
  }

  await prisma.cardStatement.delete({ where: { id: statementId } });
  logger.info({ statementId }, "Card statement hard-deleted");
  return { success: true, deletedId: statementId };
}
```

`NotFoundError` must be imported from `../../shared/errors.js` (same pattern as other service methods).

**Run:** `cd workspace/backend && npx tsc --noEmit`
**Expected:** 0 errors.

- [ ] **Step 4.2: Add `DELETE /statements/:statementId` route to controller**

In `workspace/backend/src/modules/cards/cards.controller.ts`, add after the existing `app.post("/statements/:statementId/archive", ...)` route:

```typescript
app.delete("/statements/:statementId", async (request, reply) => {
  const params = request.params as { statementId: string };
  try {
    const result = await cardsService.deleteStatement(params.statementId);
    return reply.send(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ code: "NOT_FOUND", message: error.message });
    }
    if (error instanceof Error && error.message.includes("Only accepted statements")) {
      return reply.status(400).send({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
});
```

**Run:** `cd workspace/backend && npx tsc --noEmit`
**Expected:** 0 errors.

- [ ] **Step 4.3: Run delete-statement tests**

**Run:** `cd workspace/backend && npm run test -- --run tests/cards/delete-statement.test.ts`
**Expected:** All three tests pass.

- [ ] **Step 4.4: Add `deleteCardStatement()` to frontend API client**

In `workspace/frontend/src/lib/finance/card-statements-api.ts`, add:

```typescript
export async function deleteCardStatement(
  statementId: string,
): Promise<{ success: true; deletedId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/${encodeURIComponent(statementId)}`,
    { method: "DELETE" },
  );
  return handleResponse(response);
}
```

**Run:** `cd workspace/frontend && npx tsc --noEmit`
**Expected:** 0 errors.

- [ ] **Step 4.5: Commit**

```bash
git add workspace/backend/src/modules/cards/cards.service.ts workspace/backend/src/modules/cards/cards.controller.ts workspace/frontend/src/lib/finance/card-statements-api.ts workspace/backend/tests/cards/delete-statement.test.ts
git commit -m "feat(cards): add DELETE /statements/:statementId for hard-deleting accepted statements

Only accepted statements can be deleted; drafts must use discardDraft().
Prisma onDelete: Cascade removes all children (sections, groups, rows,
projections, manualPurchases). Frontend API client also added.
Refs: FEAT-028"
```

---

## Task 5: Frontend — Add delete button in statement UI

**Files:**
- `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx` — MODIFIED
- `workspace/frontend/src/components/ui/alert-dialog.tsx` — already exists (shadcn); import it

**Skills the Developer should look for:** anything for React state management with TanStack Query, anything for UI dialogs in the chosen component library.

- [ ] **Step 5.1: Add delete button for accepted statements in the list**

In `tarjetas-section.tsx`, locate the statement list rendering loop. For each statement where `item.status === "accepted"`, add a `Button` variant="ghost" or variant="destructive" with `Trash2` icon. The button must call a handler `handleDeleteStatement(item.id)` that sets `deleteTargetId` state.

The button must NOT be shown for `item.status === "draft"` or `item.status === "archived"`.

Do NOT use `alert()` — use the Radix `AlertDialog` component pattern already used elsewhere in the codebase.

- [ ] **Step 5.2: Wire up `AlertDialog` confirmation**

Add state: `const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)`.

Add a `handleConfirmDelete` function that:
1. Calls `deleteCardStatement(deleteTargetId!)`
2. On success: invalidates the `["card-statements"]` TanStack Query key to refresh the list, sets `deleteTargetId = null`, and shows a success toast (`toast({ title: "Statement deleted" })`)
3. On error: shows an error toast, does NOT close the dialog

Add an `AlertDialog` component:
- Trigger: the Trash2 button in the list
- Content: "Are you sure you want to delete this statement? This will remove all associated data including future debt installments. This action cannot be undone."
- Cancel: "Cancel" button → `setDeleteTargetId(null)`
- Confirm: "Delete" button (variant="destructive") → `handleConfirmDelete()`

- [ ] **Step 5.3: Run frontend typecheck**

**Run:** `cd workspace/frontend && npx tsc --noEmit`
**Expected:** 0 errors.

- [ ] **Step 5.4: Commit**

```bash
git add workspace/frontend/src/components/finance/sections/tarjetas-section.tsx workspace/frontend/src/lib/finance/card-statements-api.ts
git commit -m "feat(frontend): add delete button with confirmation dialog for accepted statements

Delete action calls DELETE /statements/:statementId and refreshes the
statement list via TanStack Query invalidation. Uses AlertDialog for
user confirmation. Only shown for accepted statements; drafts continue
to use the discard action.
Refs: FEAT-028"
```

---

## Task 6: Verification

**Skills the Developer should look for:** anything for the language/runtime in use (linters, formatters, test runners).

- [ ] **Step 6.1: Linter**

**Run:** `cd workspace/backend && npm run lint` (or `bun run lint` if that's the tooling)
**Expected:** exit 0, 0 errors.

- [ ] **Step 6.2: Formatter check**

**Run:** `cd workspace/backend && npm run format:check` (or `prettier --check .`)
**Expected:** exit 0 (no files would be reformatted).

- [ ] **Step 6.3: Type checker — backend**

**Run:** `cd workspace/backend && npx tsc --noEmit`
**Expected:** exit 0, 0 errors.

- [ ] **Step 6.4: Type checker — frontend**

**Run:** `cd workspace/frontend && npx tsc --noEmit`
**Expected:** exit 0, 0 errors.

- [ ] **Step 6.5: Unit + integration tests — backend**

**Run:** `cd workspace/backend && npm run test -- --run`
**Expected:** 0 failures, 0 errors. All existing card statement tests still pass.

- [ ] **Step 6.6: Confirm scenario coverage (per `IADEV-bdd-implementation`)**

For every FEAT-ID in the behavior specification, document the test file(s) covering each scenario:

| FEAT-ID | Scenario | Test file | Layer |
|---|---|---|---|
| FEAT-027 | Projection rowId matches persisted row id after acceptance | `tests/cards/projection-rowid.test.ts` | integration |
| FEAT-027 | Installments show correct card reference in future debt view | `tests/cards/projection-rowid.test.ts` | integration |
| FEAT-027 | Re-importing corrected statement does not repeat missing_card_reference | `tests/cards/projection-rowid.test.ts` | integration |
| FEAT-028 | User deletes accepted statement from list | `tests/cards/delete-statement.test.ts` | integration |
| FEAT-028 | Deleted statement's future debt installments no longer appear | `tests/cards/delete-statement.test.ts` | integration |
| FEAT-028 | Delete action unavailable for draft statements | `tests/cards/delete-statement.test.ts` | integration |
| FEAT-028 | Deleting statement with no associated projections succeeds | `tests/cards/delete-statement.test.ts` | integration |

Missing coverage is a verification failure. Add any missing test to the same file before proceeding.

- [ ] **Step 6.7: Append to `implementation_report.md`**

Create (if not exists) or append to `specs/005-fix-future-debt-missing-card-delete/implementation_report.md`:

```markdown
## Test run evidence

| Gate | Result | Notes |
|---|---|---|
| Backend linter | PASS / FAIL | |
| Backend formatter | PASS / FAIL | |
| Backend typecheck | PASS / FAIL | |
| Frontend typecheck | PASS / FAIL | |
| Backend unit/integration tests | PASS / FAIL (N failures) | |
| Scenario coverage | PASS / FAIL | All 7 scenarios covered |

### Scenario coverage map
(see table in Step 6.6 above)

### Deferred to Tester
| Gate | Configured? | Command |
|---|---|---|
| Integration tests | yes | `cd workspace/backend && npm run test -- --run tests/cards/projection-rowid.test.ts tests/cards/delete-statement.test.ts` |
| E2E tests | no | Frontend delete flow verified manually |
| Build / packaging | yes | `cd workspace/frontend && npm run build` |
| Pre-commit hooks | no | |
```

---

## Task 7: Summary

**Files touched:**

| File | Change |
|---|---|
| `workspace/backend/src/modules/projections/installment-projection.service.ts` | Extended `InstallmentProjection` interface with `displayOrder`, `sectionKey`, `groupKey` |
| `workspace/backend/src/modules/cards/cards.service.ts` | Bug 1 fix: composite-key rowId map + update in transaction; Bug 2: `deleteStatement()` method |
| `workspace/backend/src/modules/cards/cards.controller.ts` | Bug 2: `DELETE /statements/:statementId` route |
| `workspace/backend/src/scripts/fix-stale-projection-rowids.ts` | Data-fixup script for existing stale projections |
| `workspace/backend/tests/cards/projection-rowid.test.ts` | NEW — integration test for Bug 1 |
| `workspace/backend/tests/cards/delete-statement.test.ts` | NEW — integration tests for Bug 2 |
| `workspace/frontend/src/lib/finance/card-statements-api.ts` | Added `deleteCardStatement()` |
| `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx` | Delete button + AlertDialog confirmation |

**Commits (in order):**
1. `test(cards): add RED test for projection rowId correctness — refs FEAT-027`
2. `fix(cards): update CardInstallmentProjection.rowId after row insert in acceptDraft() — refs FEAT-027`
3. `test(cards): add RED tests for DELETE /statements/:statementId — refs FEAT-028`
4. `feat(cards): add DELETE /statements/:statementId for hard-deleting accepted statements — refs FEAT-028`
5. `feat(frontend): add delete button with confirmation dialog for accepted statements — refs FEAT-028`
