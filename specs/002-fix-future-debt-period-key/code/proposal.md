# Proposal: Fix Future Debt Period Key Bug

## Why

The `GET /api/future-debt` endpoint crashes with HTTP 500 because `currentPeriodKey` in the response is not a valid YYYY-MM string. The error message is:

```
{"code":"INTERNAL_ERROR","message":"Future-debt response failed contract validation: range.currentPeriodKey: Expected YYYY-MM"}
```

The response contains `currentPeriodKey: "13-Jul-"` (malformed) instead of a valid YYYY-MM string like `"2026-07"`. This breaks every client that calls the endpoint.

The root cause: in `future.service.ts`, the code sliced `periodLabel` (a free-text date string like `"15/07/2026"` or `"July 15, 2026"`) using `.slice(0, 7)` — assuming it was already YYYY-MM. It is not.

## What Changes

### future.service.ts — use periodKey instead of periodLabel

Replace `periodLabel?.slice(0, 7)` with `periodKey` at three locations (lines 142, 221, 271):

- **Line 142** (`normalizeProjection`): `statement?.periodLabel?.slice(0, 7)` → `statement?.periodKey`
- **Line 221** (Prisma `select`): `select: { periodLabel: true }` → `select: { periodKey: true }`
- **Line 271** (response envelope): `activeStatement?.periodLabel?.slice(0, 7)` → `activeStatement?.periodKey`

This restores the correct behavior: `currentPeriodKey` and `statementPeriodKey` are valid YYYY-MM strings matching `futureMonthKeySchema` (`/^\d{4}-(0[1-9]|1[0-2])$/`).

## Scope

**In scope:**
- Fix `currentPeriodKey` format in `future.service.ts` response envelope (line 271)
- Fix `statementPeriodKey` format in `normalizeProjection` (line 142)
- Fix the Prisma `select` to fetch `periodKey` instead of `periodLabel` (line 221)
- Verify `futureMonthKeySchema` validation passes for all responses

**Out of scope:**
- Changes to `CardStatement` schema or `resolveCardStatementPeriodKey()` logic
- Changes to `periodLabel` field or AI extraction pipeline
- New features or behavior changes beyond correctness restoration

## Capabilities

**Modified:** `GET /api/future-debt` — `currentPeriodKey` and `statementPeriodKey` fields now return valid YYYY-MM or null, restoring the intended response contract.

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

### Why (rebound-specific)

After Rebound 1 tightened `cards.schemas.ts` to require strict ISO `YYYY-MM-DD` for `summary.currentDueDate`, `summary.nextClosingDate`, and `summary.nextDueDate`, every AI-extracted summary that arrives in any other common format (`"13-Jul-26"`, `"15/07/2026"`, `"July 15, 2026"`, etc.) is rejected with HTTP 400 and the user sees `statementPeriodKey must use YYYY-MM format` even though the bug it references was already fixed. The AI extractor cannot be retrained on demand to always emit ISO — Latin American banks produce a mix of `DD/MM/YYYY`, `DD-Mon-YY`, and `"Month DD, YYYY"` strings — so the contract has to absorb that variability without loosening the storage invariant.

**Strategy chosen:** Backend date normalizer (`parseAnyDateToISO`) that runs in the controller before Zod validation, transforms recognized non-ISO inputs to ISO, and lets the strict Zod regex stay in place as defense-in-depth.

### What Changes (rebound delta)

- **New utility module** `workspace/backend/src/modules/cards/date-normalizer.ts` exposing `parseAnyDateToISO(input: string | null | undefined): string | null`.
- **`workspace/backend/src/modules/cards/cards.controller.ts`** — call the normalizer on `summary.currentDueDate`, `summary.nextClosingDate`, `summary.nextDueDate` of the incoming draft **before** `validateData(cardStatementPreviewSchema, preview)`. The normalizer mutates a shallow copy of `preview.summary` and the schema then validates the normalized values.
- **`workspace/backend/src/modules/cards/cards.schemas.ts`** — no changes to the regex (`^\d{4}-\d{2}-\d{2}$` stays strict). The schema now acts as a defense-in-depth check on the normalizer's output, not as the public input contract.
- **New unit tests** in `workspace/backend/test/cards/date-normalizer.spec.ts` covering all 6 accepted input formats plus the failure path.
- **New integration test** exercising the accept-draft endpoint with a non-ISO payload.

### Scope (rebound)

**In scope:**
- `parseAnyDateToISO` accepts: ISO `YYYY-MM-DD`, ISO with single-digit month, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `DD-Mon-YY` (YY → 20YY), `DD-Mon-YYYY`, `DD-Mon` (no year → current year), `"Month DD, YYYY"`, `"Mon DD, YYYY"`, `"DD Month YYYY"`, `"DD Mon YYYY"`, `null`/`undefined`/`""` → `null`.
- Normalizer runs on `currentDueDate`, `nextClosingDate`, `nextDueDate` independently — one malformed value does not block the others.
- Year inference for `DD-Mon` (no year) uses `new Date().getFullYear()` at runtime.

**Out of scope:**
- Locale-specific formats not observed in the source data (e.g., `"2026年7月15日"`, `"15/07/26"` vs `"15/07/1926"` — YY always interpreted as 20YY).
- No-day formats like `"July 2026"` — reject with HTTP 400.
- Loosening the existing strict Zod regex in `cards.schemas.ts`.
- Changes to `CardStatement` schema, `periodKey`/`periodLabel` fields, or any `future.service.ts` lines (the original Rebound 0 fix remains untouched).
- Persisting the original (non-ISO) input — only ISO is stored, as before.

### Capabilities (rebound)

**Modified:** `POST /api/cards/draft/:id/accept` — accepts `summary.*` date fields in any of the formats listed above; persists only ISO `YYYY-MM-DD`. Rejects unrecognized formats with HTTP 400 naming the offending field and echoing the original value.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

### Why (rebound-specific)

The `parseAnyDateToISO()` normalizer was wired only into `cards.controller.ts` at the **accept endpoint**. However, when a PDF is imported through `AiExtractionService.extractAndSave()`, the flow bypasses that endpoint: `normalizeModelResponse()` (lines 535–541) calls `asString()` on each date field without any parsing, then the strict Zod schema in `cards.schemas.ts` rejects non-ISO values with HTTP 422. The user sees `"AI output validation failed: summary.currentDueDate must be ISO YYYY-MM-DD"` even though the same non-ISO format would be accepted at the accept endpoint.

### What Changes (rebound delta)

- **`workspace/backend/src/modules/ai/ai-extraction.service.ts`** — inside `normalizeModelResponse()` (lines 535–541), replace `asString(summary.<field>)` with `pipe(asString, parseAnyDateToISO)(summary.<field>)` for `currentDueDate`, `nextClosingDate`, and `nextDueDate`. Import `parseAnyDateToISO` from `../cards/date-normalizer`.
- No new module, no new contract, no schema changes.

### Scope (rebound)

**In scope:**
- `ai-extraction.service.ts normalizeModelResponse()` lines 535–541: three `asString()` calls wrapped with `parseAnyDateToISO`.
- Import of `parseAnyDateToISO` from `../cards/date-normalizer` (already implemented in Rebound 2, no changes to its contract).

**Out of scope:**
- Changes to `CardStatement` schema or any `periodKey`/`periodLabel` logic (Rebound 0 fix remains untouched).
- Changes to `cards.schemas.ts` regex — stays strict as defense in depth.
- Changes to the accept endpoint (`cards.controller.ts`) — Rebound 2 wire-up is unchanged.
- Any changes to `ai-extraction.service.ts` beyond lines 535–541.
