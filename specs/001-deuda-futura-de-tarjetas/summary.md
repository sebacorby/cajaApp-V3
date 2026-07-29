# Summary: 001-deuda-futura-de-tarjetas

## What was built
CajaApp now exposes a deterministic, read-only view of confirmed future credit-card debt from persisted installment occurrences, grouped by calendar month, card, and currency. The rejected movements-based implementation was replaced by `GET /api/future-debt`, with source traceability, diagnostics, deduplication, exact ARS/USD totals, horizon controls, and a frontend view. Backend and frontend automated validation passed; real-data acceptance remains gated on the user's sign-off.

## Status
PASS — backend and frontend validation passed (backend round 1; frontend round 2).

## Capabilities shipped
- RN-001…RN-016: calendar sequencing; current/final exclusion; original amount preservation; currency separation; identity and deduplication; source exclusion; persisted-period authority; non-destructive reads; bounded horizon; exact totals; persistence; invalid-data diagnostics; traceability; stable ordering; and idempotent serialization.
- Q1: accepted statement rows and manual purchases with persisted plans.
- Q2: missing-card occurrences appear in `pendientes` with diagnostics and do not enter card totals.
- Q3: six-month default horizon, extensible to 24 months.
- Q4: current period hidden by default and user-toggleable.
- Q5: complete traceability is visible directly on each row.
- Q6: assumed `projected` obligations are functionally shown as confirmed.
- Q7: controlled Datasets A–D precede user-selected real-data acceptance.
- Endpoint: `GET /api/future-debt?from=YYYY-MM&months=6&includeCurrentPeriod=false`.

## Files added/modified
- `workspace/backend/src/modules/future/`
- `workspace/backend/src/app.ts`
- `workspace/backend/src/modules/projections/installment-projection.service.ts`
- `workspace/backend/src/config/env.ts`
- `workspace/backend/vitest.config.ts`
- `workspace/backend/package.json`
- `workspace/frontend/src/lib/finance/future-debt-api.ts`
- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`
- `workspace/frontend/src/app/test/future-debt/page.tsx`
- `workspace/frontend/tests/future-debt.spec.ts`
- `workspace/frontend/next.config.ts`
- `docs/technical.md`
- `docs/domain.md`
- `docs/CHANGELOG.md`
- `features/FEAT-015-future-installment-projections.feature.old`

## Tests added
- 49 backend test files / 251 tests passing.
- 5 frontend Playwright tests passing.

## Deviations
- Environment version guard softened only in test mode.
- Vitest configuration hardened for deterministic SQLite tests.
- Legacy `parseInstallment` fallback retained for existing callers; the new future module uses strict parsing.
- Next.js `allowedDevOrigins` added for development-only Playwright execution.
- Playwright coverage is minimal-viable rather than the full scenario matrix.

## Known limitations / follow-up
- Full 27-scenario FEAT-016…FEAT-023 coverage at the Playwright layer is deferred.
- Real-data acceptance remains pending the user's controlled dataset and sign-off.
- `FutureDebtView` remains on its test route; integration into the production section router is pending.

## Cross-references
- [Validation results](validation-results.md)
- [Implementation report](implementation_report.md)
- [Technical documentation](../../docs/technical.md)
- [Domain documentation](../../docs/domain.md)
- [Changelog](../../docs/CHANGELOG.md)

## Notes
The historical FEAT-015 baseline was superseded and deprecated after confirmation. No Prisma migration or new npm package was introduced; no Git commit was recorded in this checkout.
