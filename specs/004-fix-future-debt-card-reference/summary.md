# Summary: 004-fix-future-debt-card-reference

## What was built

Fixed a one-line bug in `cards.service.ts acceptDraft()` that caused all future debt installment rows to show "missing_card_reference" instead of the correct card identifier. The fix: `groupKey: r.groupId` (section ID) → `groupKey: r.id` (group ID), restoring the correct row→group join path used by `normalizeProjection()` to derive `cardLast4`.

## Features

| FEAT-ID | Name | Active feature |
|---------|------|-----------------|
| FEAT-026 | Fix card reference in future debt projections | `features/FEAT-026-fix-card-reference.feature` |

## Key decisions

- **Root cause:** `acceptDraft()` stored section ID (`r.groupId`) as `CardStatementRow.groupKey` instead of group ID (`r.id`), breaking the `normalizeProjection()` join that derives `cardLast4`.
- **Fix scope:** Single-line change in `cards.service.ts`; no schema migration, no changes to `normalizeProjection()`.
- **Out of scope:** Data migration for already-accepted rows with incorrect `groupKey`; denormalizing `cardLast4` onto `CardInstallmentProjection`; `ai-processor-worker.ts` occurrences.

## Stack

TypeScript / Node.js backend (Fastify + Prisma + SQLite). No dependency changes.

## Delivery

Round 1, PASS. 306 tests pass, TypeScript clean, build clean. One INFO note (F-001): the new integration test verifies `groupKey` at the Prisma level but does not call `normalizeProjection` end-to-end — the read-path `cardLast4`/`cardLabel` coverage is provided by existing `api.test.ts` + `service.test.ts` fixtures.

## Verdict

PASS — 1 round

## Docs & features updated

- Docs updated: none (bug fix — no module/schema/interface changes)
- Features added: `features/FEAT-026-fix-card-reference.feature` (already placed by planner)
- Deprecated: none

## Artifacts

| Location | File | Purpose |
|----------|------|---------|
| `functional/` | `PRD.md`, `gherkin.md`, `discovery.md`, `features/` | Product spec (historical snapshot) |
| `code/` | `proposal.md`, `design.md` | Technical spec |
| `test/` | `tasks.md` | Implementation checklist |
| `/` | `implementation.md`, `implementation_report.md`, `validation-results.md` | Delivery |

## Notes

- Existing `CardStatementRow` records with incorrect `groupKey` (section ID instead of group ID) are not migrated — requires a separate data-fix script.
- A pre-existing structural issue in `normalizeProjection`: `projection.rowId` (preview row ID) vs `CardStatementRow.id` (Prisma UUID) may still affect the row→projection join for newly created statements — separate issue.
