# 001-deuda-futura-de-tarjetas -- Implementation Plan

> **For the Developer agent:** Execute this plan task by task using strict test-driven development. Track each `- [ ]` checkbox; only check it when the verification command and expected result in that step are observed. Do not write `implementation_report.md` until implementation is complete.

## Summary

Build a read-only, deterministic future-credit-card-debt view that reads existing `CardInstallmentProjection` records, enriches them with accepted-statement or manual-purchase traceability, and presents auditable monthly card groups with independent ARS/USD totals, pending-data diagnostics, a selectable 6–24 month horizon, and an optional current-period view. The rejected movements-based contract is replaced atomically by `GET /api/future-debt`; no import behavior, persisted schema, or historical data is changed.

## Goal

Let the user verify every confirmed future card obligation by month, card, currency, installment, and origin, with exact totals and without duplicate, destructive, or non-deterministic reads.

## Architecture summary

The Fastify module becomes a query-only adapter over Prisma's existing `CardInstallmentProjection`, joined to existing statement, row, group, and manual-purchase records for traceability. Pure TypeScript rules validate, partition, deduplicate, sort, and aggregate normalized occurrences using integer cents; Zod owns the HTTP request and response boundaries. The existing finance section is replaced in place by a React view that calls the new endpoint and renders the full response directly; Vitest covers rules, SQLite integration, and HTTP behavior, while Playwright mirrors all 27 active Gherkin scenarios.

## Tech stack

- Language / runtime: TypeScript 5.7 on Node.js 24.18.0 (backend); TypeScript 5 on React 19 (frontend).
- Framework: Fastify 5.2 and Next.js 16.
- Persistence: Prisma 6.5 with SQLite; existing tables only.
- Validation and money: existing Zod, `workspace/backend/src/shared/money.ts`, and calendar helpers.
- Testing: Vitest 3 for backend; Playwright 1.61 for browser BDD.
- UI/data fetching: existing Tailwind/shadcn/Radix primitives and the repository's existing fetch pattern.

## Scope confirmation

The authoritative scope is [`code/proposal.md` — Scope](code/proposal.md#scope).

**In scope (this plan delivers):**

- Replace the rejected movements-based future view with a read-only `CardInstallmentProjection` query.
- Accepted-statement and persisted manual-card-purchase installments only.
- RN-001 through RN-016: calendar periods, exclusions, original installment amounts, currency separation, economic deduplication, source exclusion, persisted period use, non-destructive reads, bounded horizon, exact totals, persistence, diagnostics, traceability, stable order, and idempotence.
- `GET /api/future-debt` with the locked query and response contract.
- Monthly cards, separate ARS/USD totals, directly visible detail, `pendientes`, diagnostics, confirmed badges, horizon selector, current-period toggle, empty/loading/error states.
- Controlled Datasets A–D followed by user-selected real-data acceptance.

**Out of scope (do NOT touch in this plan):**

- Prisma migrations, schema/column/table changes, or historical projection backfill/cleanup.
- Statement acceptance, installment generation semantics, PDF extraction, AI, importer mapping, or review UI changes.
- Automatic reconciliation, cancellation, early payoff, refinancing, future interest, or bank-plan inference.
- Income, loans, rent, non-card commitments, dashboard behavior, or a general future-cash-flow replacement.
- Authentication, complete visual redesign, exchange-rate conversion, or persisted diagnostic tables.
- Refactoring `cards/`, `manual-purchases/`, `movements/`, shared money/date utilities, or unrelated Playwright suites “while here.”

**Minimalism guardrail:** no task may add behavior outside the list above. Treat incorrect historical rows or incorrect upstream projection creation as separate findings, not permission to mutate or backfill data.

## Package & dependency recommendations

No dependency changes. This is a hard ceiling: use the existing Fastify, Prisma, Zod, Vitest, React/Next, TanStack/fetch conventions, and Playwright packages; do not install, remove, swap, or major-upgrade packages.

## API contract (locked)

- Method/path: `GET /api/future-debt`.
- Query parameters:
  - `from`: valid `YYYY-MM`; optional at the HTTP boundary and defaults to the current UTC month.
  - `months`: coercible integer from 1 through 24; optional, default `6`.
  - `includeCurrentPeriod`: coercible HTTP boolean; optional, default `false`. Accept only unambiguous `true`/`false` values—do not use JavaScript truthiness for the string `"false"`.
- The UI label is “horizon,” but the network parameter is always `months`; do not introduce a `horizon` query parameter or alias.
- Success: HTTP 200 with the exact envelope in [`code/specs.md` — Common technical contract](code/specs.md#common-technical-contract--endpoint): `range`, `summary`, `horizon`, `months`, `pendientes`, and `diagnostics`.
- Invalid month/month count/boolean: HTTP 400, `{ code: "INVALID_QUERY", message: string }`.
- Unexpected error: HTTP 500, `{ code: "INTERNAL_ERROR", message: string }` through the existing app handler.
- The response contains no request-time timestamp or audit field. Exact deterministic ordering is month key, card `(cardLast4, holderName, cardId)`, then row `(originReference, installmentNumber, id)`.

## Source artifacts

- PRD: `specs/001-deuda-futura-de-tarjetas/PRD.md` (canonical copy also at `functional/PRD.md`).
- Behavior index: `specs/001-deuda-futura-de-tarjetas/functional/gherkin.md`.
- Active behavior: root `features/FEAT-016-*.feature` through `features/FEAT-023-*.feature` (27 scenarios total).
- Discovery: `specs/001-deuda-futura-de-tarjetas/functional/discovery.md`.
- Proposal: `specs/001-deuda-futura-de-tarjetas/code/proposal.md`.
- Specs: `specs/001-deuda-futura-de-tarjetas/code/specs.md`.
- Design: `specs/001-deuda-futura-de-tarjetas/code/design.md`.
- High-level tasks: `specs/001-deuda-futura-de-tarjetas/test/tasks.md`.

## Feature -> task index

| FEAT-ID | Active scenarios | Primary coverage |
|---|---:|---|
| FEAT-016 | 5 | T1 RN-001/002/004/008; T2 Dataset A; T7 browser flows |
| FEAT-017 | 4 | T1 RN-002/003/004/007; T2 Datasets A/C; T7 browser flows |
| FEAT-018 | 3 | T1 RN-005/011; T2 Dataset B; T7 browser flows |
| FEAT-019 | 2 | T1 RN-006; T2 Dataset C; T7 browser flows |
| FEAT-020 | 4 | T1 RN-013/014; T2 Dataset D; T7 browser flows |
| FEAT-021 | 5 | T1 RN-010/012; T2 persistence; T3 query contract; T7 controls |
| FEAT-022 | 2 | T4 RN-016; T5 RN-009; T7 refresh flow |
| FEAT-023 | 2 | T1 RN-011/014/015; T2 card grouping; T7 visible detail |

## File-by-file change list

### Backend production

| Path | Action and single responsibility |
|---|---|
| `workspace/backend/src/modules/future/future.types.ts` | Create canonical internal and response types: raw/normalized occurrence, card/month groups, diagnostics, query, and response envelope. Keep persisted raw values distinct from validated output values. |
| `workspace/backend/src/modules/future/rules/month-sequence.ts` | Create calendar month-key validation/offset/range functions for RN-001 and range filtering for RN-010; never use day arithmetic. |
| `workspace/backend/src/modules/future/rules/exclusion.ts` | Create predicates for RN-002/003/007/008: persisted future occurrence inclusion, final/current/source exclusion, and use of `monthKey` rather than purchase date. |
| `workspace/backend/src/modules/future/rules/amount.ts` | Create original-amount normalization and integer-cent aggregation for RN-004/011; delegate parsing/serialization to existing money helpers. |
| `workspace/backend/src/modules/future/rules/currency.ts` | Create valid-currency guard and currency-specific bucket addition for RN-005; never convert or combine ARS and USD. |
| `workspace/backend/src/modules/future/rules/identity.ts` | Create `occurrenceIdentity(occurrence): string` and stable deduplication for RN-006 using source type/id, installment number, period, currency, and card ID. |
| `workspace/backend/src/modules/future/rules/diagnostics.ts` | Create validity partition for RN-013: included rows versus pending rows, counters, diagnostics, and warnings without persistence. |
| `workspace/backend/src/modules/future/rules/traceability.ts` | Create accepted/manual source normalization and required traceability projection for RN-014, including functional `confirmed` status. |
| `workspace/backend/src/modules/future/rules/ordering.ts` | Create non-mutating stable comparators/sort functions for RN-015. |
| `workspace/backend/src/modules/future/serializers/response.ts` | Create deterministic response normalization/serialization for RN-016; no timestamps and no unstable insertion/database ordering. |
| `workspace/backend/src/modules/future/future.service.ts` | Rewrite per design AD §1/§2 as `FutureDebtService`: SELECT existing projections and source records, normalize, apply rules, group, total, diagnose, and return `FutureDebtResponse`; remove all `movementsService` use and all writes. Export an injectable class plus the app singleton. |
| `workspace/backend/src/modules/future/future.schemas.ts` | Rewrite with Zod schemas for the locked query and every response branch; export inferred query/response types where useful. |
| `workspace/backend/src/modules/future/future.controller.ts` | Rewrite the GET handler to validate query input, call `futureDebtService.getFutureDebt(query)`, validate/serialize the response, and map query failures to `INVALID_QUERY` under existing error conventions. |
| `workspace/backend/src/modules/future/future.routes.ts` | Replace `/api/future-commitments` registration with `/api/future-debt`; expose GET only. |
| `workspace/backend/src/modules/projections/installment-projection.service.ts` | Review and keep unchanged per design AD §2. It is the upstream write path, not the read implementation. Modify only if a pre-existing RN-001/003/004 characterization test proves the design claim false; if false, stop and escalate because importer/acceptance changes exceed this plan. There is no file at `modules/future/installment-projection.service.ts`; do not create a duplicate. |
| `workspace/backend/src/app.ts` | Keep the existing `futureRoutes` registration; only adjust import/export names if the rewritten route module requires it. |

### Backend tests

The repository historically uses `workspace/backend/tests/future/`, but this change's locked layout is colocated under the future module. Do not keep equivalent duplicate suites in both locations.

| Path | Action and responsibility |
|---|---|
| `workspace/backend/src/modules/future/__tests__/rules/rn-001.test.ts` … `rn-016.test.ts` | Create one fast, database-free Vitest file per rule. Each file names RN and relevant FEAT scenarios and uses tiny inline values. RN-009/012/016 get pure characterization assertions here; their real persistence/HTTP guarantees remain in T2/T4/T5. |
| `workspace/backend/src/modules/future/__tests__/fixtures/dataset-a.ts` … `dataset-d.ts` | Create deterministic, seedable fixture builders for PRD §14. Each exports seed data/seed operation and explicit expected rows/totals/diagnostics; IDs and dates are fixed, never random/current-time based. |
| `workspace/backend/src/modules/future/__tests__/service.test.ts` | Replace old movements-based service assertions with disposable-SQLite service integration over Datasets A–D and multi-statement persistence. |
| `workspace/backend/src/modules/future/__tests__/api.test.ts` | Add Fastify `app.inject` tests for path, defaults, query coercion/rejection, response schema, old endpoint removal, and GET-only behavior. |
| `workspace/backend/src/modules/future/__tests__/determinism.test.ts` | Add RN-016: two identical inject calls have byte-identical response bodies. |
| `workspace/backend/src/modules/future/__tests__/non-destructive.test.ts` | Add RN-009: projection-table count and a canonical row checksum are unchanged after 100 endpoint reads; assert only reads occur where Prisma instrumentation supports it. |
| `workspace/backend/tests/future/future.service.test.ts` | Remove after replacement tests are RED; it encodes the rejected movements/income/other-commitment contract. |

### Frontend

Existing code confirms the user surface is a section, not a transaction-list child. Keep the public component in the existing section boundary and place focused child components under `transactions/future-debt/`.

| Path | Action and responsibility |
|---|---|
| `workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx` | Replace implementation with a thin section adapter that renders `FutureDebtView`; retain the section-router contract and exported `DeudaFuturaSection`. |
| `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx` | Create the client view: fetch state, period cards, separate ARS/USD totals, horizon selector (default 6, sends `months`), current-period toggle, pending section, diagnostics, empty/loading/error states, and directly visible full-detail rows with Confirmado badge. |
| `workspace/frontend/src/components/finance/transactions/future-debt/FutureDebtMonth.tsx` | Create one monthly period/card grouping renderer with exact month/card totals. |
| `workspace/frontend/src/components/finance/transactions/future-debt/FutureDebtRow.tsx` | Create one directly visible traceability row: card, period, description, N/M, amount/currency, origin type/reference, and status. |
| `workspace/frontend/src/components/finance/transactions/future-debt/FutureDebtPending.tsx` | Create the Q2 `pendientes` and diagnostic rendering; pending amounts never appear in card totals. |
| `workspace/frontend/src/lib/finance/future-debt-api.ts` | Create locked request/response types and `getFutureDebt({ from?, months?, includeCurrentPeriod? }, signal?)`; construct `/api/future-debt` query with `months`, request with `cache: "no-store"`, and preserve server decimal strings. |
| `workspace/frontend/src/lib/finance/future-api.ts` | Remove once no imports remain; do not preserve rejected types or endpoint aliases. |
| `workspace/frontend/src/components/finance/sections/section-router.tsx` | Keep routing to `DeudaFuturaSection`; change only if import location/export changes. |
| `workspace/frontend/tests/future-debt.spec.ts` | Create 27 named Playwright tests mirroring every active FEAT-016…FEAT-023 scenario. Prefer route interception with contract-faithful payloads for UI-only assertions; use real backend setup for persistence/read guarantees where required. |
| `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts` | Remove/replace because it tests the rejected non-card movements view. Leave unrelated deuda-futura suites unchanged. |

## TDD-ordered task groups

### T1 — Pure rule tests (RN-001…RN-016)

**Files:**
- Create `workspace/backend/src/modules/future/__tests__/rules/rn-001.test.ts` through `rn-016.test.ts`.
- Later production targets: `workspace/backend/src/modules/future/rules/*.ts` and `serializers/response.ts` listed above.

**Skills the Developer should look for:** anything for strict red-green-refactor testing, TypeScript unit testing, calendar-period arithmetic, and integer monetary calculations.

- [ ] **T1.1: Establish the focused command and baseline**

Run from the repository root:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/
```

Expected: exit 0 with “No test files found” before files are created, or only pre-existing matching tests pass. Record the exact baseline; the completed rule suite must remain under 1 second of reported test duration.

- [ ] **T1.2: Write RN-001 through RN-004 failing tests**

Create four files with one assertion concept per case:
- RN-001: `2026-07 + 1 = 2026-08`, `2026-12 + 1 = 2027-01`, February advances to March regardless of leap year, offset zero is stable.
- RN-002: a projection equal to the active statement period is excluded by default and retained only when current-period inclusion is true.
- RN-003: `1/1`, `2/2`, `6/6`, and `12/12` produce no later installment; no `7/6` can pass validation.
- RN-004: a `3/6` row with ARS `18000.00` yields future amounts of `18000.00`, never `3000.00`; repeat for USD.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-00{1,2,3,4}.test.ts
```

Expected: RED for missing exports/modules, not syntax or fixture errors.

- [ ] **T1.3: Write RN-005 through RN-008 failing tests**

- RN-005: ARS changes only `ars`; USD changes only `usd`; mixed input remains two totals and performs no conversion.
- RN-006: identical six-field identity tuples collide; changing installment number, period, currency, card, source type, or source ID yields a distinct key; duplicate count increments once.
- RN-007: a manual source purchase of ARS `90000.00` plus three persisted ARS `30000.00` occurrences totals only occurrences.
- RN-008: `dateIso=2026-06-28` with persisted `monthKey=2026-08` groups under August.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-00{5,6,7,8}.test.ts
```

Expected: RED for the intended missing rule contracts.

- [ ] **T1.4: Write RN-009 through RN-012 failing tests**

- RN-009 pure characterization: aggregation does not mutate a frozen input collection or its rows. The real DB guarantee is T5.
- RN-010: default range has six month keys; valid boundaries are 1 and 24; 0 and 25 reject; filtering does not mutate out-of-range input.
- RN-011: monthly and card totals exactly equal visible row cents independently for ARS/USD; `10000 + 15000 + 25000 = 50000.00`.
- RN-012 pure characterization: response construction depends solely on supplied persisted occurrences, not on a newly imported statement or current clock.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-0{09,10,11,12}.test.ts
```

Expected: RED for the intended missing contracts.

- [ ] **T1.5: Write RN-013 through RN-016 failing tests**

- RN-013: invalid installment, unsupported/missing currency, and missing card never enter card/month/summary totals; each gets the specified pending diagnostic/counter.
- RN-014: visible accepted-statement and persisted-manual rows expose every required field and status `confirmed`; missing-card rows retain safe origin traceability.
- RN-015: months ascending; cards by last4/holder/cardId; rows by origin/installment/id; equal values use deterministic tie breakers; input remains unmodified.
- RN-016: equivalent inputs in different raw order serialize to byte-identical output with no time-dependent field.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-0{13,14,15,16}.test.ts
```

Expected: RED for missing rule modules/exports.

- [ ] **T1.6: Verify the complete rule suite is RED for implementation reasons**

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/
```

Expected: all 16 files are discovered; failures identify missing/new contracts, with no test compile/setup failures. Reported test duration remains under 1 second once module-resolution failures are replaced by assertions.

**Done criteria:** all RN IDs have focused tests, all relevant active scenario outcomes are represented at the unit layer, and RED is documented. Do not make them green before T6.

### T2 — Service tests with Datasets A–D

**Files:**
- Create `workspace/backend/src/modules/future/__tests__/fixtures/dataset-a.ts` through `dataset-d.ts`.
- Create `workspace/backend/src/modules/future/__tests__/service.test.ts`.
- Remove `workspace/backend/tests/future/future.service.test.ts` after replacement RED is confirmed.

**Skills the Developer should look for:** anything for isolated database integration testing, deterministic fixtures, Prisma test cleanup, and financial assertion design.

- [ ] **T2.1: Define deterministic seed fixture contracts**

Each fixture must use fixed IDs and clean only rows it owns. Dataset A expected five visible rows: Aug `2/3` 10000 and `4/6` 25000; Sep `3/3` 10000 and `5/6` 25000; Oct `6/6` 25000. Dataset B has one ARS 10000 and one USD 40 in Aug. Dataset C has one source, three economic occurrences, and one duplicate raw occurrence. Dataset D covers empty/ambiguous installment, missing currency, and missing card with explicit expected diagnostics. Export expected row IDs, periods, totals, and counters alongside seeding.

Run:

```bash
cd workspace/backend && npx tsc -p tsconfig.json --noEmit
```

Expected: exit 0 for fixture types, or only the known missing future-service types targeted by T6; no implicit `any` and no wall-clock/random fixture data.

- [ ] **T2.2: Write Dataset A/B service tests**

Instantiate `FutureDebtService` with the repository's test Prisma dependency. Assert exact row counts, installment labels, periods, per-card/per-month/summary totals, zero opposite-currency totals, and no `1/1`, current, or post-final rows.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/service.test.ts
```

Expected: RED because the old service reads movements or lacks the injectable projection query.

- [ ] **T2.3: Write Dataset C/D service tests**

Assert Dataset C returns each economic installment once and `duplicateOccurrences = 1`. Assert Dataset D contributes zero unsafe value to summary/card totals, creates correctly labelled pending rows, and reports exact invalid/missing counters without inventing currency/card/installments.

Run the same command.

Expected: RED on deduplication/diagnostic behavior, not seeding.

- [ ] **T2.4: Write persistence and card-grouping service tests**

Seed two accepted statements with overlapping plans and Visa/Mastercard rows. Assert both persisted plans remain visible without a merge/reprojection call, each card contribution is exact, summary equals month totals, and source references remain distinct.

Run the same command.

Expected: RED on the rejected service behavior.

- [ ] **T2.5: Verify service suite RED and replace obsolete tests**

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/service.test.ts tests/future/future.service.test.ts
```

Expected before deletion: new suite RED and old rejected-contract suite may pass. Remove only `tests/future/future.service.test.ts`, rerun the new path, and expect the same intentional RED.

**Done criteria:** seed/cleanup is isolated, Datasets A–D have exact expected values, multi-statement/card grouping is pinned, no test changes production data outside its fixture scope, and the suite is designed to run in under 5 seconds.

### T3 — API contract tests via `app.inject`

**Files:** create `workspace/backend/src/modules/future/__tests__/api.test.ts`.

**Skills the Developer should look for:** anything for Fastify injection testing, Zod boundary validation, and HTTP contract testing.

- [ ] **T3.1: Write happy-path and default-query RED tests**

Use `buildApp()` and `app.inject`. Assert GET `/api/future-debt` returns 200; omitting all query fields yields current UTC `from`, `months=6`, `includeCurrentPeriod=false`; explicit `from=2026-08&months=6` yields `range.to=2027-01`. Validate the entire body using the exported response Zod schema, including decimal strings and enums.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/api.test.ts
```

Expected: RED with 404 or old contract/path/schema mismatch.

- [ ] **T3.2: Write query-boundary RED tests**

Cover valid `months=1`, `months=24`, and literal booleans; reject malformed month, impossible month, 0, 25, fractional/non-numeric months, and ambiguous boolean values. Every invalid query must be HTTP 400 with code `INVALID_QUERY` and a useful message.

Run the same command.

Expected: RED on current defaults/max/error code.

- [ ] **T3.3: Write replacement-surface RED tests**

Assert `/api/future-commitments` is 404, `/api/future-debt` does not accept POST/PUT/DELETE, and no response exposes the rejected income/other-commitment buckets.

Run the same command.

Expected: RED because the old route is still registered.

**Done criteria:** defaults, bounds, boolean semantics, response shape, old-route removal, and GET-only behavior are all pinned in RED.

### T4 — Determinism test (RN-016)

**Files:** create `workspace/backend/src/modules/future/__tests__/determinism.test.ts`.

**Skills the Developer should look for:** anything for deterministic serialization and HTTP integration testing.

- [ ] **T4.1: Write and verify the RN-016 RED test**

Seed a deliberately unsorted Dataset C-like set. Make two consecutive identical `app.inject` calls with no write between them. Compare `response.body` directly byte-for-byte—not parsed/re-stringified objects—and additionally assert the parsed month/card/row order. Confirm no timestamp/audit field exists rather than normalizing one away.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/determinism.test.ts
```

Expected: RED due to route absence, unstable order, or contract mismatch.

**Done criteria:** the test compares actual wire bytes and identifies the intended determinism gap.

### T5 — Non-destructive test (RN-009)

**Files:** create `workspace/backend/src/modules/future/__tests__/non-destructive.test.ts`.

**Skills the Developer should look for:** anything for safe database snapshots, Prisma query instrumentation, and read-only integration tests.

- [ ] **T5.1: Build the canonical projection snapshot helper in the test**

Snapshot `CardInstallmentProjection` count plus a SHA-256 checksum of canonical JSON containing every projection field sorted by stable ID. Include source statement/row/group/manual-purchase counts and stable state fields so creation, deletion, replacement, or status/reference mutation is detectable. Do not hash the SQLite file itself because connection metadata/journaling can change independently of business rows.

Run:

```bash
cd workspace/backend && npx tsc -p tsconfig.json --noEmit
```

Expected: helper type-checks without production changes.

- [ ] **T5.2: Write and verify the 100-read RED test**

Seed controlled rows, snapshot before, issue 100 sequential GET requests, snapshot after, and assert exact count/checksum equality. Where the existing Prisma client exposes query events safely, assert the future-debt operation emits no INSERT/UPDATE/DELETE/UPSERT and does not call projection creation; do not introduce a package or brittle SQL parser.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/non-destructive.test.ts
```

Expected: RED until the new endpoint exists; if the existing read mutates data, the checksum/count assertion must expose it.

**Done criteria:** 100 reads leave all relevant business rows byte-equivalent under canonical snapshotting.

### T6 — Backend production code (GREEN for T1–T5)

**Files:** all backend production and test paths in the file list; review-only `workspace/backend/src/modules/projections/installment-projection.service.ts`; possible minimal import adjustment in `workspace/backend/src/app.ts`.

**Skills the Developer should look for:** anything for Prisma query design, Fastify routing, Zod schemas, integer money, TypeScript refactoring, and TDD.

- [ ] **T6.1: Review the upstream projection service without changing it**

Confirm `calculateProjections(rows, statementPeriodKey)` uses calendar schedules, omits final/current installments, and preserves source installment amounts. Confirm accepted statements and manual purchases already persist projections. If any claim is false, stop: record the discrepancy and escalate it as a separate upstream behavior issue. Do not modify acceptance/import/manual-purchase flows under this plan.

Run:

```bash
cd workspace/backend && npm test -- projections cards manual-purchases
```

Expected: existing relevant tests pass; no source file changes are needed in `installment-projection.service.ts`.

- [ ] **T6.2: Create types and minimal RN-001…RN-004 rules**

Define the named internal/response types in `future.types.ts`. Implement focused contracts in `month-sequence.ts`, `exclusion.ts`, and `amount.ts`: valid calendar month offsets, current/final/source exclusion, persisted `monthKey` authority, and original integer-cent amount preservation. Reuse shared helpers where their serialized output matches the locked API decimal strings; do not use floating point.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-00{1,2,3,4}.test.ts
```

Expected: GREEN, 0 failures.

- [ ] **T6.3: Implement minimal RN-005…RN-008 rules**

Implement `currency.ts` and `identity.ts`, plus source/date predicates in `exclusion.ts`. `occurrenceIdentity` must encode all six locked identity dimensions without display-label ambiguity. Dedup before totals/grouping and retain a stable diagnostic count.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-00{5,6,7,8}.test.ts
```

Expected: GREEN, 0 failures.

- [ ] **T6.4: Implement minimal RN-009…RN-012 rules**

Keep transforms non-mutating; generate bounded month ranges; aggregate card/month/summary cents from included visible rows only; preserve out-of-window persisted data and report `horizon.persistedMonths` without recalculating or deleting it.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-0{09,10,11,12}.test.ts
```

Expected: GREEN, 0 failures.

- [ ] **T6.5: Implement minimal RN-013…RN-016 rules and serializer**

Implement validity partition, diagnostic counters/warnings, accepted/manual traceability, functional confirmed status, deterministic tie-broken sorting, and stable wire serialization. Pending invalid-currency/missing-card rows retain safe detail but never enter monetary/card totals. Do not add generated timestamps.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/rules/rn-0{13,14,15,16}.test.ts
```

Expected: GREEN, 0 failures.

- [ ] **T6.6: Rewrite `FutureDebtService` as an injectable read service**

Export `FutureDebtService` with constructor-injected Prisma-compatible reader/logger dependencies and `getFutureDebt(query: FutureDebtQuery): Promise<FutureDebtResponse>`, plus the application singleton. Query all persisted projection months needed to report visible range and `persistedMonths`; resolve statement rows/groups for non-manual records and manual purchases for `isManual` records; avoid N+1 queries using available Prisma relations/batched ID lookups. Normalize raw records once, then call the tested rules in sequence. No `create`, `update`, `delete`, `upsert`, `$transaction`, movements service, AI, or reprojection call is permitted.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/service.test.ts
```

Expected: GREEN, exact Datasets A–D and persistence assertions, reported duration under 5 seconds.

- [ ] **T6.7: Rewrite Zod schemas and controller**

Export `futureDebtQuerySchema`, `futureDebtResponseSchema`, `FutureDebtQueryInput`, and response-inferred types. Compute the default `from` from UTC at parse/request time, not module import time. Parse `months` and strict string booleans. The controller validates input, calls `getFutureDebt`, validates response, and emits `INVALID_QUERY` consistently using the existing `AppError`/validation conventions.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/api.test.ts
```

Expected: API assertions become GREEN except any route-prefix assertion pending T6.8.

- [ ] **T6.8: Replace route registration atomically**

Register the controller at `/api/future-debt`; remove `/api/future-commitments`; retain the single `futureRoutes` registration in `app.ts`. Do not add aliases.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/api.test.ts
```

Expected: GREEN, including 404 for the old route and 400 `INVALID_QUERY` boundaries.

- [ ] **T6.9: Verify RN-016 and RN-009 GREEN**

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/determinism.test.ts src/modules/future/__tests__/non-destructive.test.ts
```

Expected: GREEN; actual response bodies are byte-identical and count/checksum remain unchanged after 100 reads.

- [ ] **T6.10: Refactor only duplication exposed by tests**

Consolidate repeated normalization/comparator/diagnostic logic only within the focused module; keep files single-purpose and preserve all test contracts. Do not create generic frameworks or refactor adjacent modules.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/
```

Expected: GREEN, 0 failures; rules under 1 second and service tests under 5 seconds in normal local execution.

- [ ] **T6.11: Commit backend increment**

```bash
git add workspace/backend/src/modules/future workspace/backend/src/app.ts workspace/backend/tests/future/future.service.test.ts
git commit -m "feat(future): serve verified card debt projections"
```

Expected: commit succeeds if the workspace is under Git. If this checkout is not a Git repository, record “commit unavailable: no Git repository” and continue without initializing one.

**Done criteria:** T1–T5 are GREEN; endpoint is read-only and locked; old route/contract is absent; no schema/package/upstream write changes exist.

### T7 — Frontend BDD and implementation

**Files:** all frontend paths in the file list, especially `workspace/frontend/tests/future-debt.spec.ts` and `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`.

**Skills the Developer should look for:** anything for end-to-end browser testing, accessible React component design, request interception, and deterministic UI fixtures.

- [ ] **T7.1: Write 27 Playwright scenario tests before UI changes**

Create one test per active scenario. Every name must contain the FEAT-ID and a unique substring of the Spanish scenario name. Translate each `Antecedentes` block into shared fixture/setup, not repeated prose. Use contract-faithful intercepted responses for visual behavior and controlled backend seeding for persistence/mutation scenarios. Required distribution: FEAT-016=5, FEAT-017=4, FEAT-018=3, FEAT-019=2, FEAT-020=4, FEAT-021=5, FEAT-022=2, FEAT-023=2.

Run (requires configured frontend/backend services per Playwright config):

```bash
cd workspace/frontend && npx playwright test tests/future-debt.spec.ts
```

Expected: RED on missing new API requests, controls, pending section, direct detail, or rejected UI text—not on service startup or fixture setup.

- [ ] **T7.2: Pin network behavior and controls in RED**

In FEAT-021 tests, assert initial request uses `months=6` and `includeCurrentPeriod=false`, never `horizon`; selecting 24 sends `months=24`; toggling current period sends `includeCurrentPeriod=true`. Verify 6/24 visible boundaries and no UI deletion/recalculation action. Add accessible labels for selector/toggle assertions.

Run the same command.

Expected: RED because the current UI defaults to 12 and has no current-period toggle.

- [ ] **T7.3: Create typed API client**

Implement the request/response types matching backend Zod output and `getFutureDebt` contract described in the file list. Preserve decimal strings; reject non-OK responses with the repository's existing error-message convention; support abort signals and no-store reads. Do not add runtime validation dependencies or a `horizon` parameter.

Run:

```bash
cd workspace/frontend && npm run typecheck
```

Expected: exit 0 for the client or only failures in the not-yet-rewired old component imports.

- [ ] **T7.4: Implement the minimal FutureDebtView states and controls**

Create `FutureDebtView` with default six-month state, current-period false state, current UTC/user month passed as `from`, cancellation-safe loading, retry/error state, explicit empty state with zero ARS/USD meaning, horizon selector, refresh, and current-period toggle. Ensure a refresh only performs GET.

Run the focused Playwright file.

Expected: FEAT-016 empty and FEAT-021 control scenarios become GREEN; remaining detail scenarios may stay RED.

- [ ] **T7.5: Implement month/card/detail presentation**

Create focused month and row components. Render separate ARS and USD totals at summary/month/card levels with no combined monetary total. Render every traceability field directly without collapsed details. Use deterministic response order; do not resort by localized display text. Render persisted projections from accepted/manual sources as “Confirmado.”

Run the focused Playwright file.

Expected: FEAT-016/017/018/019/023 scenarios become GREEN except diagnostics/pending cases.

- [ ] **T7.6: Implement pending and diagnostic presentation**

Render one `pendientes` section for missing currency, missing card, and invalid installment diagnostics. Show safe row details and diagnostic labels/counters; never fold pending values into card totals. Provide stable `data-testid` values for month, card, row, pending section, totals, diagnostics, horizon, and toggle only where accessible roles/text are insufficient.

Run the focused Playwright file.

Expected: FEAT-020 and duplicate-diagnostic scenarios become GREEN.

- [ ] **T7.7: Replace the section adapter and rejected E2E test**

Make `DeudaFuturaSection` a thin render of `FutureDebtView`; keep `section-router.tsx` routing key `deuda`. Remove `future-api.ts` and the old movements-based `tests/e2e/deuda-futura/future.spec.ts` only after all imports/tests are replaced. Do not modify unrelated deuda-futura tests.

Run:

```bash
cd workspace/frontend && npm run typecheck && npx playwright test tests/future-debt.spec.ts
```

Expected: typecheck exit 0 and all 27 focused scenarios pass.

- [ ] **T7.8: Verify frontend GREEN and refactor**

Remove duplicated rendering/setup, keep shared Playwright setup per feature, and confirm no scenario was collapsed or skipped.

Run:

```bash
cd workspace/frontend && npm run lint && npm run typecheck && npx playwright test tests/future-debt.spec.ts
```

Expected: exit 0, 27 passed, 0 failed, 0 skipped.

- [ ] **T7.9: Commit frontend increment**

```bash
git add workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx workspace/frontend/src/components/finance/sections/section-router.tsx workspace/frontend/src/components/finance/transactions workspace/frontend/src/lib/finance/future-debt-api.ts workspace/frontend/src/lib/finance/future-api.ts workspace/frontend/tests/future-debt.spec.ts workspace/frontend/tests/e2e/deuda-futura/future.spec.ts
git commit -m "feat(frontend): show auditable future card debt"
```

Expected: commit succeeds when Git is available; otherwise document the unavailable commit without creating a repository.

**Done criteria:** all 27 active scenarios have distinct passing Playwright tests; controls send locked parameters; full detail, separate totals, pending diagnostics, and confirmed state are directly visible.

### T8 — Real-data acceptance (blocked)

**Files:** no production or fixture modification. Evidence belongs in the Developer's later `specs/001-deuda-futura-de-tarjetas/implementation_report.md`, not in this planning task.

**Skills the Developer should look for:** anything for safe local acceptance testing, database backup, and evidence capture without exposing financial data.

- [ ] **T8.1: Confirm the acceptance gate is unblocked**

Do not continue until T1–T7, final developer verification, and Tester heavy gates are green, and the user identifies the real dataset. Back up the user's local database using the existing application process; never commit financial data.

Run:

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/
```

Expected: 0 failures before real data is accessed.

- [ ] **T8.2: Run controlled Datasets A–D through the live view**

For each dataset, compare every displayed row, period, installment label, ARS/USD amount, card, reference, status, pending diagnostic, and total with PRD §14 expectations. Dataset A has five rows and 35000/35000/25000 ARS by Aug/Sep/Oct; B has separate 10000 ARS and 40 USD; C counts one economic occurrence per installment and reports one duplicate; D invents no debt and exposes diagnostics.

Run:

```bash
cd workspace/frontend && npx playwright test tests/future-debt.spec.ts
```

Expected: 27 passed before manual comparison is signed off.

- [ ] **T8.3: Run user-selected real-data comparison**

Issue the locked GET for the agreed `from` and `months`, open Deuda futura, and compare response/UI row-by-row and total-by-total against the user's manual calculation. Do not repair or delete historical rows during acceptance. Any incorrect persisted projection is recorded as a separate upstream/backfill issue.

Verification: user explicitly states acceptance or rejection.

Expected: explicit user acceptance; absence of a response is not acceptance.

**Done criteria:** controlled and real datasets are accepted explicitly by the user, with no production data mutation or financial-data commit.

## Implementation order

```text
T1 rule RED
  -> T2 service/fixture RED
    -> T3 API RED
      -> T4 determinism RED
        -> T5 non-destructive RED
          -> T6 backend GREEN/refactor
            -> T7 frontend BDD RED/GREEN/refactor
              -> Final verification and Tester handoff
                -> T8 controlled + user real-data acceptance
```

Do not implement backend production behavior before T1–T5 demonstrate the intended failures. Within T6, make the smallest rule slices green first, then service, HTTP, determinism, and non-destructive tests. T8 remains blocked even when automated tests pass until the user provides and approves the real dataset.

## Risks for the developer

- **Upstream projection correctness:** the design assumes accepted statements and manual purchases already create correct `CardInstallmentProjection` rows. Characterize, do not silently repair. A false assumption requires a separate scoped decision because importer/acceptance changes are out of scope.
- **Actual file location:** `installment-projection.service.ts` is under `workspace/backend/src/modules/projections/`, not `modules/future/`. Do not duplicate it in the future module.
- **Data-model relation shape:** inspect generated Prisma types/schema before choosing joins. `rowId` resolves to different source tables according to `isManual`; batch lookup safely rather than assuming a polymorphic Prisma relation.
- **Current period:** the planning design mentions an active accepted statement query, but the exact schema fields must match the existing Prisma model. Use the existing persisted representation that identifies the active statement period; do not add `isActiveForPeriod` or any column if absent. If no active statement exists, return `currentPeriodKey: null` and treat the toggle as a no-op.
- **`from` default:** specs originally described `from` as required while the resolved locked contract defaults it. The user resolution in this plan is binding: omission defaults to current UTC month.
- **Boolean coercion:** generic coercion often turns the string `"false"` into true. Parse literal HTTP boolean strings explicitly.
- **Determinism:** database order, locale comparison, `Date.now()`, random fixture IDs, and insertion-order serialization can all break byte identity. Apply total ordering with stable tie breakers and omit timestamps.
- **Money serialization:** existing helpers may format display locale strings while the API examples require decimal strings such as `10000.00`. Verify helper semantics and keep wire values contract-compliant without floats; frontend handles localized display.
- **Invalid rows:** some invalid installment sources may never create projection rows on the upstream path. Dataset D may need controlled persistence at the closest valid test boundary; do not alter the production schema or invent a write path to make diagnostics testable.
- **Pending totals:** missing-card/missing-currency/invalid rows remain auditable but must not contaminate card, month, or summary totals.
- **Horizon metadata:** the visible SQL range and `horizon.persistedMonths` have different purposes. Ensure out-of-window months can be reported without returning their rows or mutating them.
- **Test database isolation:** never point fixture or 100-read tests at the user's `dev.db`. Verify test database configuration before seeding and clean fixed fixture IDs reliably.
- **No AI/network use:** the endpoint must not invoke movements, extraction, LLM, or external exchange-rate services. The absence follows from dependency boundaries; do not add a broad network-mocking package.
- **Existing E2E assumptions:** the rejected Playwright test creates a generic manual movement, which is no longer future card debt. Replace only that test; unrelated future/deuda suites may test other product surfaces and must remain untouched.
- **Repository state:** grounding states there may be no Git repository. Execute commit commands only where Git exists; never initialize Git merely to satisfy plan checkpoints.

## Definition of Done

The specification is done only when all of the following are true:

- RN-001…RN-016 pure-rule files are green and the focused rule run completes in under 1 second locally.
- Service tests for Datasets A–D and multi-statement persistence are green, with exact row counts, periods, totals, diagnostics, and under-5-second focused runtime.
- API contract tests are green for locked path, defaults, bounds, strict booleans, response schema, GET-only behavior, and old-route removal.
- Two consecutive real HTTP injections return byte-identical bodies with no excluded timestamp normalization.
- Projection/source row counts and canonical checksums are unchanged after 100 reads.
- The service reads existing `CardInstallmentProjection` records directly, issues no writes/reprojection/AI/movements calls, and preserves upstream modules.
- ARS and USD are independent at summary, month, and card levels; visible detail reconstructs each total exactly.
- Pending and diagnostic behavior is visible and excluded from card totals.
- All 27 scenarios in active FEAT-016…FEAT-023 have distinct, passing, non-skipped Playwright tests.
- Backend tests/build and frontend lint/typecheck/build pass.
- No Prisma migration, schema change, package change, historical backfill, or out-of-scope refactor exists.
- Controlled Datasets A–D pass in the live view.
- The user explicitly accepts the row-by-row and total-by-total real-data result.

### Task 9: Verification (run by the Developer)

**Files:** no production changes; record results later in `specs/001-deuda-futura-de-tarjetas/implementation_report.md`.

**Skills the Developer should look for:** anything for TypeScript verification, linters, test runners, and BDD coverage auditing.

- [ ] **Step 9.1: Backend type checker/build gate**

The backend has no separate lint/typecheck script; `build` is its configured TypeScript gate.

```bash
cd workspace/backend && npm run build
```

Expected: exit 0, 0 TypeScript errors.

- [ ] **Step 9.2: Backend focused and full unit/integration suite**

```bash
cd workspace/backend && npm test -- src/modules/future/__tests__/ && npm test
```

Expected: exit 0, 0 failures, 0 errors, no skipped future tests.

- [ ] **Step 9.3: Frontend linter**

```bash
cd workspace/frontend && npm run lint
```

Expected: exit 0, 0 errors.

- [ ] **Step 9.4: Frontend type checker**

```bash
cd workspace/frontend && npm run typecheck
```

Expected: exit 0, 0 errors.

- [ ] **Step 9.5: Confirm scenario coverage**

Enumerate all 27 active scenarios in the later implementation report and map each to its exact `workspace/frontend/tests/future-debt.spec.ts` test name plus any supporting unit/integration test. Counts must be 5+4+3+2+4+5+2+2, with no skipped scenario or Examples row.

Verification command:

```bash
cd workspace/frontend && npx playwright test tests/future-debt.spec.ts --list
```

Expected: 27 uniquely named tests, each carrying FEAT-016 through FEAT-023 as appropriate.

### Task 10: Tester handoff (run by the Tester, not the Developer)

The Developer lists these gates under “Deferred to the Tester” in the later implementation report.

| Gate | Configured? | Command / action |
|---|---|---|
| Backend integration/API | yes | `cd workspace/backend && npm test -- src/modules/future/__tests__/` |
| Frontend E2E | yes | `cd workspace/frontend && npx playwright test tests/future-debt.spec.ts` |
| Backend build | yes | `cd workspace/backend && npm run build` |
| Frontend build | yes | `cd workspace/frontend && npm run build` |
| Full Playwright regression | yes | `cd workspace/frontend && npx playwright test` |
| Pre-commit/pre-push hooks | no configured gate found | Do not invent a command. |
| Data mutation audit | yes | Re-run the 100-read non-destructive test and inspect the reported before/after count/checksum. |
| Real-data acceptance | user-gated | Execute T8 only after all preceding gates pass and the user supplies the controlled real dataset. |
