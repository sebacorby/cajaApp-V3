# Design: 003-revisar-drafts-pendientes

This document records the resolved technical plan for FEAT-025. The change extends the existing full-stack architecture and introduces no package, deployment, authentication, or database-schema changes.

## Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Frontend — Next.js / React                                                  │
│                                                                            │
│ importaciones-section.legacy.tsx                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ PendingDraftsPanel                                                     │ │
│ │ • GET pending summaries                                               │ │
│ │ • Aceptar → existing accept client                                    │ │
│ │ • Ver → Zustand handoff → Tarjetas                                    │ │
│ │ • Descartar → shadcn AlertDialog → DELETE                             │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                       │ REST                                                │
│                       ▼                                                     │
│ card-statements-api.ts                                                      │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ HTTP/JSON
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Backend — Fastify cards/ module                                             │
│                                                                            │
│ GET    /api/card-statements/drafts                                          │
│ DELETE /api/card-statements/drafts/:draftId                                 │
│ GET    /api/card-statements/drafts/:draftId          (existing)             │
│ PUT    /api/card-statements/drafts/:draftId          (existing)             │
│ POST   /api/card-statements/drafts/:draftId/accept   (existing)             │
│                                │                                            │
│                                ▼                                            │
│ Prisma / SQLite — existing CardStatementDraft and UploadedDocument models   │
└────────────────────────────────────────────────────────────────────────────┘

View handoff:

PendingDraftsPanel
  → setPendingCardStatementDraft(draftId)
  → setSection("tarjetas")
  → TarjetasSection finishes existing boot Promise.all
  → getCardStatementDraft(draftId)
  → apply existing editable preview
  → uiState = "preview"
  → clearPendingCardStatementDraft()
```

| Architecture aspect | Resolved choice | Rationale |
|---|---|---|
| Runtime | Existing Node.js 24.18 / TypeScript full-stack runtime | The change extends existing code only. |
| Backend framework | Existing Fastify `cards/` module | All card-statement draft routes already live under `/api/card-statements`. |
| Frontend framework | Existing Next.js 16 / React 19 application | The panel extends an existing client section. |
| Communication | Existing REST/HTTP JSON API | Both new operations are card-statement resources alongside existing REST routes. |
| Persistence | Existing Prisma 6 / SQLite models and cascades | The required draft/document relationships already exist; no migration is allowed. |
| Cross-section state | Existing Zustand `FinanceUIState` | A one-shot draft ID must cross from Import Center to Cards without a new route or duplicate screen. |
| Authentication | Existing single-user, no-auth behavior | The feature introduces no auth or authorization change. |
| Deployment | Existing CajaApp frontend/backend deployment | No deployment target or runtime change is required. |

## Data

### Persistence model

No table, column, relation, index, or migration is added. The change reuses:

```prisma
// Existing logical relations; schema remains unchanged.
UploadedDocument
  └── CardStatementDraft
        ├── CardStatementDraftSection[]
        ├── CardStatementDraftGroup[]
        └── CardStatementDraftRow[]
```

| Existing entity | Read/write usage in FEAT-025 |
|---|---|
| `CardStatementDraft` | Read pending summaries; resolve detail; accept through the existing flow; delete on discard. |
| `UploadedDocument` | Read `fileName`; delete with a discarded draft. |
| Draft section/group/row records | Read by the existing detail/accept flow; removed by existing cascade relations. |
| `AiExtractionRun` / validation output | Supply the visible error reason for a failed draft. |
| `CardStatement` | Created only by the existing accept flow; list and discard do not create one. |

### API data contract

```ts
type CardStatementDraftListStatus = "preview_ready" | "failed" | "all";

type CardStatementDraftSummary = {
  id: string;
  status: "preview_ready" | "failed";
  createdAt: string;
  fileName: string;
  errorMessage?: string;
};

type ListCardStatementDraftsInput = {
  status?: CardStatementDraftListStatus;
  limit?: number;
  offset?: number;
};

type DiscardCardStatementDraftResponse = {
  ok: true;
  deletedId: string;
};
```

The new Zod response schema is the logical equivalent of:

```ts
const cardStatementDraftSummarySchema = z.object({
  id: z.string(),
  status: z.enum(["preview_ready", "failed"]),
  createdAt: z.string(),
  fileName: z.string(),
  errorMessage: z.string().optional(),
});
```

Acceptance continues to use the existing `cardStatementPreviewSchema`; no second preview or acceptance schema is added.

### UI state contract

```ts
type FinanceUIStateExtension = {
  pendingCardStatementDraftId: string | null;
  setPendingCardStatementDraft: (id: string) => void;
  clearPendingCardStatementDraft: () => void;
};
```

| State | Producer | Consumer | Clear point |
|---|---|---|---|
| `pendingCardStatementDraftId = null` | Store initialization or `clearPendingCardStatementDraft()` | Import Center and Cards | N/A |
| `pendingCardStatementDraftId = draftId` | “Ver” in `PendingDraftsPanel` | `TarjetasSection` boot effect | After the selected preview is applied and editable preview mode is entered. |

No cache, local-storage, URL, or database representation is introduced for this transient handoff.

## Dependencies

No package is added, removed, swapped, or upgraded. The change keeps only already-installed packages that its implementation touches.

| Package | Action | Rationale |
|---|---|---|
| `fastify` | keep | Existing HTTP framework for the two new `cards/` routes. |
| `@prisma/client` | keep | Existing access layer for draft listing and cascaded discard. |
| `zod` | keep | Existing schema validation; used by `cardStatementDraftSummarySchema` and the reused preview schema. |
| `next` | keep | Existing frontend application framework hosting both sections. |
| `react` | keep | Existing component and boot-effect runtime. |
| `zustand` | keep | User selected the existing Finance UI store for the cross-section draft handoff. |
| `@radix-ui/react-alert-dialog` | keep | Already-installed primitive behind the selected shadcn `AlertDialog`. |
| `vitest` | keep | Existing backend test runner for service and API contract coverage. |
| `@playwright/test` | keep | Existing frontend E2E runner for FEAT-025 scenarios. |

## Tooling

| Concern | Existing tool | Change |
|---|---|---|
| Backend build/type checking | TypeScript `tsc` through `npm run build` | Keep unchanged. |
| Backend tests | Vitest through `npm run test` | Add targeted cards-module tests. |
| Frontend type checking | TypeScript through `npm run typecheck` | Keep unchanged. |
| Frontend linting | ESLint through `npm run lint` | Keep unchanged. |
| Frontend build | Next.js through `npm run build` | Keep unchanged. |
| Frontend behavioral tests | Playwright | Add FEAT-025 coverage. |
| Formatting | Existing repository convention | No formatter package or configuration change. |

## Interface

| Method | Path | Auth | Request | Response | Status in this change |
|---|---|---|---|---|---|
| `GET` | `/api/card-statements/drafts` | Existing no-auth behavior | Optional `status`, `limit`, `offset` query | `CardStatementDraftSummary[]` | New |
| `DELETE` | `/api/card-statements/drafts/:draftId` | Existing no-auth behavior | `draftId` path parameter | `{ ok: true, deletedId }` | New |
| `GET` | `/api/card-statements/drafts/:draftId` | Existing no-auth behavior | `draftId` path parameter | Existing full draft/preview contract | Reuse unchanged |
| `PUT` | `/api/card-statements/drafts/:draftId` | Existing no-auth behavior | Existing editable preview payload | Existing updated draft contract | Reuse unchanged |
| `POST` | `/api/card-statements/drafts/:draftId/accept` | Existing no-auth behavior | Existing `cardStatementPreviewSchema` payload | Existing acceptance contract | Reuse unchanged |

### List sequence

```text
PendingDraftsPanel
  → listCardStatementDrafts({ status: "all", limit, offset })
  → GET /api/card-statements/drafts
  → cards controller validates query
  → cards service selects preview_ready/failed drafts and document metadata
  → map through cardStatementDraftSummarySchema
  → CardStatementDraftSummary[]
  → render ready and failed actions
```

### Accept sequence

```text
User selects “Aceptar” on preview_ready item
  → getCardStatementDraft(draftId)
  → take the existing preview payload from the detail response
  → acceptCardStatementDraft(draftId, preview)
  → POST /api/card-statements/drafts/:draftId/accept
  → existing cardStatementPreviewSchema validation and acceptance flow
  → reload pending list
```

### Discard sequence

```text
User selects “Descartar”
  → shadcn AlertDialog opens in Spanish
  → Cancel: close only; no request
  → Confirm: discardCardStatementDraft(draftId)
  → DELETE /api/card-statements/drafts/:draftId
  → cards service removes the associated document/draft graph via existing cascades
  → { ok: true, deletedId: draftId }
  → reload pending list
```

There is no optimistic deletion. After confirmation the dialog closes; if the request fails, the draft is not removed from local list state and the existing UI error surface reports the failure.

### View sequence

```text
User selects “Ver” on preview_ready item
  → setPendingCardStatementDraft(draftId)
  → setSection("tarjetas")
  → TarjetasSection completes existing boot Promise.all
  → read pendingCardStatementDraftId
  → getCardStatementDraft(draftId)
  → apply preview using existing Cards state
  → uiState = "preview" (editable)
  → clearPendingCardStatementDraft()
```

## State Transitions

| From | Action | To | Constraints |
|---|---|---|---|
| Draft `preview_ready` | Accept | Existing `CardStatement` created; draft no longer listed | Load the existing detail preview, then call the existing accept endpoint with `cardStatementPreviewSchema`; a stale second accept cannot create a duplicate statement. |
| Draft `preview_ready` | View | Draft remains `preview_ready`; Cards UI enters editable `preview` | The pending draft ID is handed off through Zustand and cleared after application. |
| Draft `preview_ready` | Confirm discard | Draft, uploaded document, and draft children deleted | Only explicit AlertDialog confirmation invokes DELETE. |
| Draft `failed` | Confirm discard | Draft, uploaded document, and draft children deleted | Accept and view controls are not available. |
| Either supported status | Cancel discard | No persistence or list change | No API request. |
| Either supported status | Discard request fails | Existing server state remains visible | No optimistic list removal. |

## Architecture Decisions

### Decision 1 — Add draft operations to the `cards/` module

| | |
|---|---|
| **Choice** | Add `GET /api/card-statements/drafts` and `DELETE /api/card-statements/drafts/:draftId` under the existing `cards/` module. |
| **Alternatives** | Extend the generic `DELETE /api/import-center/:kind/:id` surface. |
| **Rationale** | Draft detail, edit, and accept already belong to the card-statements resource. The resolved endpoint contract keeps all lifecycle operations together. |

### Decision 2 — Use a dedicated summary contract

| | |
|---|---|
| **Choice** | Return `CardStatementDraftSummary[]` and add `cardStatementDraftSummarySchema`. |
| **Alternatives** | Reuse the generic Import Center item/detail response or return full editable previews in the list. |
| **Rationale** | The panel needs only identity, status, timestamp, filename, and failure reason. Full previews remain behind the existing detail endpoint. |

### Decision 3 — Reuse existing detail and acceptance flows

| | |
|---|---|
| **Choice** | Keep `getCardStatementDraft`, `acceptCardStatementDraft`, and `cardStatementPreviewSchema` as the only detail/acceptance contracts. |
| **Alternatives** | Add panel-specific detail or accept endpoints and duplicate schemas. |
| **Rationale** | FEAT-025 changes draft discovery and navigation, not preview editing or statement creation semantics. |

### Decision 4 — Use a one-shot Zustand handoff for “Ver”

| | |
|---|---|
| **Choice** | Add `pendingCardStatementDraftId` and setter/clearer actions to `FinanceUIState`; consume it after the existing Cards boot requests. |
| **Alternatives** | Add URL routing/query parameters, local storage, or duplicate the preview UI inside Import Center. |
| **Rationale** | The existing application navigates sections through `useFinanceUI.setSection`, and the requirement is to reuse the editable Cards preview. |

### Decision 5 — Use the installed shadcn `AlertDialog`

| | |
|---|---|
| **Choice** | Gate discard with the existing shadcn `AlertDialog` and Spanish copy. |
| **Alternatives** | Build an ad-hoc modal or delete immediately. |
| **Rationale** | The user explicitly requires confirmation and selected the installed component; no package is needed. |

### Decision 6 — Reuse persistence cascades without migration

| | |
|---|---|
| **Choice** | Delete the selected draft and associated `UploadedDocument` through the current Prisma relations, allowing existing cascades to remove draft sections, groups, and rows. |
| **Alternatives** | Add soft-delete columns, a cleanup table, or a database migration. |
| **Rationale** | The required relations already exist and the PRD forbids data-model changes. |

## File Structure

```text
workspace/backend/src/modules/cards/
├── cards.routes.ts       (MODIFY — register list and DELETE routes)
├── cards.controller.ts   (MODIFY — parse requests and return contracts)
├── cards.service.ts      (MODIFY — query summaries and discard draft/document)
└── cards.schemas.ts      (MODIFY — add cardStatementDraftSummarySchema and route contracts)

workspace/backend/tests/cards/
└──                        (ADD/EXTEND — list, pagination, response, and cascade-discard tests)

workspace/frontend/src/components/finance/sections/
├── importaciones-section.legacy.tsx  (MODIFY — render PendingDraftsPanel above Historial)
└── tarjetas-section.tsx              (MODIFY — consume pending draft after boot)

workspace/frontend/src/lib/finance/
├── card-statements-api.ts  (MODIFY — list/discard clients; reuse detail/accept clients)
└── ui-store.ts             (MODIFY — pending draft ID and setter/clearer actions)

workspace/frontend/tests/
└──                         (ADD/EXTEND — FEAT-025 Playwright scenarios)
```

No production file is removed. The installed shadcn AlertDialog component remains unchanged and is imported by the panel.

## Validation Rules

| Surface | Field | Rule |
|---|---|---|
| List query | `status` | Optional; only `preview_ready`, `failed`, or `all`; omission and `all` include both supported statuses. |
| List query | `limit` | Optional numeric pagination input, forwarded by `listCardStatementDrafts`. |
| List query | `offset` | Optional numeric pagination input, forwarded by `listCardStatementDrafts`. |
| Draft summary | `id` | Required string. |
| Draft summary | `status` | Required enum: `preview_ready` or `failed`. |
| Draft summary | `createdAt` | Required serialized string. |
| Draft summary | `fileName` | Required string from the associated `UploadedDocument`. |
| Draft summary | `errorMessage` | Optional string; visible for failed drafts when a failure reason is available. |
| Discard route | `draftId` | Required path string and must resolve through the existing cards service conventions. |
| Discard response | `ok` | Literal `true` on success. |
| Discard response | `deletedId` | Required string equal to the discarded draft ID. |
| UI store | `pendingCardStatementDraftId` | `string | null`; initialized to `null`; cleared after successful preview application. |
| Action visibility | `preview_ready` | Show Accept, View, and Discard. |
| Action visibility | `failed` | Show Discard only and render the available error reason. |

## Feature-specific decisions

### FEAT-025 — Review Pending Drafts

- Render `PendingDraftsPanel` above the current “Historial” card in `importaciones-section.legacy.tsx`.
- Load only `preview_ready` and `failed` drafts through the new summary endpoint.
- Keep acceptance on the existing endpoint and schema.
- Open ready previews in editable Cards mode through the one-shot Zustand draft ID.
- Require the existing shadcn AlertDialog before either ready or failed drafts can be discarded.
- Delete the draft, associated document, sections, groups, and rows without a schema migration.
- Refresh server-backed list state after resolution actions; do not optimistically hide a failed deletion.
- Keep inline editing, retries, bulk actions, salary drafts, and notifications out of scope.
