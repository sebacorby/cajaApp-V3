# Tasks: 001-deuda-futura-de-tarjetas

This is the BDD-implementation task checklist. Each task is completable in one work session and is ordered by test-first discipline: failing scenarios first, then domain code, then wiring.

The BDD testing styles (per `IADEV-bdd-implementation`) are:

- **Unit (Vitest)** — pure rule functions, no side effects.
- **Integration (Vitest + SQLite)** — service-level behavior with seeded fixtures.
- **API contract (Vitest + Fastify `app.inject`)** — endpoint contract.
- **E2E (Playwright)** — user-visible flows.

The behavior specification is the eight `.feature` files under `specs/001-deuda-futura-de-tarjetas/functional/features/`. Every `Scenario:` in those files must end up with at least one passing test.

## 1. Pure rule functions (RN-001…RN-016 as unit tests)

Each rule is a small pure function. The tests below check the boundary cases that the Gherkin scenarios raise.

- [ ] 1.1 `addMonths` (RN-001) — calendar arithmetic, never `+30 days`
  - Description: Implement `monthKeyWithOffset` (already exists in `future.service.ts:96`) but **as a separate function in `rules/month-sequence.ts`** that the new module imports. Cover: shift from `2026-12` to `2027-01`, Feb-28/29 cases, Idempotency of `+0`.
- [ ] 1.2 `parseInstallment` (RN-003) — `1/1` and final installments produce no future rows
  - Description: When `installmentCurrent === installmentTotal`, the future schedule is empty. Cover `1/1`, `6/6`, `2/2`, `12/12`.
- [ ] 1.3 `applyAmountRule` (RN-004) — imported amount is not divided again
  - Description: An amount of `18000` for `3/6` produces three future rows each with `18000`. Cover positive (ARS, USD), negative (does not apply — installments are positive).
- [ ] 1.4 `addCents` (RN-005) — currency separation
  - Description: `addCents(bucket, "ARS", 100n)` only adds to `bucket.ars`. `addCents(bucket, "USD", 100n)` only adds to `bucket.usd`. Cover mixed accumulation.
- [ ] 1.5 `occurrenceIdentity` (RN-006) — dedup tuple
  - Description: Tuple `(sourceType, sourceId, installmentNumber, monthKey, currency, cardId)`. Two rows with identical tuple collide. Two rows with different `monthKey` do not.
- [ ] 1.6 `excludeSourcePurchase` (RN-007) — source purchase not summed
  - Description: The current installment of the statement (e.g., `3/6` in `2026-07`) is not in the future-debt total. The source purchase (`ManualCardPurchase` itself) is not in the future-debt total.
- [ ] 1.7 `useMonthKeyNotDate` (RN-008) — period is `monthKey`, not `dateIso`
  - Description: A row with `dateIso = "2026-06-28"` and `monthKey = "2026-08"` is grouped in `2026-08`, not in `2026-06`.
- [ ] 1.8 `partitionByValidity` (RN-013) — invalid data → diagnostics, not totals
  - Description: Rows with missing currency skip the totals and increment `diagnostics.missingCurrencyRows`. Rows with missing card skip the card totals and increment `diagnostics.missingCardRows`. Rows with invalid installment skip the totals and increment `diagnostics.invalidInstallmentRows`.
- [ ] 1.9 `stableOrder` (RN-015) — chronological, then by card and reference
  - Description: Months sorted by `monthKey` ascending. Cards sorted by `(cardLast4, holderName)`. Rows sorted by `(originReference, installmentNumber)`. Empty arrays stay empty.
- [ ] 1.10 `serializedDeterminism` (RN-016) — sorted-key JSON output
  - Description: Two calls with the same input produce byte-identical strings after `JSON.stringify` with a sorted-key replacer.

## 2. Service integration with seeded fixtures (Datasets A–D)

The datasets are scripted as TypeScript fixtures in `tests/future/fixtures/`. Each dataset is a `seed(db)` function that drops/creates the rows described in PRD §14.

- [ ] 2.1 Dataset A — basic ARS cases
  - Description: Seed `1/1`, `1/3`, `3/6`, `6/6` in `2026-07`. Assert that the only future rows are `2/3` in `2026-08`, `3/3` in `2026-09`, `4/6` in `2026-08`, `5/6` in `2026-09`, `6/6` in `2026-10`. Totals per month: `2026-08` ARS = 10 000 + 25 000 = 35 000, `2026-09` ARS = 10 000 + 25 000 = 35 000, `2026-10` ARS = 25 000.
- [ ] 2.2 Dataset B — currencies
  - Description: Seed one ARS and one USD row in `2026-08`. Assert `totals.ars = "10000.00"`, `totals.usd = "40.00"`, no conversion attempted.
- [ ] 2.3 Dataset C — duplication
  - Description: Seed a source purchase with three persisted installments; insert a deliberate duplicate of one of the installments. Assert the duplicate is dropped, `diagnostics.duplicateOccurrences = 1`, and the totals include the installment once.
- [ ] 2.4 Dataset D — invalid data
  - Description: Seed rows with empty installment, ambiguous installment, missing currency, missing card. Assert no future row is generated, and each bad row appears in `pendientes` with the correct `diagnostic` label. The `diagnostics` counters reflect the counts.
- [ ] 2.5 Multi-statement persistence
  - Description: Seed two accepted statements (e.g., `2026-07` and `2026-08`) with overlapping installment plans. Assert that the future-debt view naturally aggregates across both statements without any explicit "merge" step.

## 3. API contract tests

- [ ] 3.1 `GET /api/future-debt?from=2026-08&months=6` — happy path
  - Description: With Dataset A, returns the expected envelope: `range.from = "2026-08"`, `range.to = "2027-01"`, `range.months = 6`, six months (or fewer if data ends earlier), `summary.ars / summary.usd` correct.
- [ ] 3.2 `GET /api/future-debt?from=2026-08&months=6&includeCurrentPeriod=true` — current-period toggle
  - Description: With Dataset A and an active statement in `2026-07`, the response includes `2026-07` only when `includeCurrentPeriod=true`. Default behavior hides it.
- [ ] 3.3 `GET /api/future-debt?from=invalid` — invalid query
  - Description: Returns 400 with `code: "INVALID_QUERY"`. Zod error message included.
- [ ] 3.4 `GET /api/future-debt?from=2026-08&months=25` — out-of-range horizon
  - Description: Returns 400 with `code: "INVALID_QUERY"`. The error message mentions the max (24).
- [ ] 3.5 `GET /api/future-debt?from=2026-08&months=0` — zero horizon
  - Description: Returns 400. Empty response is not a valid answer.
- [ ] 3.6 Schema validation of every response field
  - Description: A round-trip test that asserts the response JSON shape matches the Zod-derived schema in `specs.md`. Every numeric field is a string (decimal), every enum is from the allowed set.

## 4. Determinism (RN-016) and non-destructiveness (RN-009)

- [ ] 4.1 Two consecutive reads with no data change return byte-identical JSON
  - Description: Run the endpoint twice with no intervening writes. `JSON.stringify(response1, sortKeys) === JSON.stringify(response2, sortKeys)`.
- [ ] 4.2 Read does not modify any table
  - Description: Snapshot the cardinality of every persisted table before and after a read. Unchanged. The Prisma query log shows only `SELECT` calls.
- [ ] 4.3 Read does not invoke a transaction
  - Description: Wrap the read with a Prisma middleware that flags any `$transaction` call. Assert no transaction is opened.
- [ ] 4.4 Read does not invoke the LLM or any AI provider
  - Description: A network-recording test (or a stub `fetch`) asserts no outbound requests occur during the read.

## 5. Frontend BDD tests (Playwright)

The frontend component tests align with the eight feature files. Each `Scenario:` becomes a Playwright test whose name contains the FEAT-ID and the scenario name.

- [ ] 5.1 FEAT-016 — empty state renders a comprehensible message
  - Description: With no future rows, the page shows an empty-state card (per PRD §11). The ARS and USD totals are absent or shown as zero.
- [ ] 5.2 FEAT-016 — `1/3` and `3/6` projections
  - Description: With Dataset A seeded, the August panel shows `2/3` and `4/6` rows directly. No expansion is required.
- [ ] 5.3 FEAT-016 — purchase date does not change the period
  - Description: A row with `dateIso = "2026-06-28"` and `monthKey = "2026-08"` renders under August.
- [ ] 5.4 FEAT-016 — calendar months, not 30 days
  - Description: A row whose `monthKey` shifts across Feb 28/29 still lands in the next month.
- [ ] 5.5 FEAT-017 — `1/1` and `6/6` produce no future rows
  - Description: The future-debt view does not list any row for `1/1` or `6/6`.
- [ ] 5.6 FEAT-017 — imported amount is not divided
  - Description: A row with `installmentLabel = "3/6"` and `amount = "18000.00"` renders three future rows each with `18000.00`.
- [ ] 5.7 FEAT-017 — source purchase not summed
  - Description: A `ManualCardPurchase` of `90000` in 3 installments does not contribute `90000` to the totals; only the three `30000` installments do.
- [ ] 5.8 FEAT-018 — currencies separated
  - Description: ARS and USD totals are rendered in separate chips. No combined total.
- [ ] 5.9 FEAT-018 — total matches detail
  - Description: With three ARS rows of `10000`, `15000`, `25000`, the displayed total is `50000` and the component-rendered sum equals `50000`.
- [ ] 5.10 FEAT-019 — duplicate deducted; counter visible
  - Description: A duplicate row is collapsed; the diagnostics surface shows `duplicateOccurrences: 1`.
- [ ] 5.11 FEAT-019 — distinct installments of the same plan are not duplicates
  - Description: `4/6` in August and `5/6` in September are both rendered.
- [ ] 5.12 FEAT-020 — invalid installment is not invented
  - Description: A row with an empty `installmentRaw` produces no future row, and the diagnostics counter is positive.
- [ ] 5.13 FEAT-020 — missing currency goes to `pendientes`
  - Description: A row with `currencyOriginal = "MIXED"` appears in `pendientes` with `diagnostic: "missing_currency"`.
- [ ] 5.14 FEAT-020 — missing card goes to `pendientes`
  - Description: A row whose source group has no `cardLast4` appears in `pendientes` with `diagnostic: "missing_card_reference"`.
- [ ] 5.15 FEAT-020 — `projected` state is rendered as `confirmed`
  - Description: Every future row's `status` chip says "Confirmado".
- [ ] 5.16 FEAT-021 — default horizon is 6 months
  - Description: The initial request sends `months=6` and the response covers 6 months.
- [ ] 5.17 FEAT-021 — horizon can be extended to 24 months
  - Description: The user selects 24 months in the horizon selector; the response covers 24 months.
- [ ] 5.18 FEAT-021 — current period hidden by default
  - Description: With an active statement in `2026-07`, the July panel is not rendered.
- [ ] 5.19 FEAT-021 — current period shown when toggled
  - Description: The user activates the "show current period" option; the July panel is rendered.
- [ ] 5.20 FEAT-021 — persistence without new imports
  - Description: After three months of no imports, the rows remain visible.
- [ ] 5.21 FEAT-022 — two reads return identical rows
  - Description: A Playwright test that reads the view twice and asserts the DOM is byte-identical.
- [ ] 5.22 FEAT-022 — opening and refreshing does not mutate data
  - Description: The DB cardinality is unchanged after the test.
- [ ] 5.23 FEAT-023 — card-grouped totals
  - Description: With Visa and Mastercard rows in the same month, the UI shows each card's contribution and the total matches the sum.
- [ ] 5.24 FEAT-023 — every traceability field is visible without expansion
  - Description: All required fields (card, period, description, N/M, amount, currency, origin, reference, status) are present in the DOM at the default viewport.

## 6. Two-phase acceptance

- [ ] 6.1 Run Dataset A against the live backend
  - Description: Seed Dataset A in the dev DB; open the future-debt view; verify row by row and total by total.
- [ ] 6.2 Run Dataset B against the live backend
  - Description: Repeat with currency data.
- [ ] 6.3 Run Dataset C
  - Description: Repeat with duplication data.
- [ ] 6.4 Run Dataset D
  - Description: Repeat with invalid data.
- [ ] 6.5 Run the user-selected real dataset
  - Description: After A–D pass, the user runs a real dataset. Row-by-row comparison with the user's manual computation. Explicit acceptance.

## 7. Migration cleanup (separate, deferred)

- [ ] 7.1 Identify historically incorrect `CardInstallmentProjection` rows
  - Description: Run a read-only diagnostic against the dev DB that flags rows with `installmentCurrent === installmentTotal` (which should not exist as future rows). Document the count. Do not delete in this PRD.
- [ ] 7.2 File a follow-up PRD for backfill / cleanup
  - Description: A separate PRD documents the migration plan. This PRD does not authorize it.

## 8. Verification

- [ ] 8.1 `npm run typecheck` passes in the backend
  - Description: No TS errors.
- [ ] 8.2 `npm run build` passes in the backend
  - Description: Compiles cleanly.
- [ ] 8.3 `npm run test` passes in the backend
  - Description: All Vitest suites green.
- [ ] 8.4 `npm run typecheck` passes in the frontend
  - Description: No TS errors.
- [ ] 8.5 `npm run lint` passes in the frontend
  - Description: ESLint clean.
- [ ] 8.6 `npm run build` passes in the frontend
  - Description: Next.js build succeeds.
- [ ] 8.7 Playwright suite passes
  - Description: All 24 frontend BDD tests covered in section 5 pass.
- [ ] 8.8 Coverage report — every Gherkin scenario has at least one test
  - Description: A coverage matrix maps each `Scenario:` to a test. No gaps.
- [ ] 8.9 Manual smoke — typecheck/build/test/Playwright report captured
  - Description: Reports saved under `docs/05-evidence/` for the verification pass.
