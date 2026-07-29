# Specs: Fix Future Debt Period Key Bug

Behavioral scenarios: [gherkin.md](../functional/gherkin.md)

## Requirements

### FEAT-024: Period Key Format Correctness

**Type:** constraint (bug fix)
**Scenarios:** [gherkin.md#feat-024](../functional/gherkin.md#feat-024-period-key-format-correctness)

**Implementation notes:**
- `CardStatement.periodKey` (YYYY-MM) is the canonical field for period identification. It is pre-computed at statement acceptance time by `resolveCardStatementPeriodKey()` in `cards.service.ts`.
- `CardStatement.periodLabel` stores the raw `currentDueDate` string from AI extraction — free-form text in formats like `"15/07/2026"`, `"July 15, 2026"`, or `"2026-07-15"`. It must NEVER be used as a period key.
- `currentPeriodKey` in the `FutureDebtResponse` must match `futureMonthKeySchema`: `/^\d{4}-(0[1-9]|1[0-2])$/` when non-null.
- The bug was at three sites in `future.service.ts`: lines 142, 221, 271 — all used `periodLabel?.slice(0, 7)` instead of `periodKey`.
- The fix: all three sites now use `periodKey` directly. No new validation needed — `futureMonthKeySchema` already enforces the format.

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

**Scenarios:** see `functional/gherkin.md` → `## Rebound 2` and the six scenarios appended to `functional/features/FEAT-024-fix-period-key.feature`.

### Contract: `parseAnyDateToISO`

**Signature:** `parseAnyDateToISO(input: string | null | undefined): string | null`

**Module:** new file `workspace/backend/src/modules/cards/date-normalizer.ts`.

**Inputs (all accepted → returned value):**

| Input example | Format | Returned |
|---|---|---|
| `null` / `undefined` / `""` / whitespace-only | absent | `null` |
| `"2026-07-15"` | ISO `YYYY-MM-DD` | `"2026-07-15"` (passthrough) |
| `"2026-7-15"` | ISO with single-digit month | `"2026-07-15"` (zero-pad) |
| `"15/07/2026"` | `DD/MM/YYYY` | `"2026-07-15"` |
| `"15-07-2026"` | `DD-MM-YYYY` | `"2026-07-15"` |
| `"15.07.2026"` | `DD.MM.YYYY` | `"2026-07-15"` |
| `"13-Jul-26"` | `DD-Mon-YY` | `"2026-07-13"` (YY → 20YY) |
| `"13-Jul-2026"` | `DD-Mon-YYYY` | `"2026-07-13"` |
| `"15-Jul"` | `DD-Mon` (no year) | `"<currentYear>-07-15"` where `<currentYear> = new Date().getFullYear()` at call time |
| `"July 15, 2026"` | `"Month DD, YYYY"` | `"2026-07-15"` |
| `"Jul 15, 2026"` | `"Mon DD, YYYY"` | `"2026-07-15"` |
| `"15 July 2026"` | `"DD Month YYYY"` | `"2026-07-15"` |
| `"15 Jul 2026"` | `"DD Mon YYYY"` | `"2026-07-15"` |

**Failure mode:**

- The function **does not throw**. It returns `null` for any input it cannot parse.
- The caller (`cards.controller.ts`) wraps each call site and, when the normalizer returns `null` on a non-null input, throws a `ValidationError` (HTTP 400) carrying:
  - `field`: one of `"currentDueDate"`, `"nextClosingDate"`, `"nextDueDate"`.
  - `value`: the original (non-ISO) value the user submitted.
  - `message`: `"<field> must be a recognized date format or ISO YYYY-MM-DD"`.
- Empty / whitespace / `null` / `undefined` are passed through as `null` and do **not** trigger an error (the schema already allows `null`).

**Determinism requirement:** the normalizer must be **locale-independent** for slash-separated forms — `"15/07/2026"` is always interpreted as `DD/MM/YYYY` regardless of the runtime locale, because the source is Latin American banks.

**Invariants preserved:**

- `cards.schemas.ts` lines 77–88 regex `^\d{4}-\d{2}-\d{2}$` is **not** loosened. The schema still validates only ISO; the normalizer guarantees what reaches the schema is ISO.
- Only ISO `YYYY-MM-DD` is ever persisted to `CardStatement.currentDueDate`, `CardStatement.nextClosingDate`, `CardStatement.nextDueDate`.
- Downstream consumers (`future.service.ts`, `installmentProjectionService`, etc.) see only ISO and require no changes.

### Wire-up contract

- **Call site:** `workspace/backend/src/modules/cards/cards.controller.ts`, inside the `POST /api/cards/draft/:id/accept` handler, **before** `validateData(cardStatementPreviewSchema, preview)`.
- **Order:**
  1. Fetch the draft.
  2. Build a shallow-cloned `preview` object with `summary` shallow-cloned.
  3. For each of `summary.currentDueDate`, `summary.nextClosingDate`, `summary.nextDueDate`, call `parseAnyDateToISO(value)`. If the input is non-null and the result is `null`, throw `ValidationError(field, value)`. Otherwise, assign the result back onto `preview.summary.<field>`.
  4. Run the existing `validateData(cardStatementPreviewSchema, preview)` against the normalized preview.
  5. Hand off to `cards.service.ts#acceptDraft` exactly as today.

### Test coverage requirements

- Unit: one assertion per row of the input table above.
- Unit: each failure case is asserted to return `null` without throwing.
- Integration: `POST /api/cards/draft/:id/accept` with `currentDueDate = "13-Jul-26"` returns HTTP 200 and persists `"2026-07-13"`.
- Integration: mixed-format payload (currentDueDate ISO, nextClosingDate `28-Jul-26`, nextDueDate `15/08/2026`) normalizes all three and returns HTTP 200.
- Integration: unrecognized format returns HTTP 400 with `field` and `value` in the response body.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

**Scenarios:** see `functional/gherkin.md` → `## Rebound 3`.

### Contract reuse

No new contract. `parseAnyDateToISO` is reused at a second call site:

- **Original call site** (Rebound 2): `cards.controller.ts` accept-draft handler — unchanged.
- **New call site** (Rebound 3): `ai-extraction.service.ts normalizeModelResponse()` — same function, same behavior, same failure mode (returns `null` for unrecognized formats → schema rejects → HTTP 422).

The `parseAnyDateToISO` contract documented in Rebound 2 applies verbatim here. The function signature, accepted formats, failure semantics, and invariants are unchanged.
