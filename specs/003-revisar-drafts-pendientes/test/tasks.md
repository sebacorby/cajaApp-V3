# Tasks: 003-revisar-drafts-pendientes

This checklist implements FEAT-025 using the existing Fastify/Prisma/Zod backend and Next.js/React/Zustand/shadcn frontend. Work is ordered test-first: establish failing contract and behavior tests, implement the smallest change, then run the complete verification sweep.

Behavior source: [../functional/features/FEAT-025-revisar-drafts-pendientes.feature](../functional/features/FEAT-025-revisar-drafts-pendientes.feature)

## 1. Backend list contract — FEAT-025

- [ ] 1.1 Add failing service tests for pending-draft selection
  - Seed `preview_ready`, `failed`, and unrelated-status drafts; assert only the two supported pending statuses are returned for `all` or an omitted status.
- [ ] 1.2 Add failing filter and pagination tests
  - Assert exact `preview_ready` and `failed` filters plus `limit`/`offset` behavior over the filtered result.
- [ ] 1.3 Add failing summary-projection tests
  - Assert `id`, `status`, serialized `createdAt`, uploaded `fileName`, and optional failed `errorMessage`, including validation-error fallback.
- [ ] 1.4 Add a failing API contract test for `GET /api/card-statements/drafts`
  - Exercise the Fastify route and validate the bare `CardStatementDraftSummary[]` response and accepted query values.
- [ ] 1.5 Implement the pending-draft query in the cards service
  - Query the existing draft/document/extraction data, apply the requested status and pagination, and map only the resolved summary fields.
- [ ] 1.6 Add the list controller, route, and Zod response schema
  - Register `GET /api/card-statements/drafts` and add `cardStatementDraftSummarySchema` without duplicating the existing preview schema.

## 2. Backend discard contract — FEAT-025

- [ ] 2.1 Add a failing cascade-discard service test
  - Seed a draft with sections, groups, rows, and an `UploadedDocument`; assert discard removes the full graph and returns the selected draft ID.
- [ ] 2.2 Add failing discard API contract tests
  - Assert `DELETE /api/card-statements/drafts/:draftId` returns `{ ok: true, deletedId }` on success and follows the existing cards error convention for a non-resolvable draft.
- [ ] 2.3 Implement discard in the cards service
  - Resolve the selected draft/document and delete them through the existing Prisma relations so current cascades remove all draft children.
- [ ] 2.4 Register the DELETE controller and route
  - Expose the resolved endpoint under the cards module without changing the Prisma schema or generic Import Center API.
- [ ] 2.5 Add a regression test for existing draft endpoints
  - Confirm detail, edit, and accept routes still work and acceptance continues to use `cardStatementPreviewSchema`.

## 3. Frontend API and pending panel — FEAT-025

- [ ] 3.1 Add failing client contract tests for list and discard
  - Assert query serialization for `status`, `limit`, and `offset`, summary-schema parsing, DELETE method/path, and `{ ok, deletedId }` parsing.
- [ ] 3.2 Implement `listCardStatementDrafts` and `discardCardStatementDraft`
  - Add both functions to `card-statements-api.ts` while retaining `getCardStatementDraft` and `acceptCardStatementDraft` unchanged.
- [ ] 3.3 Add a failing panel test for mixed pending statuses and empty state
  - Assert ready and failed summaries render with status, failed error reason, and “No hay borradores pendientes” for an empty response.
- [ ] 3.4 Add failing action-visibility tests
  - Assert ready items expose “Aceptar”, “Ver”, and “Descartar”, while failed items expose only “Descartar”.
- [ ] 3.5 Implement `PendingDraftsPanel` above “Historial”
  - Extend `importaciones-section.legacy.tsx` with list loading, summary rendering, status-specific controls, loading/error handling, and the explicit empty state.
- [ ] 3.6 Wire acceptance to the existing flow
  - Load the full selected draft with `getCardStatementDraft`, pass its existing preview payload to `acceptCardStatementDraft` under the current preview contract, then reload the pending list after success or a stale acceptance response without creating a duplicate statement.

## 4. Confirmed discard UI — FEAT-025

- [ ] 4.1 Add failing AlertDialog behavior tests
  - Assert “Descartar” opens Spanish confirmation copy, cancel sends no request, and confirm sends exactly one discard request for the selected ID.
- [ ] 4.2 Implement discard confirmation with the installed shadcn component
  - Use the existing `AlertDialog`; expose “Descartar” for both supported statuses and block deletion until explicit confirmation.
- [ ] 4.3 Add failing post-discard refresh and error tests
  - Assert success reloads and removes the deleted draft, while a network/server failure closes the confirmed dialog, does not optimistically remove the item, and exposes the existing error surface.
- [ ] 4.4 Implement post-discard list synchronization
  - Reload the server-backed list after a successful DELETE and preserve visible state when deletion fails.

## 5. Cards preview handoff — FEAT-025

- [ ] 5.1 Add failing Zustand store tests
  - Assert the initial pending draft ID is `null`, the setter stores an ID, and the clearer restores `null` without changing the selected section contract.
- [ ] 5.2 Extend `FinanceUIState`
  - Add `pendingCardStatementDraftId`, `setPendingCardStatementDraft(id)`, and `clearPendingCardStatementDraft()` in `ui-store.ts`.
- [ ] 5.3 Add a failing “Ver” handoff test
  - Assert a ready item's “Ver” stores its ID before switching the active section to `tarjetas`; failed items have no View action.
- [ ] 5.4 Wire “Ver” in the pending panel
  - Call the new Zustand setter and then `useFinanceUI.setSection("tarjetas")`.
- [ ] 5.5 Add a failing `TarjetasSection` boot test
  - With a pending ID, assert the existing boot `Promise.all` completes, `getCardStatementDraft(id)` runs, the preview is applied in editable mode, and the pending ID is cleared.
- [ ] 5.6 Extend the Cards boot effect
  - Consume the pending ID after existing boot requests, apply the existing preview state, set `uiState` to `preview`, and clear the one-shot handoff after application.
- [ ] 5.7 Add a no-pending-ID regression test
  - Assert normal Cards boot behavior and existing upload/polling preview behavior remain unchanged when the store entry is `null`.

## 6. Integrated behavior and regression

- [ ] 6.1 Add an integrated acceptance test
  - Start from the pending panel, accept a ready draft through the existing endpoint, assert one `CardStatement` is created, and assert the draft disappears after reload.
- [ ] 6.2 Add an integrated view test
  - Start from the pending panel, select “Ver”, and assert Cards opens the selected draft in editable preview mode.
- [ ] 6.3 Add an integrated confirmed-discard test
  - Confirm discard from the panel and assert the draft, document, sections, groups, and rows are absent afterward.
- [ ] 6.4 Add an integrated failed-draft test
  - Assert the failure reason is visible, Accept/View are absent, and confirmed discard resolves the item.
- [ ] 6.5 Run targeted regression tests for card-statement acceptance
  - Verify FEAT-001 import/accept behavior and FEAT-024 period normalization remain unchanged.
- [ ] 6.6 Run targeted Import Center regression tests
  - Verify the existing “Historial” card and generic import detail interactions still render below the new panel.

## 7. Verification

- [ ] 7.1 Verify scenario: pending panel lists ready and failed drafts
  - Automated test for FEAT-025 scenario “The pending drafts panel lists preview_ready and failed drafts”, including visible status labels.
- [ ] 7.2 Verify scenario: accepting a ready draft creates a statement
  - Automated test for FEAT-025 scenario “Accepting a preview_ready draft creates a CardStatement”, including list refresh and no duplicate creation.
- [ ] 7.3 Verify scenario: viewing a ready draft opens editable Cards preview
  - Automated test for FEAT-025 scenario “Viewing a preview_ready draft opens it in the Cards section”, including Zustand handoff cleanup.
- [ ] 7.4 Verify scenario: requesting discard shows confirmation
  - Automated test for FEAT-025 scenario “Requesting to discard a preview_ready draft shows a confirmation modal”, including cancel-without-request behavior.
- [ ] 7.5 Verify scenario: confirmed discard deletes draft and document
  - Automated test for FEAT-025 scenario “Confirming the discard deletes the draft and its document”, including cascaded children and refreshed UI.
- [ ] 7.6 Verify scenario: failed draft shows reason and discard action
  - Automated test for FEAT-025 scenario “A failed draft shows the error reason and offers a discard action”, including absence of Accept/View.
- [ ] 7.7 Run the backend verification commands
  - From `workspace/backend`, run `npm run build` and `npm run test`; retain the exact command output.
- [ ] 7.8 Run the frontend static verification commands
  - From `workspace/frontend`, run `npm run typecheck`, `npm run lint`, and `npm run build`; retain the exact command output.
- [ ] 7.9 Run the frontend Playwright suite
  - Execute the targeted FEAT-025 tests and then the complete existing Playwright suite.
- [ ] 7.10 Confirm Gherkin-to-test coverage
  - Map all six FEAT-025 scenarios to passing automated tests and report no uncovered scenario.
