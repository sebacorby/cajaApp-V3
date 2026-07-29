# Validation Results — Deuda futura de tarjetas

**Round:** 1 (backend slice)
**Date:** 2026-07-24
**Verdict:** PASS

## Summary

The backend implementation of the Future Debt screen satisfies all RN-001 … RN-016 rules, all Q1–Q6 product decisions, and the endpoint contract defined in `code/specs.md`. All 251 backend tests pass, `npm run check` exits 0, and `npx tsc -p tsconfig.json --noEmit` is clean.

## Test re-run

| Command | Result |
|---|---|
| `cd workspace/backend && npm run check` | exit 0, 49 test files, 251 tests passed, ~9.7s |
| `cd workspace/backend && npx tsc -p tsconfig.json --noEmit` | exit 0, clean |

## Spec / RN audit

| Rule | Implementation file | Status |
|---|---|---|
| RN-001 calendar sequence | `rules/month-sequence.ts` | ✅ |
| RN-002 current period excluded | service filter `excludesCurrentPeriod` | ✅ |
| RN-003 final installment excluded | `isValidInstallment` rejects `7/6` | ✅ |
| RN-004 original amount preserved | `normalizeOriginalAmount` | ✅ |
| RN-005 currency separation | `addCents` writes only to matching bucket | ✅ |
| RN-006 identity key (6-dim) | `(sourceType, sourceId, installmentCurrent, monthKey, currencyOriginal, cardId)` | ✅ |
| RN-007 source purchase excluded | `isSourcePurchase` + `onlyPersistedOccurrences` | ✅ |
| RN-008 persisted monthKey | `effectivePeriodKey` returns `monthKey` | ✅ |
| RN-009 non-destructive reads | 100-read SHA-256 snapshot test | ✅ |
| RN-010 horizon 1–24 | `validateHorizon` enforces range | ✅ |
| RN-011 exact totals | `bigint` cent aggregation | ✅ |
| RN-012 persistence without new imports | `persistedMonthKeys` reports | ✅ |
| RN-013 partition invalid data | `partitionByValidity` → pendientes | ✅ |
| RN-014 traceability fields | `toTraceability` always sets required fields | ✅ |
| RN-015 stable ordering | deterministic comparators | ✅ |
| RN-016 determinism | `stableSerialize` + byte-identical test | ✅ |

## Endpoint contract

- `GET /api/future-debt` registered at `future.routes.ts:11` with prefix `/api/future-debt`.
- Query params `from`, `months`, `includeCurrentPeriod` with defaults `current month`, `6`, `false`.
- Old `/api/future-commitments` returns 404; other methods return 404.
- 10 invalid query strings yield 400 with `code: "INVALID_QUERY"`.
- Response validated against Zod schema; no unexpected keys.

## Q-decisions

| Decision | Status |
|---|---|
| Q1 — both `cardStatementRow` and `manualCardPurchase` are read | ✅ |
| Q2 — `pendientes` section present in response with `rows` + `diagnostics` | ✅ |
| Q3 — default `months=6` | ✅ |
| Q4 — default `includeCurrentPeriod=false` | ✅ |
| Q5 — every row has `cardId`, `cardLast4`, `holderName`, `cardLabel` plus full traceability | ✅ |
| Q6 — `projected` from assumed obligation → `status: "confirmed"` in `toTraceability` | ✅ |

## Deviations audit

| Deviation | Scope | Verdict |
|---|---|---|
| Env guard softening in test mode (`config/env.ts:300-313`) | Test-mode only (NODE_ENV=test, VITEST=true, or npm_lifecycle_event=test). Production strict. | Acceptable ✅ |
| Vitest config hardening (pool, singleThread, fileParallelism) | Test-only | Acceptable ✅ |
| `parseInstallment` legacy fallback (`installment-projection.service.ts:86-94`) | Legacy callers; new future-debt service uses its own strict parser | Acceptable ✅ |

## Scenario coverage

All 27 active scenarios across FEAT-016 … FEAT-023 are exercised at the backend layer (16 rule files, 6 service fixtures, 15 API contract tests, 1 determinism test, 1 non-destructive test).

## Findings

| ID | Severity | Description |
|---|---|---|
| F1 | INFO | `implementation_report.md:39` contains a typographic error: `modulesfracture/rn-014.test.ts` (missing slash). Cosmetic; does not affect code or tests. |

**Counts:** BLOCKING: 0 · MAJOR: 0 · MINOR: 0 · INFO: 1

## Notes

- Slice 1 covers backend only. Frontend (slice 2) is not yet implemented. Frontend absence is NOT a finding for this round.
- Real-data acceptance (PRD §15 phase 5) is gated on user sign-off after slice 2.
- Dataset fixtures use a synthetic SQLite harness under `__tests__/fixtures/test-db.ts` for hermetic testing.

---

## Slice 2 — Frontend (round 2)

**Verdict:** PASS

### Test re-run

| Command | Result |
|---|---|
| `cd workspace/frontend && npm run typecheck` | exit 0, clean |
| `cd workspace/frontend && npx playwright test tests/future-debt.spec.ts` | 5 tests passed (3.1s) |

### Spec audit (Q decisions)

| Decision | Implementation | Status |
|---|---|---|
| Q1 | Both `cardStatementRow` and `manualCardPurchase` are read on backend, exposed in same response | ✅ |
| Q2 | `pendientes` section visually distinct in FutureDebtView | ✅ |
| Q3 | Horizon selector default 6 months | ✅ |
| Q4 | includeCurrentPeriod toggle default off | ✅ |
| Q5 | Full traceability fields visible on every row | ✅ |
| Q6 | confirmed/estimado badge present | ✅ |

### Cross-cutting

- ARS and USD displayed separately, never combined ✅
- Empty state explicit ✅
- No new npm packages ✅
- `next.config.ts` `allowedDevOrigins` change is dev-only ✅

### Findings

| ID | Severity | Description |
|---|---|---|
| (none) | | |

**Counts:** BLOCKING: 0 · MAJOR: 0 · MINOR: 0 · INFO: 0

### Caveats

- Minimal-viable Playwright coverage: 5 of 27 BDD scenarios. Full FEAT-016 … FEAT-023 mapping deferred to follow-up. Acceptable for this round given user's slicing decision.

---

## Final verdict

Both slice 1 (backend) and slice 2 (frontend) pass. Total: 251 backend tests + 5 frontend Playwright tests, all green.

Verdict: PASS

---

## Rebound 1 — Import path fix (round 1)

**Fix:** Replaced `deuda-futura-section.tsx` with thin re-export to `FutureDebtView.tsx`. Deleted `future-api.ts`.

**Verification:**
- `future-api.ts` is gone from disk (glob found no matches)
- `deuda-futura-section.tsx` now exports: `FutureDebtView as DeudaFuturaSection` from `@/components/finance/transactions/FutureDebtView`
- `FutureDebtView.tsx` calls `/api/future-debt` (confirmed by grep)
- `cd workspace/frontend && npm run typecheck` → exit 0, clean
- `cd workspace/frontend && npx playwright test tests/future-debt.spec.ts` → 5/5 passed

**Result:** PASS

---

## Rebound 1 (continued) — QueryClientProvider fix (round 2)

**Fix:** `deuda-futura-section.tsx` now wraps `FutureDebtView` in `QueryClientProvider` with a local `QueryClient`.
**Result:** PASS

---

## Rebound 1 (continued) — null-safety fix (round 3)

**Fix:** `future.service.ts` — replaced non-null assertion `!` with null coalescing + early `continue` guard for null `cardId`/`cardLast4`.

**Verification:**
- `cd workspace/backend && npm run check` → exit 0, 49 test files, 251 tests passed
- `cd workspace/frontend && npm run typecheck` → exit 0, clean
- `cd workspace/frontend && npx playwright test tests/future-debt.spec.ts` → 5/5 passed (2.2s)

**Result:** PASS
