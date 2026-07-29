# Specs: 003-revisar-drafts-pendientes

Behavioral scenarios: [../functional/gherkin.md](../functional/gherkin.md)

This document is the technical requirements index for reviewing unresolved card-statement drafts. It links to the Discovery-authored behavior and defines the API contracts, state handoff, validation boundaries, and persistence effects that the Gherkin does not express.

## Common technical contract — pending draft list

### Request

```http
GET /api/card-statements/drafts?status=preview_ready|failed|all&limit=<number>&offset=<number>
```

| Query parameter | Required | Accepted value | Behavior |
|---|---|---|---|
| `status` | no | `preview_ready`, `failed`, or `all` | Filters by one supported pending status; `all` or omission returns both supported statuses. |
| `limit` | no | numeric pagination value | Limits the number of summaries returned. |
| `offset` | no | numeric pagination value | Skips summaries before returning the current page. |

The route belongs to the existing `cards/` module and uses the existing Fastify/Zod validation and application error-handler conventions. Pagination is applied to the filtered pending-draft query. The response remains a bare array; this change does not introduce a count envelope.

### Response

```ts
type CardStatementDraftSummary = {
  id: string;
  status: "preview_ready" | "failed";
  createdAt: string;
  fileName: string;
  errorMessage?: string;
};

type ListCardStatementDraftsResponse = CardStatementDraftSummary[];
```

Example:

```json
[
  {
    "id": "draft-ready-id",
    "status": "preview_ready",
    "createdAt": "2026-07-24T12:00:00.000Z",
    "fileName": "resumen-julio.pdf"
  },
  {
    "id": "draft-failed-id",
    "status": "failed",
    "createdAt": "2026-07-24T12:05:00.000Z",
    "fileName": "resumen-invalido.pdf",
    "errorMessage": "No se pudo validar el resumen"
  }
]
```

Implementation constraints:

- The list never returns `imported`, `processing`, `accepted`, or any status other than `preview_ready` and `failed`.
- `fileName` comes from the draft's associated `UploadedDocument`.
- For a failed draft, `errorMessage` exposes the available extraction failure reason (`AiExtractionRun.errorMessage`, with the first validation error as fallback when available).
- `cardStatementDraftSummarySchema` is the only new response schema required for this list contract.
- Empty results return `[]`; the frontend renders the explicit “No hay borradores pendientes” state.

## Common technical contract — discard

### Request and response

```http
DELETE /api/card-statements/drafts/:draftId
```

```ts
type DiscardCardStatementDraftResponse = {
  ok: true;
  deletedId: string;
};
```

Implementation constraints:

- The route is added to the existing `cards/` module.
- The deletion removes the selected `CardStatementDraft` and its associated `UploadedDocument`.
- Existing Prisma cascade relations remove the draft's sections, groups, and rows; no schema migration is required.
- A successful response returns the requested draft ID as `deletedId`.
- A failed request does not remove the item optimistically from frontend state. After confirmation the dialog closes, the panel keeps or reloads server state, and the existing error surface reports the failure.

## Reused card-statement draft contracts

| Method | Path | Purpose in this change | Contract decision |
|---|---|---|---|
| `GET` | `/api/card-statements/drafts/:draftId` | Load the full preview selected through “Ver”. | Reuse `getCardStatementDraft`; no new detail endpoint. |
| `PUT` | `/api/card-statements/drafts/:draftId` | Persist edits made in Cards preview mode. | Unchanged. |
| `POST` | `/api/card-statements/drafts/:draftId/accept` | Accept a ready draft from the panel or Cards flow. | Reuse `acceptCardStatementDraft` and `cardStatementPreviewSchema`. |

Acceptance remains idempotent at the business boundary: a stale second acceptance must not create a second `CardStatement`. The panel refreshes its list after the existing endpoint reports success or a stale/not-accept-able response.

## Frontend integration contract

### API client

`workspace/frontend/src/lib/finance/card-statements-api.ts` exposes:

```ts
type ListCardStatementDraftsInput = {
  status?: "preview_ready" | "failed" | "all";
  limit?: number;
  offset?: number;
};

function listCardStatementDrafts(
  input?: ListCardStatementDraftsInput,
): Promise<CardStatementDraftSummary[]>;

function discardCardStatementDraft(
  draftId: string,
): Promise<{ ok: true; deletedId: string }>;
```

The existing `acceptCardStatementDraft` and `getCardStatementDraft` functions remain the acceptance and detail-loading clients.

### Import Center panel

- `PendingDraftsPanel` is rendered in `importaciones-section.legacy.tsx` immediately above the existing “Historial” card.
- Every item renders `fileName`, `createdAt`, and its current status.
- A failed item also renders `errorMessage` when present.
- `preview_ready` actions: “Aceptar”, “Ver”, “Descartar”.
- `failed` actions: “Descartar” only.
- “Descartar” opens the installed shadcn `AlertDialog` with Spanish confirmation copy that explains the draft and associated document will be deleted.
- Canceling the dialog makes no API call and changes no list state.
- Confirming calls `discardCardStatementDraft(draftId)` and reloads the list after success.
- Acceptance first loads the full selected draft through `getCardStatementDraft(draftId)`, then passes its existing preview payload to `acceptCardStatementDraft` under `cardStatementPreviewSchema`, and reloads the list after completion.
- The panel does not implement inline preview editing.

### Cross-section draft handoff

`FinanceUIState` adds:

```ts
pendingCardStatementDraftId: string | null;
setPendingCardStatementDraft: (id: string) => void;
clearPendingCardStatementDraft: () => void;
```

The initial value is `null`.

“Ver” performs the handoff in this sequence:

1. Call `setPendingCardStatementDraft(draftId)`.
2. Call `useFinanceUI.setSection("tarjetas")`.
3. Let `TarjetasSection` complete its existing boot `Promise.all`.
4. If `pendingCardStatementDraftId` is present, call `getCardStatementDraft(id)`.
5. Apply the returned preview through the existing Cards preview state.
6. Set `uiState = "preview"`, preserving the existing editable preview mode.
7. Call `clearPendingCardStatementDraft()` after the preview is applied.

No route, URL parameter, local storage entry, or duplicate preview screen is introduced.

---

## FEAT-025 — Review Pending Drafts

**Type:** functional  
**Scenarios:** [../functional/features/FEAT-025-revisar-drafts-pendientes.feature](../functional/features/FEAT-025-revisar-drafts-pendientes.feature)

**Implementation notes:**

- The panel's data source is the dedicated `GET /api/card-statements/drafts` endpoint, not the generic Import Center detail endpoint.
- The list query includes both supported terminal-action statuses when the panel loads.
- Accept and view controls are rendered only when `status === "preview_ready"`; discard is rendered for both supported statuses.
- Acceptance loads the selected draft detail and then reuses the existing draft-to-`CardStatement` flow and its preview schema, preserving the accepted statement's current behavior and period normalization.
- Viewing uses the one-shot Zustand handoff and the existing editable Cards preview.
- Discard is gated by `AlertDialog`; only explicit confirmation invokes the DELETE endpoint.
- Discard cleanup relies on existing Prisma cascade relations and does not modify the database schema.
- Failed items expose their error reason before the discard action.
- Successful accept or discard removes the resolved draft from the next list response.
- A mutation failure does not use optimistic removal; the visible list remains server-backed and an existing UI error surface reports the failure.
- No package, authentication, deployment, AI-processing, or salary-receipt behavior changes are part of FEAT-025.
