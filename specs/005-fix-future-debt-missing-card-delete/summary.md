# Summary: 005-fix-future-debt-missing-card-delete

## What was built

Two bugs in the card statement acceptance flow were fixed: (1) `CardInstallmentProjection.rowId` was storing preview row IDs from AI extraction instead of the database-generated UUIDs, causing all future debt installments to show `missing_card_reference`; (2) accepted card statements had no delete endpoint, leaving erroneous data with no cleanup path.

## Features

- **FEAT-027** — `features/FEAT-027-fix-projection-row-reference.feature` — Fix Projection RowId Reference After Statement Acceptance
- **FEAT-028** — `features/FEAT-028-delete-accepted-card-statement.feature` — Delete Accepted Card Statements

## Key decisions

- Composite key `(displayOrder, sectionKey, groupKey)` used to correlate preview rows with persisted rows after insert — no schema changes needed
- Hard delete chosen over soft-delete; `archiveStatement` already covers soft semantics
- Only `status === "accepted"` statements can be hard-deleted via this endpoint; drafts must use `DELETE /drafts/:draftId`
- Frontend delete uses Radix `AlertDialog` with user confirmation; shown only for accepted statements

## Stack

TypeScript, Fastify backend, Prisma/SQLite, Next.js frontend, Vitest testing — no new dependencies.

## Delivery

Single-round delivery. All 312 backend tests pass, both typechecks clean, frontend build clean. One minor finding (F-001) noted a test scenario mismatch (archived vs. draft status) that does not affect correctness since the service correctly rejects both. Manual E2E verification of the AlertDialog flow recommended but not automated.

## Verdict

PASS, 1 round.

## Docs & features updated

- `docs/domain.md` — Flow 1 (Credit Card Statement Import) updated to reflect the post-insert `rowId` correction step
- `docs/technical.md` — `cards/` module entry notes the new `DELETE /statements/:statementId` route and the data-fixup script under `scripts/`
- No deprecations

## Artifacts

| Location | File | Purpose |
|----------|------|---------|
| `specs/005-fix-future-debt-missing-card-delete/functional/` | `PRD.md`, `gherkin.md`, `discovery.md`, `features/` | Product spec (historical snapshot) |
| `specs/005-fix-future-debt-missing-card-delete/code/` | `proposal.md`, `design.md` | Technical spec |
| `specs/005-fix-future-debt-missing-card-delete/test/` | `tasks.md` | Implementation checklist |
| `specs/005-fix-future-debt-missing-card-delete/` | `implementation.md`, `implementation_report.md`, `validation-results.md` | Delivery |

## Notes

- Integration/E2E tests for the frontend delete AlertDialog flow are not automated; manual verification recommended.
- One pre-existing accepted statement data-fixup script (`fix-stale-projection-rowids.ts`) is provided for existing data.
