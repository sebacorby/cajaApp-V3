# Validation Results: 004-fix-future-debt-card-reference

**Round:** 1
**Verdict:** PASS
**Date:** 2026-07-25

## Summary

Fixed a one-line bug in `cards.service.ts acceptDraft()`: changed `groupKey: r.groupId` (section ID) to `groupKey: r.id` (group ID) at line 830, restoring the correct `row → group → cardLast4` join path in `normalizeProjection()`. The new integration test `accept-draft-group-key.test.ts` verifies the correct join key is stored. All 306 tests pass, TypeScript is clean, and the build succeeds.

## Re-run evidence

| Command | Reported by Developer | Observed by Tester | Status |
|---|---|---|---|
| `npm run test -- --run` | 306 passed, 0 failed | 306 passed, 0 failed (57 test files) | OK |
| `npx tsc --noEmit` | exit 0, 0 errors | exit 0, 0 errors | OK |
| `npm run build` | exit 0, no errors | exit 0, no errors | OK |
| `npm run test -- --run tests/smoke/` | (not in report — deferred to tester) | 3 passed, 0 failed | OK |
| Linter | n/a (no lint script configured) | n/a | OK (absent by design) |

## Findings

| ID | Severity | FEAT-ID | Title | Reproduction | Expected | Actual | Suggested fix |
|---|---|---|---|---|---|---|---|
| F-001 | INFO | FEAT-026 | `accept-draft-group-key.test.ts` does not call `normalizeProjection` or the future-debt API | Read of `tests/cards/accept-draft-group-key.test.ts` | Test asserts `cardLast4` and `cardLabel` through the full future-debt API path | Test only asserts `CardStatementRow.groupKey === "g-1"` (the join key) at the Prisma level | The developer's decision to omit the `normalizeProjection` assertion is documented in `implementation_report.md §Plan deviations` as a pre-existing architectural issue (`projection.rowId` vs `CardStatementRow.id` UUID mismatch). The read-path coverage for `cardLast4` and `cardLabel` is provided by `api.test.ts` + `service.test.ts` (dataset A and D). No action required. |

## Skill audit

- `IADEV-test-driven-development` — used (mandatory TDD discipline, test-first). OK.
- Integration testing with Prisma/SQLite — searched, not found as a named skill. Developer used existing `cards.controller.accept.test.ts` as reference pattern. OK.
- Vitest test patterns — searched, not found as a named skill. OK.
- No stack-relevant E2E skill exists for this backend TypeScript/Fastify/Prisma/SQLite stack. No gap.
- The plan's Task 1 listed "Skills the Developer should look for: anything for integration testing with a live SQLite database via Prisma" — developer searched and found none; used existing project patterns. OK.

## Scenario coverage (per `IADEV-bdd-implementation`)

| FEAT-ID | Scenario | Covered by | Layer | Status |
|---|---|---|---|---|
| FEAT-026 | "Cuota futura muestra la referencia de tarjeta correcta" | `accept-draft-group-key.test.ts` (groupKey join fix, direct Prisma assertion) + `api.test.ts` (cardLabel/cardLast4 in response, fixture-seeded) | Integration | PASS — join key correctly verified at data layer; read path verified through API tests |
| FEAT-026 | "Múltiples cuotas de la misma tarjeta se agrupan correctamente" | `api.test.ts` + `service.test.ts` (multi-card grouping, totals by currency) | Integration | PASS — pre-existing multi-card grouping tests cover this |
| FEAT-026 | "Cuota sin referencia de tarjeta aparece en pendientes" | `service.test.ts` dataset D (dataset-d.ts, rn-013.test.ts) | Unit | PASS — `missing_card_reference` diagnostic explicitly asserted |
| FEAT-026 | "Identificación de tarjeta a través de la traza de origen" | `traceability.ts` + `rules/traceability.test.ts` (FEAT-023 lineage) | Unit/Integration | PASS — `holderName`, `originReference`, `cardLabel` all tested via existing traceability tests |

## Notes

1. **Fix confirmed at line 830 of `cards.service.ts`**: `groupKey: r.id` — correct group key stored, not section ID.
2. **New test quality**: `accept-draft-group-key.test.ts` is a well-structured integration test: proper `beforeAll`/`afterAll` app lifecycle, seed/cleanup in `beforeEach`/`afterEach`, clear comments explaining the join semantics, and a single focused assertion that the groupKey join key is `"g-1"` (the group ID, not `"s-1"` the section ID).
3. **Deferred gates confirmed green**: smoke tests (3/3) and full suite (306/306) all pass.
4. **Pre-existing architectural note** (INFO, non-blocking): The developer's report correctly documents that `projection.rowId → CardStatementRow.id` is a pre-existing join issue separate from this fix. The row→group join (fixed here) and row→projection join are two separate hops. The existing `api.test.ts` fixtures pre-seed the correct `groupKey` on rows, so they test the read path correctly.
5. **No lint script** in `package.json` — not a gap, absent by design for this project.
6. **No pre-commit hooks** found in `.husky/`, `lefthook.yml`, or `.pre-commit-config.yaml` — not a gap.
