# 003-revisar-drafts-pendientes -- Implementation Plan

> **For the Developer agent:** Execute this plan task by task using the `IADEV-test-driven-development` skill. Track each `- [ ]` checkbox; only check it when the verification command in that step passes.

## Goal

Add a pending-drafts panel to the Import Center that lists `preview_ready` and `failed` `CardStatementDraft` records with accept/view/discard actions, a dedicated list endpoint, a discard endpoint, the Zustand handoff into the Cards section, and confirmed-delete UX — covering all 6 FEAT-025 scenarios.

## Architecture summary

The change extends the existing `cards/` Fastify module with two new REST routes and extends the `importaciones-section.legacy.tsx` with a `PendingDraftsPanel`. The panel loads summaries via `listCardStatementDrafts`, dispatches accept/view/discard through existing clients and a new `discardCardStatementDraft` client, and hands off view navigation through the `FinanceUIState` Zustand store (`pendingCardStatementDraftId`). `TarjetasSection` consumes the handoff after its boot `Promise.all` to open the draft in editable preview mode.

## Tech stack

- **Language / runtime:** TypeScript 5 (strict mode), Node.js 24.18
- **Backend framework:** Fastify 5.2.1 — `cards/` module routes/controllers/services pattern
- **Persistence:** Prisma 6.5 (SQLite) — no migration; reuse existing cascade relations
- **Frontend framework:** Next.js 16.1.1 / React 19 — Zustand store, shadcn/ui `AlertDialog`
- **Testing:** Vitest 3.0.4 (backend unit/integration), Playwright 1.61.1 (frontend E2E)
- **Schema validation:** Zod (existing)

## Scope

**In scope (this plan delivers):**
- `GET /api/card-statements/drafts?status=preview_ready|failed|all&limit=&offset=` — list pending draft summaries
- `DELETE /api/card-statements/drafts/:draftId` — cascade-discard draft + uploaded document
- `cardStatementDraftSummarySchema` Zod schema (new response schema)
- `listCardStatementDrafts` and `discardCardStatementDraft` frontend API functions
- `PendingDraftsPanel` in `importaciones-section.legacy.tsx` with accept/view/discard per status
- `FinanceUIState` extension: `pendingCardStatementDraftId`, `setPendingCardStatementDraft`, `clearPendingCardStatementDraft`
- `TarjetasSection` boot effect: consume pending draft ID and enter editable preview mode
- Spanish `AlertDialog` confirmation for discard
- All 6 FEAT-025 scenarios covered by automated tests

**Out of scope (do NOT touch in this plan):**
- Inline preview editing in the Import Center
- Draft reprocessing/retry controls
- AI extraction, repair, or provider changes
- Multi-select, bulk discard, or drag-and-drop
- Proactive notifications
- Salary-receipt drafts or other import kinds
- Database schema changes or migrations
- Authentication/authorization layer changes
- Package additions or upgrades

## Package & dependency recommendations

No dependency changes. All required packages (`fastify`, `@prisma/client`, `zod`, `next`, `react`, `zustand`, `@radix-ui/react-alert-dialog`, `vitest`, `@playwright/test`) are already installed and used as-is.

| Action | Package | Why this package | Why not the alternative | Confirmation needed? |
|---|---|---|---|---|
| keep | `fastify` | Existing HTTP framework for the two new `cards/` routes | — | no |
| keep | `@prisma/client` | Existing ORM for draft listing and cascade discard | — | no |
| keep | `zod` | Existing schema validation; used for `cardStatementDraftSummarySchema` | — | no |
| keep | `next` | Existing frontend framework hosting both sections | — | no |
| keep | `react` | Existing component and boot-effect runtime | — | no |
| keep | `zustand` | Existing store for the cross-section draft handoff | — | no |
| keep | `@radix-ui/react-alert-dialog` | Already-installed primitive behind shadcn `AlertDialog` | — | no |
| keep | `vitest` | Existing backend test runner | — | no |
| keep | `@playwright/test` | Existing E2E runner for FEAT-025 scenarios | — | no |

## Source artifacts

- PRD: `specs/003-revisar-drafts-pendientes/PRD.md`
- Behavior specification: `specs/003-revisar-drafts-pendientes/gherkin.md` + `features/FEAT-025-revisar-drafts-pendientes.feature` _(consumed via `IADEV-bdd-implementation`)_
- Discovery: `specs/003-revisar-drafts-pendientes/functional/discovery.md`
- Proposal: `specs/003-revisar-drafts-pendientes/code/proposal.md`
- Specs: `specs/003-revisar-drafts-pendientes/code/specs.md`
- Design: `specs/003-revisar-drafts-pendientes/code/design.md`
- Tasks (high level): `specs/003-revisar-drafts-pendientes/test/tasks.md`

## Feature -> task index

| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-025 | Revisar drafts pendientes | Task 1 (backend list endpoint), Task 2 (backend discard endpoint), Task 3 (frontend API + PendingDraftsPanel), Task 4 (discard confirmation modal), Task 5 (Zustand handoff + TarjetasSection boot), Task 6 (Verification) |

---

## Task 1: Backend list endpoint — `GET /api/card-statements/drafts`

**Files:**
- `workspace/backend/src/modules/cards/cards.schemas.ts` — add `cardStatementDraftSummarySchema`
- `workspace/backend/src/modules/cards/cards.service.ts` — add `listPendingDraftSummaries` method
- `workspace/backend/src/modules/cards/cards.controller.ts` — add `GET /drafts` handler
- `workspace/backend/src/modules/cards/cards.routes.ts` — no change needed (prefix already covers `/drafts`)
- `workspace/backend/tests/cards/drafts-list.test.ts` — new test file

**Skills the Developer should look for:** anything for Fastify route/controller/service testing, anything for Zod schema testing.

- [ ] **Step 1.1: Write failing service tests for pending-draft listing**

Create `workspace/backend/tests/cards/drafts-list.test.ts`. Test file follows the existing test patterns (Vitest, describe blocks).

**What to test:**
- `listPendingDraftSummaries({})` (no filter): returns only `preview_ready` and `failed` drafts; omits `imported`, `processing`, `accepted`.
- `listPendingDraftSummaries({ status: "preview_ready" })`: returns only `preview_ready`.
- `listPendingDraftSummaries({ status: "failed" })`: returns only `failed`.
- `listPendingDraftSummaries({ status: "all" })`: same as no filter.
- Each summary contains: `id`, `status` (`"preview_ready"` or `"failed"`), `createdAt` (ISO string), `fileName` (from associated `UploadedDocument`), and `errorMessage` (present for failed drafts when `AiExtractionRun.errorMessage` or validation error is available; absent for ready drafts).
- Pagination: `limit`/`offset` trim the filtered, ordered result.
- Empty array when no pending drafts exist.

**Assertion sketch (inputs / expected outputs):**
- Seed `preview_ready` draft + unrelated `imported` draft → list with `status: "all"` returns only the ready one.
- Seed `failed` draft with `AiExtractionRun.errorMessage = "No se pudo validar"` → `errorMessage` field is present.
- Seed `failed` draft with no error → `errorMessage` absent.
- `limit: 1` with 2 results → array of length 1.
- `offset: 1` with 2 results → array of length 1 (second item).

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-list.test.ts`
Expected: `Error: cannot find module '../src/modules/cards/cards.service.js'` (service method not yet implemented) or similar test failure.

---

- [ ] **Step 1.2: Write failing API contract test for `GET /api/card-statements/drafts`**

In `workspace/backend/tests/cards/drafts-list.test.ts` (or a new `*.http.test.ts` file if the project uses route-level integration tests).

**What to test:**
- `GET /api/card-statements/drafts` with no query → 200, bare array of summaries.
- `GET /api/card-statements/drafts?status=preview_ready` → 200, array of only ready summaries.
- `GET /api/card-statements/drafts?status=failed` → 200, array of only failed summaries.
- `GET /api/card-statements/drafts?limit=1&offset=0` → 200, first page of size 1.
- `GET /api/card-statements/drafts?limit=1&offset=1` → 200, second page.
- Invalid `status` value → 400 with validation error (Fastify/Zod convention).

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-list.test.ts`
Expected: `Error: route GET /api/card-statements/drafts not found` (route not yet registered).

---

- [ ] **Step 1.3: Add `cardStatementDraftSummarySchema` to `cards.schemas.ts`**

Add the Zod response schema (design.md has the exact shape):

```ts
export const cardStatementDraftSummarySchema = z.object({
  id: z.string(),
  status: z.enum(["preview_ready", "failed"]),
  createdAt: z.string(),
  fileName: z.string(),
  errorMessage: z.string().optional(),
});
```

No other schemas are added in this task.

Run: `cd workspace/backend && npx tsc --noEmit src/modules/cards/cards.schemas.ts`
Expected: exit 0, no new type errors.

---

- [ ] **Step 1.4: Add `listPendingDraftSummaries` to `cards.service.ts`**

Add to `CardsService`:

```ts
async listPendingDraftSummaries(input: {
  status?: "preview_ready" | "failed" | "all";
  limit?: number;
  offset?: number;
}): Promise<CardStatementDraftSummary[]> {
  // ...
}
```

**Responsibility:** Query `CardStatementDraft` filtered to `preview_ready` and `failed` only. Join `UploadedDocument` for `fileName`. Join `AiExtractionRun` for `errorMessage` (fall back to validation error if available). Map through `cardStatementDraftSummarySchema`. Apply `limit`/`offset` to the filtered result. Order by `createdAt` descending.

**Edge cases:**
- `status` omitted or `"all"`: include both `preview_ready` and `failed`.
- `status` = `"preview_ready"` or `"failed"`: strict filter.
- `limit` defaults to 50 if omitted; `offset` defaults to 0.
- `errorMessage`: prefer `AiExtractionRun.errorMessage`; fall back to the first `validationErrors` entry from the run if errorMessage is null.
- If no drafts match: return `[]`.

Run: `cd workspace/backend && npx tsc --noEmit src/modules/cards/cards.service.ts`
Expected: exit 0.

---

- [ ] **Step 1.5: Add controller handler and register route for `GET /api/card-statements/drafts`**

In `cards.controller.ts`, add:

```ts
app.get("/drafts", async (request, reply) => {
  const query = request.query as {
    status?: string;
    limit?: string;
    offset?: string;
  };
  const drafts = await cardsService.listPendingDraftSummaries({
    status: query.status as "preview_ready" | "failed" | "all" | undefined,
    limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
    offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
  });
  return reply.send(drafts);
});
```

Route registration is unchanged (the Fastify plugin prefix `/api/card-statements` already covers `/drafts`).

Run: `cd workspace/backend && npx tsc --noEmit src/modules/cards/cards.controller.ts`
Expected: exit 0.

---

- [ ] **Step 1.6: Run tests — Verify GREEN**

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-list.test.ts`
Expected: `0 failures`.

---

- [ ] **Step 1.7: Commit**

```bash
cd workspace/backend
git add src/modules/cards/cards.schemas.ts src/modules/cards/cards.service.ts src/modules/cards/cards.controller.ts tests/cards/drafts-list.test.ts
git commit -m "feat(cards): add GET /api/card-statements/drafts list endpoint

Implements FEAT-025 Task 1.
- Add cardStatementDraftSummarySchema (Zod)
- Add listPendingDraftSummaries in CardsService
- Add GET /drafts controller handler
- Add Vitest tests for service and API contract
- Covers: status filtering, pagination, summary projection, empty result"
```

---

## Task 2: Backend discard endpoint — `DELETE /api/card-statements/drafts/:draftId`

**Files:**
- `workspace/backend/src/modules/cards/cards.service.ts` — add `discardDraft` method
- `workspace/backend/src/modules/cards/cards.controller.ts` — add `DELETE /drafts/:draftId` handler
- `workspace/backend/tests/cards/drafts-discard.test.ts` — new test file

**Skills the Developer should look for:** anything for Fastify route/controller/service testing.

- [ ] **Step 2.1: Write failing cascade-discard service test**

Create `workspace/backend/tests/cards/drafts-discard.test.ts`.

**What to test:**
- Seed a `CardStatementDraft` (status `preview_ready` or `failed`) with nested `CardStatementDraftSection[]`, `CardStatementDraftGroup[]`, `CardStatementDraftRow[]`, and an associated `UploadedDocument`.
- Call `discardDraft(draftId)`.
- Assert the draft is deleted from `CardStatementDraft` table.
- Assert the `UploadedDocument` is deleted.
- Assert draft children (sections, groups, rows) are gone (existing Prisma cascades).
- Assert return value: `{ ok: true, deletedId: draftId }`.
- Assert 404 / not-found behavior when `draftId` does not resolve.

**Assertion sketch:**
- Seed document + draft with 2 sections, 3 groups, 10 rows → after discard, `findUnique` on draft returns `null`, `findUnique` on document returns `null`.
- `discardDraft(nonExistentId)` → throws `NotFoundError`.

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-discard.test.ts`
Expected: `Error: cannot find module '../src/modules/cards/cards.service.js'` (method not yet implemented).

---

- [ ] **Step 2.2: Write failing API contract test for `DELETE /api/card-statements/drafts/:draftId`**

In `workspace/backend/tests/cards/drafts-discard.test.ts` (same file or separate — Vitest supports both).

**What to test:**
- `DELETE /api/card-statements/drafts/:draftId` → 200 with `{ ok: true, deletedId }`.
- `DELETE /api/card-statements/drafts/:nonExistentId` → 404 with existing error convention.

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-discard.test.ts`
Expected: `Error: route DELETE /api/card-statements/drafts/:draftId not found`.

---

- [ ] **Step 2.3: Add `discardDraft` to `cards.service.ts`**

Add to `CardsService`:

```ts
async discardDraft(draftId: string): Promise<{ ok: true; deletedId: string }> {
  // Resolve the draft; throw NotFoundError if not found
  // In a transaction:
  //   1. Delete the UploadedDocument (cascade removes draft children via existing Prisma relations)
  //   2. Delete the CardStatementDraft
  // Return { ok: true, deletedId: draftId }
}
```

**Responsibility:** Delete the `CardStatementDraft` and its associated `UploadedDocument` in a single Prisma transaction. Use existing Prisma cascade relations for draft sections/groups/rows (no manual deletes needed for children). Throw `NotFoundError` if the draft does not exist.

**Edge cases:**
- Draft exists but is in a non-terminal status (e.g., `processing`): FEAT-025 panel never shows it, but the endpoint should still delete it if called directly (no status gate in the discard service — the list endpoint is what filters).
- `draftId` not found → `NotFoundError`.

Run: `cd workspace/backend && npx tsc --noEmit src/modules/cards/cards.service.ts`
Expected: exit 0.

---

- [ ] **Step 2.4: Add controller handler for `DELETE /api/card-statements/drafts/:draftId`**

In `cards.controller.ts`, add:

```ts
app.delete("/drafts/:draftId", async (request, reply) => {
  const params = request.params as { draftId: string };
  const result = await cardsService.discardDraft(params.draftId);
  return reply.send(result);
});
```

Run: `cd workspace/backend && npx tsc --noEmit src/modules/cards/cards.controller.ts`
Expected: exit 0.

---

- [ ] **Step 2.5: Run tests — Verify GREEN**

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-discard.test.ts`
Expected: `0 failures`.

---

- [ ] **Step 2.6: Add regression test for existing draft endpoints**

Extend the test file to verify that after adding the two new routes, the existing `GET /drafts/:draftId`, `PUT /drafts/:draftId`, and `POST /drafts/:draftId/accept` endpoints still work correctly. This is a sanity check that route registration did not break existing paths.

Run: `cd workspace/backend && npm run test -- tests/cards/drafts-discard.test.ts`
Expected: `0 failures`.

---

- [ ] **Step 2.7: Commit**

```bash
cd workspace/backend
git add src/modules/cards/cards.service.ts src/modules/cards/cards.controller.ts tests/cards/drafts-discard.test.ts
git commit -m "feat(cards): add DELETE /api/card-statements/drafts/:draftId

Implements FEAT-025 Task 2.
- Add discardDraft in CardsService (cascade delete draft + document)
- Add DELETE /drafts/:draftId controller handler
- Add Vitest tests for cascade discard and API contract
- Add regression sanity for existing draft endpoints"
```

---

## Task 3: Frontend API functions and `PendingDraftsPanel`

**Files:**
- `workspace/frontend/src/lib/finance/card-statements-api.ts` — add `listCardStatementDrafts`, `discardCardStatementDraft`, and the `CardStatementDraftSummary` type
- `workspace/frontend/tests/drafts-pending.spec.ts` — new Playwright test file (FEAT-025 scenarios)

**Skills the Developer should look for:** anything for REST API client testing, anything for React component testing.

### Sub-task 3A: Frontend API functions

- [ ] **Step 3A.1: Write failing client contract tests for `listCardStatementDrafts` and `discardCardStatementDraft`**

Create `workspace/frontend/tests/drafts-pending.spec.ts`. This file will hold Playwright E2E tests for the full FEAT-025 flow. For now, write tests that exercise the API layer directly (mocked fetch or direct API calls against the running backend).

**What to test for `listCardStatementDrafts`:**
- `listCardStatementDrafts({})` → `GET /api/card-statements/drafts` → `CardStatementDraftSummary[]`.
- `listCardStatementDrafts({ status: "preview_ready" })` → query includes `?status=preview_ready`.
- `listCardStatementDrafts({ status: "failed" })` → query includes `?status=failed`.
- `listCardStatementDrafts({ limit: 1, offset: 0 })` → query includes `limit=1&offset=0`.
- Empty response → `[]`.
- Each summary has shape: `{ id, status: "preview_ready"|"failed", createdAt, fileName, errorMessage?: string }`.

**What to test for `discardCardStatementDraft`:**
- `discardCardStatementDraft("draft-id")` → `DELETE /api/card-statements/drafts/draft-id` → `{ ok: true, deletedId: "draft-id" }`.
- 404 response → throws `CardStatementsApiError` with status 404.

**Assertion sketch:**
- `listCardStatementDrafts({})` with seeded `preview_ready` + `failed` drafts → response length = 2, both statuses present.
- `discardCardStatementDraft("id-that-exists")` → response.`ok` === true, response.`deletedId` === input id.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `Error: listCardStatementDrafts is not a function` (function not yet exported).

---

- [ ] **Step 3A.2: Add `CardStatementDraftSummary` type and `listCardStatementDrafts` + `discardCardStatementDraft` to `card-statements-api.ts`**

Add the type:

```ts
export type CardStatementDraftSummary = {
  id: string;
  status: "preview_ready" | "failed";
  createdAt: string;
  fileName: string;
  errorMessage?: string;
};
```

Add the functions:

```ts
export async function listCardStatementDrafts(input?: {
  status?: "preview_ready" | "failed" | "all";
  limit?: number;
  offset?: number;
}): Promise<CardStatementDraftSummary[]> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.limit !== undefined) params.set("limit", String(input.limit));
  if (input?.offset !== undefined) params.set("offset", String(input.offset));
  const qs = params.toString();
  const url = `${API_BASE_URL}/api/card-statements/drafts${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  return handleResponse<CardStatementDraftSummary[]>(response);
}

export async function discardCardStatementDraft(
  draftId: string,
): Promise<{ ok: true; deletedId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
    { method: "DELETE" },
  );
  return handleResponse<{ ok: true; deletedId: string }>(response);
}
```

**Responsibility:** `listCardStatementDrafts` fetches the summary list with optional status filter and pagination. `discardCardStatementDraft` sends DELETE and returns the server response. Both reuse `handleResponse` for error parsing. Existing exports (`getCardStatementDraft`, `acceptCardStatementDraft`) remain unchanged.

Run: `cd workspace/frontend && npx tsc --noEmit src/lib/finance/card-statements-api.ts`
Expected: exit 0.

---

- [ ] **Step 3A.3: Run Playwright tests — Verify GREEN**

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

### Sub-task 3B: `PendingDraftsPanel` component

- [ ] **Step 3B.1: Write failing Playwright tests for `PendingDraftsPanel` behavior**

Extend `workspace/frontend/tests/drafts-pending.spec.ts` with scenarios that exercise the panel:

**Scenario: Panel lists preview_ready and failed drafts**
- Seed `preview_ready` draft + `failed` draft.
- Navigate to Import Center.
- Panel renders both drafts with correct status badges.
- Each shows `fileName` and `createdAt`.

**Scenario: Failed draft shows error reason and only Discard**
- Seed `failed` draft with `errorMessage`.
- Open panel → draft appears with error reason visible.
- "Aceptar" button absent.
- "Ver" button absent.
- "Descartar" button present.

**Scenario: preview_ready draft shows all three actions**
- Seed `preview_ready` draft.
- Open panel → "Aceptar", "Ver", "Descartar" all present.
- "Aceptar" and "Ver" absent on failed items.

**Scenario: Empty state**
- No pending drafts → panel shows "No hay borradores pendientes".

**Assertion sketch:**
- `preview_ready` item: 3 action buttons visible.
- `failed` item: 1 action button ("Descartar") visible.
- Empty panel: text "No hay borradores pendientes" in panel.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `Error: PendingDraftsPanel is not defined` (component not yet created).

---

- [ ] **Step 3B.2: Implement `PendingDraftsPanel` in `importaciones-section.legacy.tsx`**

The component is rendered **above** the existing "Historial" card. Key implementation points:

**File:** `workspace/frontend/src/components/finance/sections/importaciones-section.legacy.tsx`

**Structure:**
```
PendingDraftsPanel
├── "Borradores pendientes" heading
├── Loading state (while listCardStatementDrafts fetches)
├── Error state (if fetch throws)
├── Empty state: "No hay borradores pendientes"
└── Draft items map (sorted by createdAt desc)
    └── DraftItem
        ├── fileName + createdAt + status badge
        ├── errorMessage (if failed and present)
        ├── [Aceptar] button (only if status === "preview_ready")
        ├── [Ver] button (only if status === "preview_ready")
        └── [Descartar] button (both statuses)
```

**`Aceptar` flow:** `getCardStatementDraft(draftId)` → extract `preview` from response → `acceptCardStatementDraft(draftId, preview)` → reload list on success.

**`Ver` flow:** `setPendingCardStatementDraft(draftId)` → `useFinanceUI.setSection("tarjetas")`.

**`Descartar` flow:** Opens `AlertDialog` (Spanish copy). On confirm → `discardCardStatementDraft(draftId)` → reload list. On cancel → close only.

**State:** `useState<CardStatementDraftSummary[]>` for the list; `useState<boolean>` for loading; `useState<string|null>` for error. No optimistic removal — always reload from server after mutation.

**Imports needed:** `listCardStatementDrafts`, `discardCardStatementDraft`, `getCardStatementDraft`, `acceptCardStatementDraft` from `card-statements-api`; `AlertDialog` from `components/ui/alert-dialog` (shadcn); `setPendingCardStatementDraft` from `ui-store`.

Run: `cd workspace/frontend && npx tsc --noEmit src/components/finance/sections/importaciones-section.legacy.tsx`
Expected: exit 0.

---

- [ ] **Step 3B.3: Run Playwright tests — Verify GREEN**

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 3B.4: Commit**

```bash
cd workspace/frontend
git add src/lib/finance/card-statements-api.ts src/components/finance/sections/importaciones-section.legacy.tsx tests/drafts-pending.spec.ts
git commit -m "feat(frontend): add PendingDraftsPanel and draft API clients

Implements FEAT-025 Task 3.
- Add listCardStatementDrafts and discardCardStatementDraft to card-statements-api.ts
- Add CardStatementDraftSummary type
- Add PendingDraftsPanel above Historial card in importaciones-section.legacy.tsx
- Aceptar: load draft + existing accept flow + reload list
- Ver: setPendingCardStatementDraft + navigate to tarjetas
- Descartar: AlertDialog confirmation + discard + reload list
- Add Playwright tests for panel visibility, action rendering, empty state"
```

---

## Task 4: Discard confirmation modal — `AlertDialog` behavior

**Files:**
- `workspace/frontend/src/components/finance/sections/importaciones-section.legacy.tsx` — the `AlertDialog` usage in `PendingDraftsPanel` (implemented in Task 3)

**Skills the Developer should look for:** anything for shadcn AlertDialog usage, anything for modal confirmation UX testing.

- [ ] **Step 4.1: Write failing Playwright tests for AlertDialog behavior**

Extend `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: Discard confirmation modal appears**
- Click "Descartar" on a draft.
- Spanish `AlertDialog` appears with descriptive copy (mentions the draft and document will be deleted).
- Modal is visible (not dismissed by mistake).

**Scenario: Cancel sends no request**
- Open discard modal.
- Click cancel / "Cancelar" button.
- No DELETE request sent.
- Draft still present in list.

**Scenario: Confirm sends exactly one DELETE**
- Open discard modal for draft with ID `draft-id`.
- Click confirm / "Descartar" button.
- Exactly one `DELETE /api/card-statements/drafts/draft-id` request is made.
- Draft disappears from panel after reload.

**Scenario: Failed discard does not optimistically remove item**
- Mock `discardCardStatementDraft` to throw a network error.
- Confirm discard.
- Modal closes (or shows error), draft still visible in list.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `Error: AlertDialog is not defined` (AlertDialog usage not yet in the panel).

---

- [ ] **Step 4.2: Verify AlertDialog is correctly wired in `PendingDraftsPanel`**

Confirm the `PendingDraftsPanel` implementation (from Task 3) uses the existing shadcn `AlertDialog` component with Spanish copy. The component tree should be:

- `AlertDialog` (root)
  - `AlertDialogTrigger` — the "Descartar" `Button`
  - `AlertDialogContent`
    - `AlertDialogHeader`
      - `AlertDialogTitle` — e.g., "¿Descartar este borrador?"
      - `AlertDialogDescription` — explains draft + document deletion
    - `AlertDialogFooter`
      - `AlertDialogCancel` — "Cancelar" (no request on click)
      - `AlertDialogAction` — "Descartar" (calls `discardCardStatementDraft`, then reloads list)

Spanish copy requirement: the dialog title and description must be in Spanish, explaining that the draft and its associated uploaded document will be permanently deleted.

Run: `cd workspace/frontend && npx tsc --noEmit src/components/finance/sections/importaciones-section.legacy.tsx`
Expected: exit 0.

---

- [ ] **Step 4.3: Run Playwright tests — Verify GREEN**

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 4.4: Commit**

```bash
cd workspace/frontend
git add src/components/finance/sections/importaciones-section.legacy.tsx
git commit -m "feat(frontend): wire AlertDialog confirmation to discard action

Implements FEAT-025 Task 4.
- AlertDialog Spanish copy explains draft + document deletion
- Cancel: no request, dialog closes
- Confirm: single DELETE request, reload list on success
- Failed DELETE: dialog closes, item remains visible (no optimistic removal)
- Playwright tests: modal appearance, cancel-without-request, confirm-once"
```

---

## Task 5: Zustand handoff and TarjetasSection boot effect

**Files:**
- `workspace/frontend/src/lib/finance/ui-store.ts` — add `pendingCardStatementDraftId`, `setPendingCardStatementDraft`, `clearPendingCardStatementDraft`
- `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx` — extend boot effect to consume pending draft ID
- `workspace/frontend/tests/drafts-pending.spec.ts` — extend Playwright tests

**Skills the Developer should look for:** anything for Zustand store testing, anything for React useEffect/boot sequence testing.

- [ ] **Step 5.1: Write failing Zustand store tests for pending draft state**

In `workspace/frontend/tests/drafts-pending.spec.ts` (or a unit test file for the store if the project has `*.store.test.ts` patterns).

**What to test:**
- Initial `pendingCardStatementDraftId` is `null`.
- `setPendingCardStatementDraft("draft-abc")` stores `"draft-abc"` in `pendingCardStatementDraftId`.
- `clearPendingCardStatementDraft()` resets `pendingCardStatementDraftId` to `null`.
- `setSection("tarjetas")` does not modify `pendingCardStatementDraftId`.
- Calling `setPendingCardStatementDraft` twice with different IDs overwrites (no queue).

**Assertion sketch:**
```ts
const store = createStore(); // or however the test accesses the Zustand store
expect(store.getState().pendingCardStatementDraftId).toBe(null);
store.getState().setPendingCardStatementDraft("id-1");
expect(store.getState().pendingCardStatementDraftId).toBe("id-1");
store.getState().clearPendingCardStatementDraft();
expect(store.getState().pendingCardStatementDraftId).toBe(null);
```

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts` (if E2E) or the unit test command if a store test file exists.
Expected: `Error: pendingCardStatementDraftId is not a property of FinanceUIState`.

---

- [ ] **Step 5.2: Extend `FinanceUIState` in `ui-store.ts`**

Add to the `FinanceUIState` interface and the Zustand store:

```ts
// In interface:
pendingCardStatementDraftId: string | null;
setPendingCardStatementDraft: (id: string) => void;
clearPendingCardStatementDraft: () => void;

// In the create() call:
pendingCardStatementDraftId: null,
setPendingCardStatementDraft: (id) => set({ pendingCardStatementDraftId: id }),
clearPendingCardStatementDraft: () => set({ pendingCardStatementDraftId: null }),
```

The `setSection` and other existing actions must not reset `pendingCardStatementDraftId` to `null` — only the explicit clearer does. The boot effect in `TarjetasSection` is the sole consumer that clears it after use.

Run: `cd workspace/frontend && npx tsc --noEmit src/lib/finance/ui-store.ts`
Expected: exit 0.

---

- [ ] **Step 5.3: Write failing Playwright test for "Ver" handoff**

Extend `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: Viewing a preview_ready draft opens it in the Cards section**
- Seed a `preview_ready` draft.
- Open Import Center panel.
- Click "Ver" on the draft.
- Assert `pendingCardStatementDraftId` is set in the store.
- Assert `useFinanceUI.section` is `"tarjetas"`.
- Wait for Tarjetas section to finish booting.
- Assert the draft preview is loaded (preview state visible).
- Assert `uiState === "preview"`.
- Assert `pendingCardStatementDraftId` is `null` after preview applied.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `Error: pendingCardStatementDraftId is not a property of FinanceUIState` (store not yet extended) or `Error: setPendingCardStatementDraft is not a function`.

---

- [ ] **Step 5.4: Wire "Ver" in `PendingDraftsPanel`**

In `PendingDraftsPanel` (Task 3), update the "Ver" button handler:

```ts
onClick={() => {
  setPendingCardStatementDraft(draft.id);
  useFinanceUI.setSection("tarjetas");
}}
```

Import `setPendingCardStatementDraft` from `ui-store`. Import `useFinanceUI` for `setSection`.

Run: `cd workspace/frontend && npx tsc --noEmit src/components/finance/sections/importaciones-section.legacy.tsx`
Expected: exit 0.

---

- [ ] **Step 5.5: Write failing `TarjetasSection` boot test for pending draft consumption**

In `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: TarjetasSection loads pending draft on boot**
- Set `pendingCardStatementDraftId` to a seeded `preview_ready` draft ID before navigating to `tarjetas`.
- Navigate to `tarjetas` section.
- Assert the boot `Promise.all` completes.
- Assert `getCardStatementDraft(draftId)` was called.
- Assert preview state is populated (UI shows preview, not empty state).
- Assert `uiState` is `"preview"` (editable mode).
- Assert `pendingCardStatementDraftId` is `null` after preview applied.

**Scenario: Normal boot when no pending draft**
- `pendingCardStatementDraftId` is `null`.
- Navigate to `tarjetas`.
- Assert existing boot behavior is unchanged (polling, upload state, etc.).

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `Error: setPendingCardStatementDraft is not a function` or `Error: pendingCardStatementDraftId is not a property` (store not yet extended).

---

- [ ] **Step 5.6: Extend `TarjetasSection` boot effect**

In `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx`, find the existing boot `useEffect` (the one that runs `Promise.all` on mount). After the `Promise.all` resolves, add a check:

```ts
// After existing boot Promise.all:
const pendingDraftId = useFinanceUI.getState().pendingCardStatementDraftId;
if (pendingDraftId) {
  const draft = await getCardStatementDraft(pendingDraftId);
  // Apply draft.preview to the existing Cards preview state
  // Set uiState to "preview" (editable mode)
  useFinanceUI.getState().clearPendingCardStatementDraft();
}
```

**Responsibility:** Read `pendingCardStatementDraftId` after existing boot requests complete. If present, call `getCardStatementDraft(id)`, apply the `preview` to the existing Cards preview state (the same state mutation the polling result uses), set `uiState = "preview"`, then call `clearPendingCardStatementDraft()`.

**Edge cases:**
- `pendingCardStatementDraftId` is `null` → no-op; existing boot behavior unchanged.
- `getCardStatementDraft` throws → the existing error surface handles it; the handoff entry is still cleared.
- Boot effect runs twice in StrictMode → same behavior (idempotent: if already cleared, the second run is a no-op).

Run: `cd workspace/frontend && npx tsc --noEmit src/components/finance/sections/tarjetas-section.tsx`
Expected: exit 0.

---

- [ ] **Step 5.7: Run Playwright tests — Verify GREEN**

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 5.8: Commit**

```bash
cd workspace/frontend
git add src/lib/finance/ui-store.ts src/components/finance/sections/tarjetas-section.tsx
git commit -m "feat(frontend): add pending draft Zustand handoff and TarjetasSection boot effect

Implements FEAT-025 Task 5.
- FinanceUIState: add pendingCardStatementDraftId, setPendingCardStatementDraft, clearPendingCardStatementDraft
- PendingDraftsPanel: wire Ver button to setPendingCardStatementDraft + setSection(tarjetas)
- TarjetasSection boot: consume pending draft ID, load preview, enter editable preview mode, clear handoff
- Playwright tests: Zustand state, Ver handoff, TarjetasSection draft loading, normal boot regression"
```

---

## Task 6: Integrated behavior, regression, and verification

**Files:**
- `workspace/backend/tests/cards/drafts-list.test.ts` — already created in Task 1
- `workspace/backend/tests/cards/drafts-discard.test.ts` — already created in Task 2
- `workspace/frontend/tests/drafts-pending.spec.ts` — already created in Tasks 3-5
- `workspace/frontend/tests/import-center.spec.ts` — extend with regression scenarios

**Skills the Developer should look for:** anything for Playwright E2E scenario testing, anything for Vitest integration testing.

- [ ] **Step 6.1: Add integrated acceptance test**

In `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: Accepting a preview_ready draft creates a CardStatement**
- Seed `preview_ready` draft.
- Open panel.
- Click "Aceptar".
- Assert `CardStatement` was created in DB (via API or DB check).
- Reload panel → draft no longer listed.

**Assertion sketch:**
- `CardStatement.count({ where: { draftId } })` === 1 after accept.
- `CardStatementDraft.findUnique({ where: { id: draftId } })` === null (deleted on accept) or `status === "accepted"` (depends on existing accept behavior — follow it).

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 6.2: Add integrated view test**

In `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: Viewing a preview_ready draft opens it in the Cards section**
- Seed `preview_ready` draft.
- Open panel.
- Click "Ver".
- Cards section opens with draft preview loaded in editable mode.
- Zustand handoff cleared after preview applied.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 6.3: Add integrated confirmed-discard test**

In `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: Confirmed discard deletes draft and document**
- Seed `preview_ready` draft.
- Open panel.
- Click "Descartar".
- Confirm in AlertDialog.
- Assert DELETE request sent.
- Assert draft gone from DB (cascade deleted document + children).
- Reload panel → draft absent.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 6.4: Add integrated failed-draft test**

In `workspace/frontend/tests/drafts-pending.spec.ts`.

**Scenario: A failed draft shows error reason and offers discard action**
- Seed `failed` draft with error reason.
- Open panel.
- Draft appears with error reason visible.
- "Aceptar" and "Ver" absent.
- "Descartar" present and functional.

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

---

- [ ] **Step 6.5: Add Import Center regression test**

In `workspace/frontend/tests/import-center.spec.ts`, extend existing tests.

**What to test:**
- Existing "Historial" card still renders below the new `PendingDraftsPanel`.
- Existing import detail interactions (ver detalle, abrir en tarjetas from the history list) still work.
- Panel does not break existing Import Center layout.

Run: `cd workspace/frontend && npx playwright test import-center.spec.ts`
Expected: `0 failures` (no regressions in existing Import Center behavior).

---

- [ ] **Step 6.6: Add card-statement acceptance regression test**

In `workspace/backend/tests/cards/cards.controller.accept.test.ts` (or extend the existing accept test file).

**What to test:**
- FEAT-001 import/accept flow still works (upload → draft → accept creates CardStatement).
- FEAT-024 period normalization still applies on accept.

Run: `cd workspace/backend && npm run test -- tests/cards/cards.controller.accept.test.ts`
Expected: `0 failures`.

---

- [ ] **Step 6.7: Commit integration and regression tests**

```bash
cd workspace/frontend
git add tests/drafts-pending.spec.ts tests/import-center.spec.ts
git commit -m "test(frontend): add FEAT-025 integrated E2E scenarios and regression tests

Implements FEAT-025 Task 6.
- Accept: draft → CardStatement created, draft disappears from panel
- View: Ver → Cards section opens draft in editable preview
- Discard: confirmed → cascade deletes draft, document, children
- Failed draft: error reason visible, only Discard action
- Regression: Import Center Historial card still works
- Regression: existing accept flow (FEAT-001) and period normalization (FEAT-024)"
```

---

## Task 7: Verification

### Task 7: Verification (run by the Developer)

- [ ] **Step 7.1: Linter**

Run: `cd workspace/backend && npm run lint` (or `npm run lint --if-present`; verify the correct lint command in the package.json scripts)
Expected: exit 0, 0 errors.

If `npm run lint` is not configured in the backend, skip this step and note it in `implementation_report.md`.

Run: `cd workspace/frontend && npm run lint` (or equivalent)
Expected: exit 0, 0 errors.

---

- [ ] **Step 7.2: Formatter check**

Run: `cd workspace/backend && npx prettier --check src/modules/cards/` (if prettier is configured)
Expected: exit 0 (no files would be reformatted).

Run: `cd workspace/frontend && npx prettier --check src/lib/finance/card-statements-api.ts src/lib/finance/ui-store.ts src/components/finance/sections/`
Expected: exit 0 (no files would be reformatted).

---

- [ ] **Step 7.3: Type checker**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

Run: `cd workspace/frontend && npm run typecheck` (or `npx tsc --noEmit`)
Expected: exit 0, 0 errors.

---

- [ ] **Step 7.4: Backend unit tests**

Run: `cd workspace/backend && npm run test`
Expected: `0 failures`, `0 errors`. No skipped tests except those explicitly marked.

---

- [ ] **Step 7.5: Frontend Playwright tests**

Run: `cd workspace/frontend && npx playwright test drafts-pending.spec.ts`
Expected: `0 failures`.

Run: `cd workspace/frontend && npx playwright test import-center.spec.ts` (regression)
Expected: `0 failures`.

---

- [ ] **Step 7.6: Confirm scenario coverage**

For every FEAT-025 scenario, document the test file and line number(s) covering it in `specs/003-revisar-drafts-pendientes/implementation_report.md`. Missing coverage is a verification failure even if every gate is green.

| Scenario | Test file | Coverage |
|---|---|---|
| Panel lists preview_ready and failed drafts | `drafts-pending.spec.ts` | ✅ |
| Accepting a preview_ready draft creates a CardStatement | `drafts-pending.spec.ts` | ✅ |
| Viewing a preview_ready draft opens Cards preview | `drafts-pending.spec.ts` | ✅ |
| Requesting discard shows confirmation modal | `drafts-pending.spec.ts` | ✅ |
| Confirmed discard deletes draft and document | `drafts-pending.spec.ts` | ✅ |
| Failed draft shows error reason and discard action | `drafts-pending.spec.ts` | ✅ |

---

### Task 8: Tester handoff (run by the Tester, not the Developer)

The Developer lists the following gates in `## Test run evidence -> Deferred to the Tester` of `implementation_report.md`. The Tester runs them in `IADEV-validating-implementation` Pass 2.

| Gate | Configured? | Command the Tester should run |
|---|---|---|
| Backend integration tests (cards module) | yes | `cd workspace/backend && npm run test -- tests/cards/` |
| E2E full FEAT-025 scenario suite | yes | `cd workspace/frontend && npx playwright test drafts-pending.spec.ts` |
| Frontend build | yes | `cd workspace/frontend && npm run build` |
| Backend build | yes | `cd workspace/backend && npm run build` |
| Import Center regression suite | yes | `cd workspace/frontend && npx playwright test import-center.spec.ts` |
| Pre-commit / pre-push hooks | no | Not configured in this project |

---

## Feature -> task index (summary)

| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-025 | Revisar drafts pendientes | Task 1 (backend list), Task 2 (backend discard), Task 3 (frontend API + panel), Task 4 (discard modal), Task 5 (Zustand + TarjetasSection handoff), Task 7 (Verification), Task 8 (Tester handoff) |
