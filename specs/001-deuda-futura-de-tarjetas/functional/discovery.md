# Discovery — APP-FUTURE-DEBT-001

## Change & PRD

- **Change identifier:** `001-deuda-futura-de-tarjetas`
- **Product:** CajaApp V3
- **Original PRD:** `PRD-APP-FUTURE-DEBT-001.md`
- **PRD status:** Draft for functional validation; it does not authorize implementation.
- **Functional artifact source:** [PRD.md](PRD.md)

This discovery output formalizes the product behavior requested by the PRD. It does not authorize code changes or make technical design decisions.

## Summary

CajaApp will provide a verifiable view of confirmed future credit-card obligations grouped by monthly period, card, and currency. The view consumes accepted statement data and manual card purchases with persisted installment plans, excludes current or unsafe obligations according to explicit rules, prevents double counting, and exposes complete source traceability. Reading the view is non-destructive and future obligations remain available without requiring a new monthly statement.

The formal behavior specification extends the active baseline `FEAT-015-future-installment-projections.feature`, which was not sufficiently rigorous for real-use correctness.

## User Story and Persona

### Primary persona: personal finance administrator

The user manages their own finances in CajaApp and needs to know what credit-card obligations are already committed in future months. They need to plan cash availability without confusing a purchase source with its installment occurrences, mixing ARS and USD, or relying on another statement import to preserve known obligations.

### User story

> As a CajaApp user, I want to see my confirmed future credit-card obligations by month, card, and currency, with every amount traceable to its source, so that I can plan future payments confidently and verify each total from the visible detail.

### Product actors

- **User:** Reviews future obligations, changes the visible horizon, optionally reveals the current period, and investigates diagnostics and source references.
- **CajaApp system:** Reads persisted occurrences, applies inclusion and exclusion rules, groups visible obligations, calculates separate currency totals, deduplicates economic duplicates, and exposes diagnostics.
- **Statement importer:** An upstream source of accepted statement data. It is outside this change and must not be modified by this feature.

## Features

| ID | Feature | Type | Scenarios |
|---|---|---|---|
| FEAT-016 | Confirmed Future Debt Visualization | functional | [Feature file](features/FEAT-016-confirmed-future-debt-visualization.feature) |
| FEAT-017 | Future Debt Exclusion Rules | functional | [Feature file](features/FEAT-017-future-debt-exclusion-rules.feature) |
| FEAT-018 | Multi-currency Future Debt Totals | functional | [Feature file](features/FEAT-018-multi-currency-future-debt-totals.feature) |
| FEAT-019 | Future Debt Identity and Deduplication | functional | [Feature file](features/FEAT-019-future-debt-identity-and-deduplication.feature) |
| FEAT-020 | Invalid Data and Diagnostics | functional | [Feature file](features/FEAT-020-invalid-data-and-diagnostics.feature) |
| FEAT-021 | Future Debt Persistence and Horizon | functional | [Feature file](features/FEAT-021-future-debt-persistence-and-horizon.feature) |
| FEAT-022 | Idempotent and Non-destructive Reads | functional | [Feature file](features/FEAT-022-idempotent-and-non-destructive-reads.feature) |
| FEAT-023 | Future Debt Traceability and Card Grouping | functional | [Feature file](features/FEAT-023-future-debt-traceability-and-card-grouping.feature) |

The PRD names 23 scenarios in section 13 although it describes them as 22. All 23 named scenarios are retained, and four additional scenarios document the resolved horizon, current-period visibility, and `projected`-state decisions.

## Resolved Decisions

The following decisions were pending in PRD section 19 and were explicitly resolved by the user before the functional artifacts were written.

### Q1 — Initial scope: statements and manual purchases

The initial scope includes both:

- Installments derived from accepted card statement rows (`CardStatementRow` / accepted statement source).
- Manual card purchases (`ManualCardPurchase`) when a persisted installment plan exists.

The source-purchase double-counting scenario already covers a manual purchase and its persisted occurrences. The statement-based projection scenarios cover accepted summaries.

### Q2 — Missing card reference: pending section

An occurrence without a valid card reference is not included in card totals and is not silently discarded. It is displayed in a separate `pendientes` section with a traceable incomplete-data diagnostic. The system does not invent a card.

### Q3 — Default horizon: six months

The default future-debt horizon is six months. The user can extend the visible horizon up to 24 months. Limiting the horizon affects visibility only; it does not delete occurrences outside the selected range.

### Q4 — Current period: hidden by default, user-toggleable

The current period is hidden by default when the relevant installment belongs to the current statement. The user can activate an equivalent visibility control to show the current period when required. The rule does not silently treat every occurrence as belonging to the current statement.

### Q5 — Complete detail directly visible

Every visible future-debt row directly shows all required traceability fields without requiring an expansion:

- period;
- card;
- description;
- installment number and total;
- amount and currency;
- origin type;
- statement or manual-purchase reference;
- confirmed or estimated state.

### Q6 — `projected` state from an assumed obligation is functionally confirmed

An occurrence stored with technical state `projected` is functionally shown as confirmed when its source demonstrates an already-assumed obligation, specifically an accepted statement or a manual purchase with a persisted installment plan. The functional state is determined by the obligation source, not by the technical label alone.

### Q7 — Two-phase acceptance dataset

Acceptance uses two phases:

1. Run the controlled PRD datasets A, B, C, and D.
2. Run a real, user-selected dataset after the controlled cases pass.

The user performs row-by-row and total-by-total comparison and explicitly confirms that real behavior matches the approved PRD.

## Product Rules Confirmed by the PRD

- Future installments advance by calendar months represented as `YYYY-MM`; adding 30 days is not valid.
- The current installment in the accepted statement belongs to that statement period and is not future debt by default.
- A `1/1` purchase and a final installment such as `6/6` produce no later occurrence.
- An imported installment amount is already the amount of one installment and is never divided again.
- A source purchase is not counted in addition to its represented future occurrences.
- ARS and USD retain their source currencies and have independent totals; no automatic conversion is performed.
- A functional occurrence identity includes, at minimum, source plan or purchase identity, installment number, period, currency, and card.
- Every monthly currency total equals the exact sum of its visible included rows.
- Invalid or incomplete data cannot generate invented future debt.
- Periods are chronological; rows inside a period have stable ordering by card and source reference.
- Consecutive reads with unchanged data are functionally identical and do not mutate plans, installments, statements, purchases, or occurrence states.

## Risk Summary

The PRD identifies the following risks and required product consequences:

| Risk | Product impact | Required consequence |
|---|---|---|
| Historically incorrect projections already persisted | A correct read can still expose incorrect totals. | Diagnose the existing data condition; any historical migration is a separate PRD. |
| No stable plan identity | Obligations may be duplicated or lost. | The functional identity must be defined and observable through deduplication behavior before implementation. |
| Mixed real and derived sources | A source purchase and its occurrences may be counted twice. | Source type and occurrence relationship must be explicit enough to prevent double counting. |
| Insufficient frontend contract | Correct data may be impossible for the user to audit. | The visible result must expose period, card, installment, amount, currency, origin, reference, and state. |
| Silent invalid data | Totals can become financially misleading. | Exclude unsafe records from monetary totals and surface traceable diagnostics; missing cards go to `pendientes`. |
| Undefined later reconciliation | A subsequent statement may conflict with existing occurrences. | Automatic reconciliation is outside this change and requires a separate approved PRD. |

## Out of Scope Reaffirmation

This change does not include:

- PDF extraction;
- AI prompt or provider changes;
- the importer's normalized JSON;
- statement-row mapping;
- statement review and acceptance UI;
- automatic reconciliation with a later statement;
- installment advance or cancellation;
- refinancing, future interest, or bank plans absent from the data;
- loans, rent, or commitments unrelated to credit cards;
- income projection;
- a complete frontend visual redesign;
- automatic migration of historically incorrect data.

These capabilities require separate PRDs or a later approved version of this document. The future-debt calculation and read path must not send financial information to AI providers; AI is not part of this feature's calculation.

## Acceptance Gates

### Functional requirements gate

The implementation is not functionally acceptable unless it satisfies the mandatory requirements in PRD section 10:

- monthly grouping;
- separate currency totals;
- card contribution visibility;
- detail for every future installment;
- exclusion of the current statement installment;
- exclusion of `1/1` and final installments;
- no second division of imported installment amounts;
- no source-purchase and derived-occurrence double count;
- persistence without new statements;
- user-bounded monthly horizon;
- explicit handling of invalid data without invented debt;
- source traceability;
- exact detail-to-total agreement;
- non-destructive reads;
- comprehensible empty state.

### Presentation gate

Any UI used for validation must show, directly or accessibly as resolved above:

- monthly period;
- ARS total and USD total separately;
- included cards and each card's contribution;
- detail rows with description, installment number/total, amount, currency, origin, reference, and confirmed/estimated state;
- visible or accessible diagnostics for excluded or pending records;
- an explicit empty state when no future debt exists.

A single combined monetary total is not acceptable.

### Validation gate

Validation follows the PRD strategy:

1. **PRD review:** confirm scope, financial rules, scenarios, datasets, and the definition of future debt.
2. **Technical design after approval:** document concrete data sources, functional identity and deduplication strategy, response contract, persistence strategy, frontend/backend impact, and rollback plan. These are intentionally not decided in discovery.
3. **Scoped implementation:** implement only what the approved design authorizes.
4. **Technical minimum:** typecheck, build, unit tests for pure rules, endpoint and screen smoke tests, and logs.
5. **Functional real-data validation:** execute datasets A, B, C, and D first; then execute the user-selected real dataset and compare every row and every total.

### Success metrics gate

The feature is successful only when:

- 100% of the approved mandatory scenarios pass in real use;
- no economic duplication is visible;
- totals exactly match visible detail;
- ARS and USD remain separate;
- no current installment is presented as future by default;
- no installment is shifted by adding 30 days;
- future debt remains available without new monthly uploads;
- every amount can be traced to its origin;
- the user explicitly accepts the result.

## Collision Check

- **`FEAT-015-future-installment-projections.feature` — extends.** The active feature already describes projection creation, future-view listing, and reduction after later statement imports. This change adds the rigorous monthly-period, amount, currency, identity, diagnostic, persistence, idempotency, and non-destructive behavior required for the rejected future-debt view. It should be treated as the detailed successor specification for the future-debt behavior, while the active feature remains historical until delivery summarization confirms any deprecation.
- **`FEAT-001-card-statement-import.feature` — potentially extends downstream behavior.** Its accepted-statement flow says that `CardInstallmentProjection` records are derived from installment rows. This PRD consumes accepted statement data and does not change importing, but the new identity and future-debt rules constrain how those derived obligations must be represented and later read.

## Codebase Context

Grounding artifacts identify the existing CajaApp V3 context:

- **Frontend:** Next.js 16 with React 19, TypeScript, shadcn/Radix UI, Tailwind, Zustand, TanStack Query, and Playwright E2E tests.
- **Backend:** Node.js 24, Fastify, TypeScript, Prisma, SQLite, and Vitest.
- **Relevant backend areas:** `workspace/backend/src/modules/future/` for future installment projections, `workspace/backend/src/modules/projections/` for shared projection behavior, `workspace/backend/src/modules/cards/` for statements, and `workspace/backend/src/modules/manual-purchases/` for manual card purchases.
- **Relevant frontend context:** finance components and API clients under `workspace/frontend/src/components/finance/` and `workspace/frontend/src/lib/finance/`; the grounded map does not prescribe a new component boundary.
- **Domain entities:** accepted `CardStatement` and statement rows, `CardInstallmentProjection`, and manual card purchase records with persisted installment plans.
- **Application constraint:** the app is a single-user personal finance tool without an authentication layer.
- **Grounding status:** `docs/technical.md` and `docs/domain.md` are present. No source code is modified by discovery.

The concrete source-of-truth fields, persistence model, response contract, and implementation boundaries remain for the Planning agent's technical design phase.

## Validation Datasets

The PRD's controlled datasets remain authoritative:

- **Dataset A — Basic ARS:** `1/1` with no future, `1/3` with August/September future installments, `3/6` with August–October future installments, and `6/6` with no future.
- **Dataset B — Currencies:** ARS and USD in the same period with separate totals and no conversion.
- **Dataset C — Duplication:** one source purchase, persisted installments, and a deliberate repeated occurrence; each economic installment appears once.
- **Dataset D — Invalid data:** empty or ambiguous installment, missing currency, and nonexistent card; no invented debt and visible diagnostics, with missing-card records in `pendientes`.

The second acceptance phase uses the real controlled dataset selected by the user only after A–D have passed.

## Open Questions

No product decisions from PRD section 19 remain open. The Planning agent must not silently resolve the technical design topics listed in PRD section 15.2; those topics are inputs to the next phase and include concrete data sources, identity and deduplication implementation, response contract, persistence strategy, frontend/backend impact, and rollback plan.

## Traceability to PRD

- **Sections 1–4:** problem, objective, confirmed-obligation principles, monthly periods, non-destructive reads, and no import changes.
- **Sections 5–8:** scope, actors, definitions, and sources of truth.
- **Section 9:** RN-001 through RN-016 are represented across FEAT-016 through FEAT-023 and the product rules above.
- **Section 10:** mandatory functional requirements are listed in the Functional requirements gate.
- **Section 11:** presentation fields and empty-state requirements are listed in the Presentation gate.
- **Section 12:** exactness, determinism, performance horizon, auditability, compatibility, and no-AI-data-transfer constraints are preserved for technical planning and validation.
- **Section 13:** all 23 named scenarios are split among the eight feature files; four additional scenarios record the resolved horizon, current-period visibility, and `projected` state rules.
- **Section 14:** datasets A–D are preserved in the Validation Datasets block.
- **Sections 15–16:** validation phases, approval sequence, and success metrics are preserved in the Acceptance Gates block.
- **Section 17:** all six risks are summarized above.
- **Section 18:** dependencies remain accepted statement data, stable card identification, persisted occurrences, explicit currency, and a traceable response; AI is not a dependency.
- **Sections 19–20:** all seven decisions are resolved above, while PRD approval and subsequent technical-design approval remain separate gates.
