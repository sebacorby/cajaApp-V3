# Specification: 001-deuda-futura-de-tarjetas

PRD: [PRD.md](PRD.md)

## FEAT-016: Confirmed Future Debt Visualization

functional

Basic future-debt visualization, monthly calendar sequencing, installment projection, and the empty state.

Scenarios: [FEAT-016-confirmed-future-debt-visualization.feature](features/FEAT-016-confirmed-future-debt-visualization.feature)
Active: features/FEAT-016-confirmed-future-debt-visualization.feature

## FEAT-017: Future Debt Exclusion Rules

functional

Exclusion of current and completed installments, preservation of imported installment amounts, and prevention of source-purchase double counting.

Scenarios: [FEAT-017-future-debt-exclusion-rules.feature](features/FEAT-017-future-debt-exclusion-rules.feature)
Active: features/FEAT-017-future-debt-exclusion-rules.feature

## FEAT-018: Multi-currency Future Debt Totals

functional

Separate ARS and USD totals and exact reconciliation between visible detail and monthly totals.

Scenarios: [FEAT-018-multi-currency-future-debt-totals.feature](features/FEAT-018-multi-currency-future-debt-totals.feature)
Active: features/FEAT-018-multi-currency-future-debt-totals.feature

## FEAT-019: Future Debt Identity and Deduplication

functional

Functional identity of an occurrence and safe deduplication without removing distinct installments from the same plan.

Scenarios: [FEAT-019-future-debt-identity-and-deduplication.feature](features/FEAT-019-future-debt-identity-and-deduplication.feature)
Active: features/FEAT-019-future-debt-identity-and-deduplication.feature

## FEAT-020: Invalid Data and Diagnostics

functional

Safe handling of invalid installments, missing currencies, missing card references, and functionally confirmed projected obligations.

Scenarios: [FEAT-020-invalid-data-and-diagnostics.feature](features/FEAT-020-invalid-data-and-diagnostics.feature)
Active: features/FEAT-020-invalid-data-and-diagnostics.feature

## FEAT-021: Future Debt Persistence and Horizon

functional

Six-month default horizon, extension up to 24 months, current-period visibility control, and continued availability without new statements.

Scenarios: [FEAT-021-future-debt-persistence-and-horizon.feature](features/FEAT-021-future-debt-persistence-and-horizon.feature)
Active: features/FEAT-021-future-debt-persistence-and-horizon.feature

## FEAT-022: Idempotent and Non-destructive Reads

functional

Stable repeated reads and the guarantee that opening or refreshing the future-debt view does not mutate persisted data.

Scenarios: [FEAT-022-idempotent-and-non-destructive-reads.feature](features/FEAT-022-idempotent-and-non-destructive-reads.feature)
Active: features/FEAT-022-idempotent-and-non-destructive-reads.feature

## FEAT-023: Future Debt Traceability and Card Grouping

functional

Card-level attribution and complete source traceability displayed directly on every visible future-debt row.

Scenarios: [FEAT-023-future-debt-traceability-and-card-grouping.feature](features/FEAT-023-future-debt-traceability-and-card-grouping.feature)
Active: features/FEAT-023-future-debt-traceability-and-card-grouping.feature

---

## Supplementary Notes

- The original PRD contains 23 named scenarios despite describing the set as 22 scenarios. All 23 source scenarios are preserved across these files.
- Four additional scenarios document the resolved horizon, current-period visibility, and `projected`-state decisions.
- The original source-purchase scenario already covers a manual card purchase with persisted future occurrences, so no duplicate manual-purchase scenario was added.
- The default horizon is six months, and the user may extend the view up to 24 months without deleting occurrences outside the selected range.
- A missing card reference is shown in a separate `pendientes` section and is not included in card totals.
