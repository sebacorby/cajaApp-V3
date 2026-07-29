# Summary: 006-future-debt-row-deletion

## What was built

Added per-row checkbox selection, a "Eliminar N filas" button with inline confirmation, and a `DELETE /api/future-debt/rows/:id` endpoint to allow users to remove individual future debt rows. For `isManual = true` rows, the endpoint cascades deletion to the related `ManualCardPurchase` in a Prisma transaction.

## Features

- **FEAT-029** — Bulk delete future debt rows (`features/FEAT-029-future-debt-row-deletion.feature`)

## Key decisions

- **Inline confirmation** on the delete button — no modal dialog; "Confirmar" / "Cancelar" appear inline
- **Per-row DELETE endpoint** — `DELETE /api/future-debt/rows/:id`; N parallel requests from the frontend for N selected rows
- **Cascade delete** — when `isManual = true`, both `CardInstallmentProjection` and `ManualCardPurchase` are deleted in one transaction
- **All rows selectable** — including `pendientes` (missing card reference) rows
- **No undo** — deletion is permanent

## Stack

Node.js / Fastify backend with Prisma ORM; Next.js frontend with Radix UI and TanStack Query; no new dependencies.

## Delivery

Round 1 produced a **BLOCKING** finding (missing E2E spec) and a MINOR debug artifact. Rebound 1 addressed both: wrote `tests/future-debt-row-deletion.spec.ts` with 6 E2E scenarios covering all UI flows, and removed the `console.error` debug line. All 316 backend tests pass, both typecheck runs clean.

## Verdict

PASS — Rebound 1 (1 round; Round 1 FAIL → Rebound 1 PASS)

## Docs & features updated

- `docs/technical.md` — Future Debt module section updated to document `DELETE /api/future-debt/rows/:id`
- `features/` — FEAT-029 feature file already active (added by planner); no deprecations

## Artifacts

| Location | File | Purpose |
|----------|------|---------|
| `functional/` | `PRD.md`, `gherkin.md`, `discovery.md`, `features/` | Product spec (historical snapshot) |
| `code/` | `proposal.md`, `design.md` | Technical spec |
| `test/` | `tasks.md` | Implementation checklist |
| `/` | `implementation.md`, `implementation_report.md`, `validation-results.md` | Delivery |

## Notes

- **Select-all UI discrepancy (INFO):** The active feature file says "select all in the list header." The actual UI has a per-card select-all. The E2E test exercises the working card-level behavior. Not a blocking gap.
- **Pre-existing frontend lint errors** (183) in unmodified files — outside this change's scope.
- **No deprecations identified** — FEAT-029 targets individual rows; FEAT-028 deletes whole statements. Complementary — no overlap.
