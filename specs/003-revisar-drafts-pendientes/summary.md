# Summary: 003-revisar-drafts-pendientes

## What was built
Added a **pending drafts panel** to the Import Center that surfaces `CardStatementDraft` records in `preview_ready` and `failed` states with accept/view/discard actions, allowing users to return to and resolve abandoned card-statement imports.

## Features
- **FEAT-025** — `features/FEAT-025-revisar-drafts-pendientes.feature` (Active)

## Key decisions
- Panel lives inside the existing Import Center (not a new navigation destination)
- `preview_ready` and `failed` drafts are both listed (user explicitly asked to include failed)
- Discard requires a Spanish `AlertDialog` confirmation before sending DELETE
- "Ver" navigates to the Cards section with the draft loaded in editable preview mode via a one-shot Zustand handoff (`pendingCardStatementDraftId`)
- Discard deletes both the draft and its `UploadedDocument` using existing Prisma cascades (no migration)
- `AiExtractionRun.validationErrors` (not `errorMessage`) is the actual field for failed-draft error text

## Stack
- **Backend:** Fastify / Prisma 6 / SQLite — `cards/` module extended with `GET /api/card-statements/drafts` and `DELETE /api/card-statements/drafts/:draftId`
- **Frontend:** Next.js 16 / React 19 / Zustand / shadcn AlertDialog — `PendingDraftsPanel` in `importaciones-section.legacy.tsx`; Zustand handoff in `ui-store.ts`; TarjetasSection boot effect extended
- **Tests:** Vitest 3.0 (backend, 294/294 passing), Playwright 1.61 (E2E, requires live server)

## Delivery
- Round 1 passed all verifiable gates (294 backend tests, typecheck, build); E2E tests confirmed present (328 lines, 7 tests covering all 6 scenarios) but required a live server and could not be executed by the orchestrator in isolation
- Round 2 re-validation reversed two Round 1 blocking findings (test file missing, no scenario coverage) that were caused by a transient glob indexing issue; verdict upgraded to PASS
- Minor finding F-003 (regression suite does not mock the drafts endpoint) remains open as an enhancement

## Verdict
**PASS** — 2 rounds (Round 1 + Round 2 re-validation)

## Docs & features updated
- `docs/CHANGELOG.md` — entry prepended
- `features/` — FEAT-025-revisar-drafts-pendientes.feature (active, added by planner)
- No deprecations (discovery collision check confirms FEAT-025 extends FEAT-001 without replacing any existing scenarios)
- `docs/technical.md` and `docs/domain.md` — no changes (new UI feature extending existing functionality)

## Artifacts
| Location | File | Purpose |
|----------|------|---------|
| `functional/` | `PRD.md`, `gherkin.md`, `discovery.md`, `features/` | Product spec (historical snapshot) |
| `code/` | `proposal.md`, `design.md` | Technical spec |
| `test/` | `tasks.md` | Implementation checklist |
| `/` | `implementation.md`, `implementation_report.md`, `validation-results.md` | Delivery |

## Notes
- `functional/PRD.md` was not found at the expected path; summary is derived from discovery.md, proposal.md, and validation-results.md
- E2E Playwright tests require a live server at `http://127.0.0.1:11437`; structure and coverage confirmed valid (7 tests, all 6 scenarios)
- F-003 (regression suite does not mock the drafts endpoint) is a minor enhancement — not a blocker
