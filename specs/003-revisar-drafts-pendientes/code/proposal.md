# Proposal: 003-revisar-drafts-pendientes

## Why

CajaApp can leave credit-card statement imports in two terminal draft states that still require user action: `preview_ready`, when extracted data is ready for review, and `failed`, when extraction did not produce a usable preview. Those drafts currently remain mixed into the Import Center history, so the user has no focused view of unresolved work.

The current flow also leaves important actions disconnected. A ready draft can only be reviewed through the Cards flow, and a failed draft cannot be discarded from the UI. As a result, abandoned drafts and their uploaded documents accumulate, failed imports lack a visible resolution path, and the user cannot reliably tell which card PDFs still need attention.

## What Changes

### Backend — pending-draft query and discard

- **Add** `GET /api/card-statements/drafts?status=preview_ready|failed|all&limit=<n>&offset=<n>` under the existing `cards/` module.
- **Return** a paginated `CardStatementDraftSummary[]`, where each summary contains `id`, `status`, `createdAt`, `fileName`, and optional `errorMessage`.
- **Add** `cardStatementDraftSummarySchema` for the list response.
- **Add** `DELETE /api/card-statements/drafts/:draftId`, returning `{ ok: true, deletedId }` after deleting the associated `UploadedDocument` and cascading deletion through the draft, sections, groups, and rows.
- **Reuse** the existing detail, edit, and acceptance endpoints:
  - `GET /api/card-statements/drafts/:draftId`
  - `PUT /api/card-statements/drafts/:draftId`
  - `POST /api/card-statements/drafts/:draftId/accept`
- **Reuse** `cardStatementPreviewSchema` for acceptance; no duplicate acceptance schema is introduced.

### Frontend — dedicated pending-drafts panel

- **Extend** `workspace/frontend/src/components/finance/sections/importaciones-section.legacy.tsx` with a `PendingDraftsPanel` rendered above the existing “Historial” card.
- **List** both `preview_ready` and `failed` drafts, including the error reason for failed items and an explicit empty state when no pending drafts exist.
- **Expose** “Aceptar” and “Ver” only for `preview_ready` drafts and “Descartar” for both supported statuses.
- **Reuse** `acceptCardStatementDraft` for acceptance and `getCardStatementDraft` for loading a draft preview.
- **Add** `listCardStatementDrafts({ status, limit, offset })` and `discardCardStatementDraft(draftId)` to `card-statements-api.ts`.
- **Use** the already-installed shadcn `AlertDialog` for the Spanish discard confirmation; cancellation performs no deletion.
- **Refresh** the pending list after completed accept or discard actions. A failed mutation does not optimistically remove the item.

### Frontend — cross-section preview handoff

- **Extend** `FinanceUIState` with `pendingCardStatementDraftId`, `setPendingCardStatementDraft(id)`, and `clearPendingCardStatementDraft()`.
- **Make** “Ver” store the selected draft ID and navigate with `useFinanceUI.setSection("tarjetas")`.
- **Extend** the `TarjetasSection` boot effect so that, after its existing `Promise.all`, it loads a pending draft through `getCardStatementDraft`, applies the preview, enters editable `preview` state, and clears the handoff entry.

### Tests

- **Add** backend API and service coverage for status filtering, pagination, summary projection, and cascade discard.
- **Add** frontend coverage for item visibility, status-specific actions, confirmation behavior, list refresh, and the Zustand handoff into editable Cards preview mode.
- **Map** every scenario in FEAT-025 to at least one automated test.

## Scope

**In scope:**

- A dedicated pending-drafts panel inside the existing Import Center.
- Listing `CardStatementDraft` records in `preview_ready` and `failed` states.
- Optional status filtering and `limit`/`offset` pagination.
- Accepting a `preview_ready` draft through the existing acceptance flow.
- Viewing a `preview_ready` draft in the existing editable Cards preview.
- Confirmed discard of either supported status, including its `UploadedDocument` and cascaded draft children.
- Visible failure reasons and an explicit empty state.
- Immediate list refresh after successful resolution actions and refresh after stale acceptance errors.

**Out of scope:**

- Inline preview editing in the Import Center.
- Draft reprocessing or retry controls.
- Changes to AI extraction, repair, or provider behavior.
- Multi-select, bulk discard, or drag-and-drop.
- Proactive notifications about pending drafts.
- Salary-receipt drafts or other import kinds.
- Database schema changes or migrations.
- A new authentication or authorization layer.
- New packages or dependency upgrades.

## Capabilities

**New:**

- Pending card-statement draft list endpoint with status filtering and pagination.
- Card-statement draft discard endpoint with document and child-record cleanup.
- Pending-drafts panel with accept, view, and confirmed-discard actions.
- Zustand handoff that opens a selected draft in the editable Cards preview.

**Modified:**

- `cards/` backend routes, controller, service, and schemas.
- Import Center legacy section.
- Card-statements frontend API client.
- Finance UI Zustand state.
- Cards section boot flow.

**Removed:**

- Nothing.

## Inputs

- **PRD:** `specs/003-revisar-drafts-pendientes/PRD.md` (Spec 003, version 1.0.0).
- **Discovery:** `specs/003-revisar-drafts-pendientes/functional/discovery.md`.
- **Gherkin:** `specs/003-revisar-drafts-pendientes/functional/gherkin.md`.
- **Behavioral scenarios:** `specs/003-revisar-drafts-pendientes/functional/features/FEAT-025-revisar-drafts-pendientes.feature`.
