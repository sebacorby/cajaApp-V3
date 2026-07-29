# Specs: 001-deuda-futura-de-tarjetas

Behavioral scenarios: [../functional/gherkin.md](../functional/gherkin.md)

This document is the technical requirements index. Each section references the feature file authored by Discovery and adds the implementation notes that Gherkin cannot express: validation rules, integration details, persistence expectations, and the response contract.

The implementation reads exclusively from already-persisted data (`CardInstallmentProjection`, joined with `CardStatementRow`, `CardStatement`, `CardStatementGroup`, `ManualCardPurchase`). It does not write to any table on the read path; reads are non-destructive (RN-009).

Financial math uses decimal-string arithmetic via `workspace/backend/src/shared/money.ts` (`parseArgentinePesos`, `parseDollars`, `centsToString`, `formatArgentinePesos`, `formatDollars`). Float arithmetic is never used on monetary values.

## Common technical contract — endpoint

The read endpoint is the **single** surface for the future-debt view. It is the only place where the rules below are observable.

### Request

```
GET /api/future-debt?from=YYYY-MM&months=6&includeCurrentPeriod=false
```

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `from` | string (YYYY-MM) | yes | current month (UTC, server-side) | matches `^\d{4}-(0[1-9]|1[0-2])$`; must be a valid month. |
| `months` | integer | no | 6 | min 1, max 24 (per PRD RNF-003 — 24-month horizon). |
| `includeCurrentPeriod` | boolean | no | false | When false, occurrences whose `monthKey` equals the current statement's `periodKey` are excluded from the visible months (per Q4). |

Error responses follow the application convention (`workspace/backend/src/app.ts` error handler):

| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_QUERY` | `from` is not a valid `YYYY-MM` or `months` is outside [1, 24]. |
| 500 | `INTERNAL_ERROR` | Unexpected exception. |

### Response

```jsonc
{
  "range": {
    "from": "2026-08",         // first monthKey in the visible horizon
    "to": "2027-01",           // last monthKey in the visible horizon
    "months": 6,               // number of months in the response
    "includeCurrentPeriod": false,
    "currentPeriodKey": "2026-07"  // the active statement's periodKey, if any
  },
  "summary": {
    "ars": "15000.00",         // sum of all visible confirmed ARS rows
    "usd": "90.00"             // sum of all visible confirmed USD rows
  },
  "horizon": {
    "persisted": true,         // true means at least one persisted row exists for the horizon
    "persistedMonths": ["2026-08", "2026-09", "2026-10"]  // months that have persisted rows, even if outside the visible window
  },
  "months": [
    {
      "monthKey": "2026-08",
      "label": "Agosto 2026",
      "totals": { "ars": "10000.00", "usd": "40.00" },     // separated by currency
      "cards": [
        {
          "cardId": "stmt-1:group-1",                       // synthetic id: cardLast4|holderName of the source group
          "cardLast4": "1234",
          "holderName": "JAVI",
          "cardLabel": "Visa Galicia •••• 1234",
          "totals": { "ars": "10000.00", "usd": "0.00" },
          "rows": [
            {
              "id": "projection-uuid",
              "monthKey": "2026-08",
              "description": "Compra presencial",
              "installmentNumber": 2,
              "installmentTotal": 3,
              "installmentLabel": "2/3",
              "amount": "10000.00",
              "currency": "ARS",
              "originType": "card_statement",               // "card_statement" | "manual_card_purchase"
              "originReference": "stmt-1",                  // statement.id or manualPurchase.id
              "sourceLabel": "Visa Galicia •••• 1234",
              "status": "confirmed",                        // always "confirmed" for visible rows (Q6)
              "rowType": "future_installment"               // distinguishes purchase source rows from installment projections
            }
          ]
        }
      ],
      "dataQuality": {
        "status": "complete" | "partial",
        "warnings": []
      }
    }
  ],
  "pendientes": {
    "rows": [
      {
        "id": "projection-uuid",
        "monthKey": "2026-08",
        "description": "Compra sin tarjeta",
        "installmentNumber": 2,
        "installmentTotal": 3,
        "installmentLabel": "2/3",
        "amount": "5000.00",
        "currency": "ARS",
        "originType": "card_statement",
        "originReference": "stmt-orphan",
        "diagnostic": "missing_card_reference",
        "diagnosticDetail": "El resumen aceptado no tiene un grupo-tarjeta identificable; la fila no se suma a los totales por tarjeta."
      }
    ],
    "diagnostics": ["missing_card_reference"]
  },
  "diagnostics": {
    "duplicateOccurrences": 0,
    "invalidInstallmentRows": 0,
    "missingCurrencyRows": 0,
    "missingCardRows": 1,
    "warnings": []
  }
}
```

### Determinism contract (RN-016)

Two consecutive reads with no intervening writes must return byte-identical JSON.

- The response is `JSON.stringify`'d with sorted keys (server side) before being sent.
- All totals are computed in cent/integer cents (`bigint`) and serialized using `centsToString` — never `Number.toString` of a float.
- The service uses no `Date.now()` / `new Date()` for ordering. The ordering is entirely by persisted fields.
- The "current period" detection uses the active statement's `periodKey` at the time of the read; if no active statement exists, the current period is `null` and `includeCurrentPeriod` is a no-op.

### Non-destructive contract (RN-009)

The read path performs only `SELECT` queries. No `INSERT`, `UPDATE`, `DELETE`, `createMany`, `upsert`, or `transaction` is issued. The non-destructive test asserts this by snapshotting the DB before and after a read and comparing SHA-256 of the underlying SQLite file (or a faster equivalent: a `WHERE` snapshot of every row's `updatedAt` cursor).

### Identity / dedup contract (RN-006)

A `FutureOccurrence` is uniquely identified by the tuple:

```
(source_type, source_id, installment_number, period_key, currency, card_id)
```

- `source_type` ∈ `{ "card_statement", "manual_card_purchase" }`
- `source_id` = `cardStatementRow.id` for statement-derived rows, or `manualCardPurchase.id` for manual-purchase rows.
- `installment_number` = `installmentCurrent`.
- `period_key` = `monthKey`.
- `currency` = `"ARS" | "USD"`.
- `card_id` = `cardStatementGroup.id` (or its synthetic equivalent `cardLast4|holderName|statementId` when the group is missing).

When two raw rows produce the same identity tuple, the second one is dropped and counted in `diagnostics.duplicateOccurrences`. The dropped row's stable identity is logged.

### Field-level validation

| Entity.field | Type | Rule |
|---|---|---|
| `installmentCurrent` | integer | ≥ 1, ≤ `installmentTotal`. |
| `installmentTotal` | integer | ≥ 1. |
| `amount` | string | non-empty; parsable by `parseArgentinePesos` (ARS) or `parseDollars` (USD). |
| `currency` | enum | "ARS" or "USD"; rows with any other value go to `pendientes` with `missing_currency`. |
| `monthKey` | string | `YYYY-MM`; matches `^\d{4}-(0[1-9]|1[0-2])$`. |
| `cardLast4` | string | 4-char string when present; missing → `pendientes`. |
| `installmentRaw` | string | parses to `current/total` via `cardBillingCalendarService.parseInstallment`; else diagnostics. |

---

## FEAT-016 — Confirmed Future Debt Visualization

**Type:** functional
**Scenarios:** [../functional/features/FEAT-016-confirmed-future-debt-visualization.feature](../functional/features/FEAT-016-confirmed-future-debt-visualization.feature)

**Implementation notes:**

- The "no future debt" scenario (empty state) returns the same envelope, with `months: []`, `summary: { ars: "0.00", usd: "0.00" }`, and `dataQuality: { status: "complete", warnings: [] }`. The whole-months loop in the service never produces a month accumulator when no rows exist for that month.
- Calendar sequencing (RN-001) uses `addMonths(monthKey, 1)` from `workspace/backend/src/shared/dates.ts` — never `+30 days`. The same `addMonths` function is used in `cardBillingCalendarService.futureInstallments`, so the read path is consistent with the write path.
- The "purchase date" is informational (RN-008) and is never used to derive the period of a future installment. The service reads `effectiveMonthKey` only from the persisted `CardInstallmentProjection.monthKey` — never from `CardStatementRow.dateIso`.
- The "current installment excluded" rule (RN-002) is enforced by `installmentProjectionService.calculateProjections`, which only emits rows for `installmentNumber > current`. The read path simply trusts the persisted rows; no re-projection is performed.

---

## FEAT-017 — Future Debt Exclusion Rules

**Type:** functional
**Scenarios:** [../functional/features/FEAT-017-future-debt-exclusion-rules.feature](../functional/features/FEAT-017-future-debt-exclusion-rules.feature)

**Implementation notes:**

- The `1/1` and final-installment exclusion (RN-003) is enforced at the write path: `installmentProjectionService.calculateProjections` returns an empty schedule when `installmentCurrent === installmentTotal`. The read path therefore has no `1/1` or `6/6` future rows in the persisted state — by construction.
- The "amount is not divided again" rule (RN-004) is enforced by `installmentProjectionService`: each future row receives the *original* `amountPesos` / `amountDollars` of the source row, not a derived per-installment amount. The read path simply displays what is persisted.
- The "source purchase is not added to installments" rule (RN-007) is enforced by the SQL query: the read path only selects `CardInstallmentProjection` rows that have `monthKey > sourceStatementPeriodKey`. Source rows (`CardStatementRow` for the current installment or `ManualCardPurchase` itself) are not included in the future-debt total — they are only used to compute traceability metadata (description, card, source reference).
- A unit test pins each of these rules with a controlled dataset.

---

## FEAT-018 — Multi-currency Future Debt Totals

**Type:** functional
**Scenarios:** [../functional/features/FEAT-018-multi-currency-future-debt-totals.feature](../functional/features/FEAT-018-multi-currency-future-debt-totals.feature)

**Implementation notes:**

- Currency separation (RN-005, RN-011) is implemented by computing two separate `bigint` accumulators per month and per card: one for ARS, one for USD. The accumulator function is `addCents(bucket, currency, cents)` which only adds to the matching field.
- The response contract uses `totals: { ars: string, usd: string }` per month and per card. There is no combined `total` field. The frontend renders two separate chips.
- Detail-to-total reconciliation is automated as a property test: `sum(rows.map(r => parse(r.amount, r.currency))) == totals` for each month and each card. The test fails on any discrepancy.
- No currency conversion is performed anywhere. The string `ARS USD` is never parsed. The `CurrencyExchangeRate` table is not read by this endpoint.

---

## FEAT-019 — Future Debt Identity and Deduplication

**Type:** functional
**Scenarios:** [../functional/features/FEAT-019-future-debt-identity-and-deduplication.feature](../functional/features/FEAT-019-future-debt-identity-and-deduplication.feature)

**Implementation notes:**

- The dedup tuple is documented in the **Common technical contract** above.
- The dedup key is computed in a pure function `occurrenceIdentity(row, sourceType, sourceId, cardId)` that returns a string. Duplicate rows are dropped before grouping; the dropped count is exposed in `diagnostics.duplicateOccurrences` and logged via `logger.warn`.
- Two distinct installments of the same plan (e.g., `4/6` in 2026-08 and `5/6` in 2026-09) have distinct `monthKey` values and therefore distinct identities. The dedup function does not collapse them.
- A unit test seeds two rows with identical identity tuples and asserts (a) only one row appears in the response and (b) the duplicates counter increases by 1.

---

## FEAT-020 — Invalid Data and Diagnostics

**Type:** functional
**Scenarios:** [../functional/features/FEAT-020-invalid-data-and-diagnostics.feature](../functional/features/FEAT-020-invalid-data-and-diagnostics.feature)

**Implementation notes:**

- **Invalid installment row** (RN-013): The system never generates future rows from a row that fails `parseInstallment`. The read path therefore has no such rows to render. The diagnostic is exposed as a counter — `diagnostics.invalidInstallmentRows` — populated by a sanity-check over the persisted `CardInstallmentProjection` set during the read. (At the implementation boundary, the write path already excludes invalid rows; this counter is a defense-in-depth check.)
- **Missing currency** (RN-013): A persisted projection with `currencyOriginal` not in `{ "ARS", "USD" }` is excluded from totals and listed in `pendientes` with `diagnostic: "missing_currency"`. The counter is `diagnostics.missingCurrencyRows`.
- **Missing card reference** (RN-013, Q2): A persisted projection whose source `CardStatementRow` does not resolve to a `CardStatementGroup` (or whose `ManualCardPurchase` does not have a matching statement + group) is excluded from per-card totals and listed in `pendientes` with `diagnostic: "missing_card_reference"`. The counter is `diagnostics.missingCardRows`.
- **`projected` state treated as confirmed** (Q6): The response field `status` is always `"confirmed"` for any visible row whose source is an accepted statement or a manual purchase with a persisted plan. The technical label "projected" (which is encoded in `CardInstallmentProjection` itself, not in a separate state field) is not surfaced. The dedup is economic, not state-based.
- Diagnostics are returned in the response and logged (`logger.warn({ ... }, "Future-debt row excluded")`). They are not persisted to a new table.

---

## FEAT-021 — Future Debt Persistence and Horizon

**Type:** functional
**Scenarios:** [../functional/features/FEAT-021-future-debt-persistence-and-horizon.feature](../functional/features/FEAT-021-future-debt-persistence-and-horizon.feature)

**Implementation notes:**

- The default horizon is **6 months**; the max is **24 months** (PRD RNF-003). The `months` query param is capped at 24 with a 400 response if exceeded.
- The "current period hidden by default" rule (Q4) is implemented by computing `currentPeriodKey` from `prisma.cardStatement.findFirst({ where: { status: "accepted", isActiveForPeriod: true } })`. When `includeCurrentPeriod=false` (default), the response excludes any month whose `monthKey === currentPeriodKey`. When `includeCurrentPeriod=true`, every month is included.
- The "horizon only limits visibility" rule (RN-010) is enforced by a `WHERE monthKey BETWEEN from AND fromPlusMonths(months-1)` filter on the SQL query. The `horizon.persisted` and `horizon.persistedMonths` fields expose the months that have rows outside the visible window, so the user can see "there are more rows beyond the window."
- The "persistence without new imports" rule (RN-012) is automatic: the read path queries `CardInstallmentProjection` directly, which is unchanged unless a new statement is accepted or a manual purchase is created/deleted. There is no re-projection step.

---

## FEAT-022 — Idempotent and Non-destructive Reads

**Type:** functional
**Scenarios:** [../functional/features/FEAT-022-idempotent-and-non-destructive-reads.feature](../functional/features/FEAT-022-idempotent-and-non-destructive-reads.feature)

**Implementation notes:**

- Determinism (RN-016) is implemented by (a) sorting the `months` array by `monthKey` lexicographically, (b) sorting `cards` within a month by `(cardLast4, holderName)` lexicographically, (c) sorting `rows` within a card by `(originReference, installmentNumber)` lexicographically, (d) using `JSON.stringify` with a sorted-key replacer on the server side, and (e) returning the response with no `Date.now()`-dependent fields.
- The determinism test calls the endpoint twice in a row (no intervening writes) and asserts `response1 === response2` after JSON-parsing both with sorted keys.
- Non-destructiveness (RN-009) is implemented by (a) issuing only `SELECT` queries, (b) never opening a transaction on the read path, (c) wrapping the read in a per-test transaction observer that asserts no writes occur.
- The non-destructive test snapshots the DB before and after a read and asserts unchanged cardinality of every table.

---

## FEAT-023 — Future Debt Traceability and Card Grouping

**Type:** functional
**Scenarios:** [../functional/features/FEAT-023-future-debt-traceability-and-card-grouping.feature](../functional/features/FEAT-023-future-debt-traceability-and-card-grouping.feature)

**Implementation notes:**

- Traceability (RN-014) is satisfied by the per-row fields:
  - `cardId`, `cardLast4`, `holderName`, `cardLabel`
  - `monthKey`
  - `description`
  - `installmentLabel` (e.g., "4/6")
  - `amount`, `currency`
  - `originType`, `originReference`, `sourceLabel`
  - `status` ("confirmed")
- Card grouping (RN-005 + traceability) is the `cards` array per month. The card's `totals` is the sum of its rows; the month's `totals` is the sum of its cards; the `summary` is the sum of its months.
- The frontend renders every field on the row directly; no expansion panel is required. The component's component tests assert that all fields are visible in the DOM at the default viewport.
