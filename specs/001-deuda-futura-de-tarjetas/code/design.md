# Design: 001-deuda-futura-de-tarjetas

This document captures the technical decisions for the change. Every choice traces back to a rule in the PRD (RN-001…RN-016), a feature in Discovery, or an explicit code-grounded finding from the rejected implementation.

## Architecture

The new future-debt view is a **read-only, deterministic query layer** built on top of the already-persisted `CardInstallmentProjection` table. It does not write to any table on the read path. It enforces the rule set (RN-001…RN-016) inside the service layer as pure functions.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16)                                                    │
│  ╔══════════════════════════════════════════════════════════════════╗      │
│  ║  confirmed-future-debt-section.tsx  (replaces deuda-futura)    ║      │
│  ║  • Reads /api/future-debt via TanStack Query                    ║      │
│  ║  • Renders rows directly (no expansion)                          ║      │
│  ║  • Surfaces pendientes section + diagnostics                    ║      │
│  ╚══════════════════════════════════════════════════════════════════╝      │
└──────────────────────────────────────────────────────────────────────────┘
                              │ HTTP (no-store)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Backend (Fastify 5)                                                      │
│  ╔══════════════════════════════════════════════════════════════════╗      │
│  ║  /api/future-debt (NEW)                                          ║      │
│  ║  • Query schema: from, months, includeCurrentPeriod            ║      │
│  ║  • Returns envelope with range, summary, months, pendientes,    ║      │
│  ║    diagnostics                                                    ║      │
│  ╚══════════════════════════════════════════════════════════════════╝      │
│                              │                                            │
│                              ▼                                            │
│  ╔══════════════════════════════════════════════════════════════════╗      │
│  ║  FutureDebtService (NEW)                                         ║      │
│  ║  1. SQL: read CardInstallmentProjection + joins                ║      │
│  ║  2. Normalize → FutureOccurrence shape                           ║      │
│  ║  3. Apply RN-001…RN-016 as pure functions                        ║      │
│  ║  4. Group by monthKey → card → rows                              ║      │
│  ║  5. Compute totals (cents bigint, currency-separated)            ║      │
│  ║  6. Compute pendientes + diagnostics                             ║      │
│  ║  7. Serialize with sorted-key JSON.stringify                     ║      │
│  ╚══════════════════════════════════════════════════════════════════╝      │
│                              │                                            │
│                              ▼                                            │
│  ╔══════════════════════════════════════════════════════════════════╗      │
│  ║  Existing tables (NO schema change)                             ║      │
│  ║  CardInstallmentProjection ◄───── already created on accept     ║      │
│  ║  CardStatement / Row / Group ◄── source of truth for traceability ║      │
│  ║  ManualCardPurchase ◄────────── already created on manual entry ║      │
│  ╚══════════════════════════════════════════════════════════════════╝      │
└──────────────────────────────────────────────────────────────────────────┘
```

## Stack

| Aspect | Choice | Rationale |
|---|---|---|
| Language / runtime | Node.js 24.18 (TypeScript 5.7) | Existing backend stack in `workspace/backend/package.json`. No change. |
| Backend framework | Fastify 5.2 | Existing. |
| Data persistence | Prisma 6.5 + SQLite 3 | Existing. No migration. |
| Validation | Zod 3.24 | Existing. Used for query schema. |
| Logging | Pino 9.6 | Existing. Used for diagnostics. |
| Test runner | Vitest 3.0 | Existing. Tests live in `workspace/backend/tests/`. |
| Frontend | Next.js 16 + React 19 + TypeScript 5 | Existing. |
| Component library | shadcn/Radix + Tailwind 4 | Existing. |
| Data fetching | TanStack Query 5 + `fetch` | Existing. |
| Playwright E2E | Playwright 1.61 | Existing. |

The entire change runs on the existing stack. **No new packages are added.** A new dependency would be unjustified — see `## Dependencies` below.

## Dependencies

The change introduces **no new package**. Every dependency it needs is already in the manifests.

| Action | Package | Why this package | Why not the alternative |
|---|---|---|---|
| keep | `fastify` | The HTTP framework. | — |
| keep | `@prisma/client` | DB access. | — |
| keep | `zod` | Query schema validation. | — |
| keep | `pino` | Diagnostics logging. | — |
| keep | `vitest` | Unit + integration tests. | — |
| keep | `react` / `next` / `tailwindcss` | Frontend. | — |
| keep | `@tanstack/react-query` | Client-side data fetching. | — |
| keep | `@playwright/test` | E2E + BDD tests. | — |
| remove | `future.service.ts` (current) | It is the rejected implementation. | Replaced by the new layer. |
| remove | `future.controller.ts` / `future.routes.ts` (current) | Their endpoint `/api/future-commitments` is replaced. | — |
| remove | `workspace/frontend/src/lib/finance/future-api.ts` (current) | Its types are replaced by the new contract. | — |
| remove | `workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx` (current) | It is the rejected UI. | — |

The "remove" actions are about old files being superseded, not about removing packages from `package.json`. There is no package removal.

## Data Model

The change adds **no tables** and alters **no columns**. It reads from existing tables.

### `CardInstallmentProjection` (existing, reused)

```prisma
model CardInstallmentProjection {
  id                  String   @id @default(uuid())
  statementId         String
  rowId               String
  monthKey            String   // YYYY-MM
  label               String
  installmentCurrent  Int?
  installmentTotal    Int?
  amountPesosRaw      String?
  amountDollarsRaw    String?
  currencyOriginal    String?
  isManual            Boolean  @default(false)
  createdAt           DateTime @default(now())
}
```

This table is the authoritative source of future installments. Rows are created by:
- `cards.service.ts` → `acceptDraft` → `installmentProjectionService.calculateProjections` for statement rows.
- `manual-purchases.service.ts` → `createPurchase` → `cardBillingCalendarService.purchaseInstallments` for manual purchases.

The acceptance flow already excludes `1/1` and final installments (`installmentCurrent + 1 > installmentTotal` → empty schedule), enforces the no-redivision rule (uses the original `amountPesosRaw` / `amountDollarsRaw`), and never duplicates the source purchase (only installment rows are created, not the source row). The read path trusts the persisted shape.

### `CardStatementRow` (existing, reused for traceability)

```prisma
model CardStatementRow {
  id                String   @id @default(uuid())
  statementId       String
  groupKey          String?  // → CardStatementGroup for card identification
  installmentRaw    String?
  installmentCurrent Int?
  installmentTotal  Int?
  amountPesosRaw    String?
  amountDollarsRaw  String?
  currencyOriginal  String?
  dateIso           String?
  ...
}
```

Used to resolve the source row's description, transaction date, and group key for traceability.

### `CardStatementGroup` (existing, reused for card attribution)

```prisma
model CardStatementGroup {
  id            String  @id @default(uuid())
  statementId   String
  cardLast4     String?
  holderName    String?
  ...
}
```

Used to identify the card per occurrence. When `cardLast4` is null, the row goes to `pendientes` with `missing_card_reference`.

### `ManualCardPurchase` (existing, reused for manual purchases)

```prisma
model ManualCardPurchase {
  id            String  @id @default(uuid())
  statementId   String
  cardLast4     String
  holderName    String
  purchaseDate  String
  description   String
  currency      String
  amountRaw     String
  installments  Int
  ...
}
```

For `isManual = true` projections, the source row is `ManualCardPurchase`.

### In-memory shape

```ts
type FutureOccurrence = {
  id: string;                       // CardInstallmentProjection.id
  sourceType: "card_statement" | "manual_card_purchase";
  sourceId: string;                 // CardStatementRow.id or ManualCardPurchase.id
  statementId: string;
  statementPeriodKey: string;       // for the current-period filter
  isManual: boolean;
  monthKey: string;                 // YYYY-MM
  installmentCurrent: number;
  installmentTotal: number;
  amountPesosRaw: string;
  amountDollarsRaw: string;
  currencyOriginal: string;         // "ARS" | "USD" | "MIXED" | "UNKNOWN"
  description: string;
  cardId: string;                   // synthetic: cardLast4|holderName|statementId
  cardLast4: string | null;
  holderName: string | null;
};

type FutureCardGroup = {
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  rows: FutureOccurrence[];
  totals: { ars: bigint; usd: bigint };
};

type FutureMonth = {
  monthKey: string;
  label: string;
  cards: FutureCardGroup[];
  totals: { ars: bigint; usd: bigint };
};

type FutureDebtResponse = {
  range: { from: string; to: string; months: number; includeCurrentPeriod: boolean; currentPeriodKey: string | null };
  summary: { ars: string; usd: string };
  horizon: { persisted: boolean; persistedMonths: string[] };
  months: FutureMonth[];
  pendientes: { rows: FutureOccurrence[]; diagnostics: string[] };
  diagnostics: { duplicateOccurrences: number; invalidInstallmentRows: number; missingCurrencyRows: number; missingCardRows: number; warnings: string[] };
};
```

## Interface

### HTTP endpoint

| Method | Path | Auth | Query | Response | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/future-debt` | none (single-user app) | `from` (YYYY-MM, required), `months` (1–24, default 6), `includeCurrentPeriod` (bool, default false) | `FutureDebtResponse` (see `specs.md`) | 400 `INVALID_QUERY`, 500 `INTERNAL_ERROR` |

The endpoint is **read-only**. The controller does not accept `POST`/`PUT`/`DELETE`. No state mutation is exposed through this path.

### Sequence of operations

```
GET /api/future-debt?from=2026-08&months=6&includeCurrentPeriod=false
  │
  ├─ validation: zod parses query, returns 400 INVALID_QUERY on shape failure
  │
  ├─ SELECT: cardStatement.findFirst({ status: "accepted", isActiveForPeriod: true })
  │   → currentPeriodKey (may be null)
  │
  ├─ SELECT: cardInstallmentProjection.findMany({
  │     where: { monthKey: { gte: from, lte: addMonths(from, months-1) } },
  │     include: {
  │       statement: { include: { groups: true } },
  │       // rowId either points at CardStatementRow or ManualCardPurchase
  │     }
  │   })
  │
  ├─ For each projection, resolve the source row to obtain description + card:
  │     if isManual: fetch ManualCardPurchase by rowId
  │     else:        fetch CardStatementRow by rowId
  │     look up the group's cardLast4/holderName from statement.groups
  │
  ├─ Normalize → FutureOccurrence[]
  │
  ├─ apply RN-001…RN-016:
  │     - filter: currency ∈ {ARS, USD}
  │     - filter: installmentCurrent/Total valid
  │     - filter: monthKey > currentPeriodKey when includeCurrentPeriod=false
  │     - dedup by identity tuple
  │     - partition: cards vs pendientes (missing card)
  │     - aggregate: ARS cents and USD cents via addCents()
  │
  ├─ sort deterministically:
  │     - months by monthKey
  │     - cards by (cardLast4, holderName)
  │     - rows by (originReference, installmentCurrent)
  │
  └─ serialize: cents.toString() with formatArgentinePesos/formatDollars
       response = JSON.stringify({...}, sortKeys replacer)
```

## State Transitions

This change does not introduce a state machine. The only mutation in the system is the statement acceptance flow (which is unchanged) and the manual-purchase creation flow (also unchanged). The future-debt endpoint is read-only.

The `status` field in the response is always `"confirmed"` for visible rows. There is no transition. The `projected` technical label of `CardInstallmentProjection` is the storage convention — not a state. Q6 resolves it as functionally confirmed.

## Architecture Decisions

### Decision 1 — Rewrite the existing module, not add a parallel one

| | |
|---|---|
| **Choice** | Replace `workspace/backend/src/modules/future/future.service.ts`, `future.controller.ts`, `future.routes.ts` with a new implementation behind the same module path. Remove `/api/future-commitments` from the router. |
| **Alternatives** | (a) Keep the rejected module and add a new module `future-debt/`. (b) Add `/api/future-commitments/v2` and route some traffic to one, some to the other. |
| **Rationale** | The rejected contract is incompatible with the new contract (different envelope, different grouping, different diagnostics, different currency model). Keeping two endpoints would force the frontend to switch, which is the same operational cost as switching to a new endpoint, with the added cost of two code paths and two sets of tests. The PRD notes the previous implementation is rejected and the user cannot use it; coexistence creates a maintenance burden. |

### Decision 2 — Read from `CardInstallmentProjection`, not re-derive from `CardStatementRow`

| | |
|---|---|
| **Choice** | Query `CardInstallmentProjection` directly with joins to `CardStatement`, `CardStatementGroup`, `CardStatementRow`, and `ManualCardPurchase` for traceability only. |
| **Alternatives** | (a) Re-derive future installments from `CardStatementRow` on every read by running `installmentProjectionService.calculateProjections(...)`. (b) Define a new persisted projection table. |
| **Rationale** | The projections are **already persisted** at the right moment (statement acceptance, manual purchase creation). Re-deriving on read costs CPU and risks drift if the derivation rules change. The persisted rows also encode the no-redivision rule (RN-004) and the `1/1`/`final` exclusion (RN-003) by construction — the read path does not need to re-enforce them. A new persisted table would require a migration and a backfill, which is explicitly out of scope per the PRD risk section. |

### Decision 3 — Drop the rejected `/api/future-commitments` endpoint

| | |
|---|---|
| **Choice** | Replace `/api/future-commitments` with `/api/future-debt`. The old endpoint is removed from the router. |
| **Alternatives** | (a) Keep `/api/future-commitments` and serve the new contract from it. (b) Serve `/api/future-commitments/v2` with the new contract. |
| **Rationale** | The contract is fundamentally different (one bucketed envelope → one period-keyed envelope). Calling the new endpoint by the old name would be misleading. The frontend is the only client; there is no external API user requiring backward compatibility. |

### Decision 4 — Diagnostics returned in the response, not persisted to a new table

| | |
|---|---|
| **Choice** | `diagnostics` counters in the response (`duplicateOccurrences`, `invalidInstallmentRows`, `missingCurrencyRows`, `missingCardRows`, `warnings`). Logged via Pino at `warn` level. |
| **Alternatives** | (a) Persist a new `FutureDebtDiagnostic` table. (b) Persist to the existing `AiAdvisorInteraction` log table. |
| **Rationale** | The user needs the diagnostics to be visible in the response for transparency (RN-014, auditability RNF-004). A persisted table adds a migration and a backfill. The `logger.warn` output is already machine-readable and traceable in the existing log pipeline. If clients want a persistent audit, they can capture the response and the logs together. |

### Decision 5 — Endpoint path `/api/future-debt` (not `/api/future-commitments`)

| | |
|---|---|
| **Choice** | New endpoint `/api/future-debt`. |
| **Alternatives** | (a) `/api/future-commitments`. (b) `/api/cards/future-debt`. |
| **Rationale** | "Future debt" matches the PRD title and the user-facing terminology ("Deuda futura"). `/api/future-commitments` is the rejected name. `/api/cards/future-debt` couples the endpoint to a card domain that does not exist; the implementation draws from `cards` and `manual-purchases` tables but is not a card-domain concern. |

### Decision 6 — Identical component for `deuda-futura-section.tsx` replacement

| | |
|---|---|
| **Choice** | Replace `workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx` with a new component (e.g., `confirmed-future-debt-section.tsx`) and update the section router. |
| **Alternatives** | (a) Add a new section and route the user to it. (b) Keep the file name and replace the implementation in place. |
| **Rationale** | The user-visible section is "Deuda futura" — there is no reason to add a new menu entry. The new component covers the same user need. Renaming the file improves clarity. The section router is updated to point at the new component. |

### Decision 7 — `pending` and `missing_card` rows render in the same `pendientes` section

| | |
|---|---|
| **Choice** | All non-card-total rows (missing currency, missing card, invalid installment) populate a single `pendientes` section with a `diagnostic` field per row. |
| **Alternatives** | (a) Three sections: `sin_moneda`, `sin_tarjeta`, `cuota_invalida`. (b) Suppress all non-card rows. |
| **Rationale** | The user needs a single visible surface for all unallocated rows (per PRD §3 traceability and §11 presentation). Three sections add visual noise without adding information. The `diagnostic` field carries the type. The `diagnostics` counters in the response summary quantify each kind. |

### Decision 8 — `includeCurrentPeriod` as a boolean query param, not a separate endpoints

| | |
|---|---|
| **Choice** | `GET /api/future-debt?includeCurrentPeriod=true|false` (default false). |
| **Alternatives** | (a) Two endpoints: `/api/future-debt` (no current) and `/api/future-debt/current` (with current). (b) Always include, drop the period filter. |
| **Rationale** | The decision is a single bit, not a different resource. A separate endpoint would break the envelope shape and force the frontend to glue two responses. The default of `false` matches the Q4 decision. |

## File Structure

### New files

```
workspace/backend/src/modules/future/
├── future.service.ts            (REWRITTEN — deterministic read-only layer)
├── future.controller.ts         (REWRITTEN — new endpoint)
├── future.routes.ts             (REWRITTEN — new path)
├── future.schemas.ts            (REWRITTEN — new query schema)
├── future.types.ts              (NEW — FutureOccurrence, FutureMonth, etc.)
├── rules/
│   ├── month-sequence.ts        (NEW — RN-001)
│   ├── exclusion.ts             (NEW — RN-002, RN-003)
│   ├── identity.ts              (NEW — RN-006)
│   ├── currency.ts              (NEW — RN-005)
│   ├── amount.ts                (NEW — RN-004)
│   ├── source.ts                (NEW — RN-007)
│   ├── persistence.ts           (NEW — RN-012)
│   ├── horizon.ts               (NEW — RN-010)
│   ├── diagnostic.ts            (NEW — RN-013)
│   ├── traceability.ts          (NEW — RN-014)
│   ├── ordering.ts              (NEW — RN-015)
│   └── idempotency.ts           (NEW — RN-016)
└── serializers/
    └── response.ts              (NEW — sorted-key JSON.stringify)

workspace/backend/tests/future/
├── rules/
│   ├── month-sequence.test.ts           (NEW)
│   ├── exclusion.test.ts                (NEW)
│   ├── identity.test.ts                 (NEW)
│   ├── currency.test.ts                 (NEW)
│   ├── amount.test.ts                   (NEW)
│   ├── source.test.ts                   (NEW)
│   ├── persistence.test.ts              (NEW)
│   ├── horizon.test.ts                  (NEW)
│   ├── diagnostic.test.ts               (NEW)
│   ├── traceability.test.ts             (NEW)
│   ├── ordering.test.ts                 (NEW)
│   └── idempotency.test.ts              (NEW)
├── future.service.test.ts               (REWRITTEN — Datasets A–D)
├── future.endpoint.test.ts              (NEW — API contract)
├── future.determinism.test.ts           (NEW — RN-016)
├── future.non-destructive.test.ts       (NEW — RN-009)
└── fixtures/
    ├── dataset-a.ts                     (NEW — Dataset A)
    ├── dataset-b.ts                     (NEW — Dataset B)
    ├── dataset-c.ts                     (NEW — Dataset C)
    └── dataset-d.ts                     (NEW — Dataset D)

workspace/frontend/src/components/finance/sections/
└── confirmed-future-debt-section.tsx    (REPLACES deuda-futura-section.tsx)

workspace/frontend/src/components/finance/future-debt/
├── future-debt-row.tsx                  (NEW — single row, all fields visible)
├── future-debt-month.tsx                (NEW — month panel with cards + rows)
├── future-debt-pendientes.tsx           (NEW — pendientes section)
├── future-debt-diagnostics.tsx          (NEW — diagnostics surface)
└── future-debt-empty.tsx                (NEW — empty state)

workspace/frontend/src/lib/finance/
└── future-debt-api.ts                   (REPLACES future-api.ts)
```

### Removed files

```
workspace/backend/src/modules/future/future.service.ts        (current content dropped)
workspace/backend/src/modules/future/future.controller.ts     (current content dropped)
workspace/backend/src/modules/future/future.routes.ts         (current content dropped)
workspace/backend/src/modules/future/future.schemas.ts        (current content dropped)
workspace/backend/tests/future/future.service.test.ts         (current content dropped)
workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx
workspace/frontend/src/lib/finance/future-api.ts
```

The old tests are removed because they assert behavior that is partially wrong (e.g., bucketed envelope, `FutureComponent.kind` of `"card_debt" | "income" | "other_commitment"`). They are replaced by the new test files.

### Modified files

```
workspace/backend/src/app.ts                                  (registers new module, removes old)
workspace/frontend/src/components/finance/sections/section-router.tsx  (points to new component)
```

## Validation Rules

| Function | Input | Output | Rule |
|---|---|---|---|
| `parseInstallment` | `string` | `{ current: number, total: number }` throws `ValidationError` | `^\d{1,3}\s*/\s*\d{1,3}$`, `1 ≤ current ≤ total`, both integers. |
| `requireMonthKey` | `string` | `string` throws | `^\d{4}-(0[1-9]|1[0-2])$`. |
| `addMonths` | `(monthKey, n)` | `monthKey` | Calendar arithmetic via `Date(year, month-1+n, 1)`. **Never** `+30 days`. |
| `parseArgentinePesos` | `string` | `bigint` cents | Accepts `1.234,56` and `1234.56`. |
| `parseDollars` | `string` | `bigint` cents | Accepts `1,234.56` and `1234.56`. |
| `centsToString` | `(bigint, currency)` | `string` | Locale-formatted with `.` or `,` per currency. |
| `addCents` | `(bucket, currency, cents)` | `void` | Adds to `bucket.ars` or `bucket.usd` only. |
| `occurrenceIdentity` | `(row, sourceType, sourceId, cardId)` | `string` | `${sourceType}:${sourceId}:${installmentNumber}:${monthKey}:${currency}:${cardId}`. |
| `isMissingCard` | `group | null` | `boolean` | true if `cardLast4` is null, empty, or whitespace. |
| `isMissingCurrency` | `currencyOriginal` | `boolean` | true if not in `{ "ARS", "USD" }`. |
| `isInvalidInstallment` | `row` | `boolean` | true if `installmentCurrent` or `installmentTotal` is null/0 or out of range. |

## Test Strategy

The BDD-implementation discipline is observed:

- **Unit (Vitest):** pure rule functions in `rules/`. No dependencies. Each rule has its own test file.
- **Integration (Vitest + SQLite):** the service is invoked against a seeded disposable SQLite database. Datasets A–D are scripted as TypeScript fixtures.
- **API contract (Vitest + Fastify `app.inject`):** the endpoint is hit against the same seeded DB. The response is asserted against the schema in `specs.md`.
- **BDD/E2E (Playwright):** the user-visible flows from FEAT-016…FEAT-023 are exercised end-to-end.
- **Determinism (Vitest):** the endpoint is hit twice; the JSON outputs are byte-compared.
- **Non-destructive (Vitest):** the DB is hashed before and after a read; the hash is unchanged.

See `test/tasks.md` for the task list and verification steps.

## Rollout / Rollback

- **Rollout:** ship the new module and the new frontend component in the same release. The old files are removed in the same commit. The endpoint path changes from `/api/future-commitments` to `/api/future-debt` — there is no coexistence window.
- **Rollback:** revert the commit. The old endpoint and old UI are restored atomically. No data migration is involved because the read path touches no persisted state.
- **Risk:** historical `CardInstallmentProjection` rows may be incorrect (per PRD §17). A correct read may still expose incorrect totals. The diagnostic counters and the per-row response allow the user to identify and report bad rows. Backfill / cleanup is a separate PRD.

## Open Item (technical)

The previous implementation's `getMovements` was used as a dashboard data source. The new implementation does not include the `income` and `other_commitment` buckets. Removing the endpoint therefore removes these from the future-debt view. The dashboard and the movements view still operate independently. Confirm with the user that the **future-debt view is card-only** (per the PRD scope) and the previous income/other bucket display was a misfeature, not a requirement. If the user wants a separate "future cash-flow" view, that is a new PRD.
