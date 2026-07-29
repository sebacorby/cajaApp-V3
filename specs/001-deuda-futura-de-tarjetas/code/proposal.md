# Proposal: Debt-Future-Debt-001 — Verified Credit-Card Future Debt

## Why

CajaApp needs a verifiable future-credit-card-debt view that the user can audit month by month, card by card, and currency by currency. The functional artifact for this feature was rejected after a real-use test because the existing implementation did not match the user's intuition of "debt that is already committed but not yet billed."

The current backend (`workspace/backend/src/modules/future/future.service.ts`) reads from the `movements` universe and treats `card_installment` projections as the only source of card debt. This produces four visible failures:

1. **It depends on a derived layer.** The endpoint calls `movementsService.getMovements(...)` instead of reading the actual `CardStatementRow` and `ManualCardPurchase` records. Whenever the movements universe is incomplete or out of sync, the future-debt view is wrong.
2. **It does not surface the source row.** The response carries `sourceType: "card_installment"` and a synthetic `sourceId`, but the user cannot trace a row back to the original statement row, the statement version, the card brand, or the purchase source.
3. **It silently drops rows that do not classify.** Rows whose source type is `card_statement` or `card_manual_purchase` return `null` from `classifyMovement` and never appear in the response. The user therefore cannot see "this purchase is the source of these installments" and cannot detect missing-card references.
4. **It does not separate currency totals visually.** The `MoneyBucket` structure mixes ARS and USD on the same record (`confirmedCardDebt: { ars, usd }`) and the frontend renders a single `MoneyPair` widget per metric. The user sees a number per metric but cannot tell at a glance that the ARS and USD totals are independent.

The data the system needs **already exists**, persisted in `CardInstallmentProjection` (created on statement acceptance) and `ManualCardPurchase` (created through the manual-purchase flow). Only the read path is wrong. This change replaces the read path with a deterministic, source-of-truth-driven query layer that the user can verify row by row.

## What Changes

### Backend — read-only determined future-debt view

- **Rewrite** `workspace/backend/src/modules/future/future.service.ts` to be a pure read-only query layer over `CardInstallmentProjection` joined with `CardStatementRow`, `CardStatement`, `CardStatementGroup`, and `ManualCardPurchase`. The new module does not write to any persisted table.
- **Add** a new endpoint `GET /api/future-debt` that returns the contract defined in `specs.md`. The existing `/api/future-commitments` endpoint is removed (no alias, no versioned rewrite) because its contract is incompatible with the new behavior.
- **Reuse** the existing `CardInstallmentProjection` rows that are already persisted when a statement is accepted (`workspace/backend/src/modules/cards/cards.service.ts` → `acceptDraft` → `installmentProjectionService.calculateProjections`) and when a manual purchase is created (`workspace/backend/src/modules/manual-purchases/manual-purchases.service.ts` → `createPurchase`). No new model is needed.
- **Apply** RN-001…RN-016 as deterministic functions inside the service layer. They are not configurable; they are the spec.
- **Update** `workspace/backend/src/app.ts` to register the new module and remove the old module's registration only if the new endpoint strictly replaces it (no coexistence).

### Frontend — single auditable view

- **Replace** `workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx` with a new component bound to the new endpoint. The new component renders rows directly without requiring expansion.
- **Update** `workspace/frontend/src/lib/finance/future-api.ts` to expose the new contract (or replace the file with a new client module). The previous `FutureOverview`/`FutureComponent` types are replaced.
- **Add** a `pendientes` section for occurrences without a valid card reference.

### Tests

- **Add** unit tests for each pure rule (RN-001…RN-016) as standalone functions in `workspace/backend/src/modules/future/rules/`.
- **Add** integration tests with Datasets A, B, C, D (per PRD section 14) seeded into a disposable SQLite database.
- **Add** API contract tests for the new endpoint.
- **Add** frontend BDD tests (Playwright) covering the user-visible flows from FEAT-016…FEAT-023.
- **Add** a determinism test (RN-016) that asserts two consecutive reads return byte-identical JSON.
- **Add** a non-destructive test (RN-009) that snapshots the DB before and after a read.

## Scope

**In scope:**

- A read-only, deterministic endpoint that returns confirmed future-card debt grouped by `monthKey`, by card, and by currency.
- Traceability fields on every returned row (card, period, description, N/M, amount, currency, origin type, source reference, confirmed state).
- A `pendientes` section for occurrences without a valid card, with a diagnostic.
- Idempotent reads (RN-016) — two reads with no data change return identical JSON.
- Non-destructive reads (RN-009) — reads never mutate plans, installments, statements, or purchases.
- Horizan control: default 6 months, max 24 months, current-period hidden by default with `includeCurrentPeriod=true` toggling it on.
- Detection and exclusion of invalid data with traceable diagnostics (RN-013, RN-014).
- Two-phase acceptance: controlled Datasets A–D, then user's real data.

**Out of scope:**

- Migration / backfill of historical `CardInstallmentProjection` rows that may be incorrect (PRD section 17 risk; addressed in a separate PRD).
- Reconciliation against a later statement.
- PDF extraction, AI prompt/provider changes, mapper changes, importer changes.
- Statement review/acceptance UI.
- Installment advance, cancellation, refinancing, future interest, bank plans not present in the data.
- Loans, rent, or non-card commitments.
- Income projection.
- Full frontend visual redesign.
- Adding a new authentication layer.

## Capabilities

**New:**
- `GET /api/future-debt` — verified future-card-debt view.
- `pendientes` section in the future-debt response for missing-card occurrences.
- Diagnostics payload in the response (RN-013, RN-014).
- Pure rule functions for RN-001…RN-016 as the implementation of the spec.

**Modified:**
- `workspace/backend/src/modules/future/` — replaced read-only verified layer.
- `workspace/backend/src/app.ts` — registers the new endpoint and removes the old one.
- `workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx` — replaced.
- `workspace/frontend/src/lib/finance/future-api.ts` — replaced client/types.

**Removed:**
- `GET /api/future-commitments` and its supporting types.
- The `movements`-based card-debt derivation in `future.service.ts`.

## Inputs

- **PRD**: `specs/001-deuda-futura-de-tarjetas/functional/PRD.md` (PRD-APP-FUTURE-DEBT-001 v1.0.0).
- **Discovery**: `specs/001-deuda-futura-de-tarjetas/functional/discovery.md`.
- **Gherkin**: `specs/001-deuda-futura-de-tarjetas/functional/gherkin.md` and the eight `.feature` files under `features/`.

## Success Criteria (mirrors PRD §16)

- 100% of approved mandatory scenarios pass in real use.
- No economic duplication is visible.
- Totals exactly match the visible detail.
- ARS and USD remain separate.
- No current installment is presented as future debt by default.
- No installment is shifted by adding 30 days.
- Future debt remains available without new monthly uploads.
- Every amount can be traced to its origin.
- The user explicitly accepts the result on real data.
