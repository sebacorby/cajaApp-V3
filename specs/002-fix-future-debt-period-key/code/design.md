# Design: Fix Future Debt Period Key Bug

## Stack

| Aspect | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 24.18 | Already in use |
| Framework | Fastify 5 | Already in use |
| ORM | Prisma 6 | Already in use |
| Validation | Zod 3 | Already in use |
| Testing | vitest 3 | Already in use |

## Dependencies

No dependency changes.

## Data Model

No changes to the data model. `CardStatement.periodKey` (YYYY-MM) and `CardStatement.periodLabel` (free-text) remain as-is in `prisma/schema.prisma`.

## Interface

No changes to the API surface. `GET /api/future-debt` continues to accept `from` (YYYY-MM) and `months` (integer) query params and returns `FutureDebtResponse`. The fix only corrects the internal computation of `currentPeriodKey` and `statementPeriodKey`.

## Validation Rules

| Entity | Field | Rule |
|---|---|---|
| `FutureDebtResponse.range` | `currentPeriodKey` | YYYY-MM or null; must pass `futureMonthKeySchema` (`/^\d{4}-(0[1-9]|1[0-2])$/`) |
| `InstallmentOccurrence` | `statementPeriodKey` | YYYY-MM; must pass `futureMonthKeySchema` |

## File Structure

```
workspace/backend/src/modules/future/
  future.service.ts       — 3 lines changed: lines 142, 221, 271
  future.schemas.ts       — unchanged (futureMonthKeySchema already correct)
  future.types.ts         — unchanged
workspace/backend/src/modules/cards/
  cards.service.ts        — unchanged (periodKey already set correctly at acceptance time)
prisma/schema.prisma      — unchanged
```

## Bug Fix Sites

| Line | Old code | New code |
|---|---|---|
| 142 | `statement?.periodLabel?.slice(0, 7)` | `statement?.periodKey` |
| 221 | `select: { periodLabel: true }` | `select: { periodKey: true }` |
| 271 | `activeStatement?.periodLabel?.slice(0, 7)` | `activeStatement?.periodKey` |

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

### Where the normalizer runs

**Chosen: controller level** (`cards.controller.ts`, accept-draft handler).

The two candidates considered:

| Location | Pro | Con |
|---|---|---|
| **Controller (`cards.controller.ts`)** — **chosen** | Defense in depth: malformed inputs are rejected before any DB read, any service-layer work, or any logging of the un-normalized payload. Single point of entry. | Requires the controller to mutate `preview` before delegating to the service. |
| Service (`cards.service.ts#acceptDraft`) — rejected | Keeps the controller thin; normalizer runs alongside business logic. | The service would have to redo the validation pass it just received; if the controller ever calls `acceptDraft` from another entry point (cron, admin tool, future endpoint), the normalization would silently be skipped. |

The controller-level placement guarantees that every code path entering `acceptDraft` benefits from normalization, and it makes the rejection visible at the API boundary (HTTP 400) before any side effects.

### Implementation strategy

1. **Try `Date.parse()` first** for inputs that `Date.parse` handles reliably: ISO `YYYY-MM-DD`, `"Month DD, YYYY"` (English month names), `"DD Mon YYYY"`. When `Date.parse` returns a finite timestamp, re-format with `toIsoYmd(date)` (custom helper that builds `YYYY-MM-DD` from `getFullYear/getMonth/getDate` and zero-pads).
2. **Fall back to regex parsers** for formats `Date.parse` mishandles:
   - `^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$` → interpret as `DD<sep>MM<sep>YY(YY)`, swap to ISO order. Two-digit year → `20YY`. Single-digit day/month → zero-pad.
   - `^\d{1,2}-([A-Za-z]{3,9})(-\d{2,4})?$` → parse the month name via a static `{Jan:0, Feb:1, …}` lookup. If no year suffix, use `new Date().getFullYear()`.
3. **`Date.parse` caveats** documented in the module header:
   - `Date.parse("15/07/2026")` is locale-dependent (often interpreted as `MM/DD/YYYY` → invalid date). **Never** rely on `Date.parse` for slash-separated forms; always use the regex parser.
   - `Date.parse("July 15, 2026")` works in V8/Node 24 but the module does **not** depend on it for slash forms.
   - `Intl.DateTimeFormat` is **not** used: it has no public parse direction in Node 24 (only format), so it is irrelevant here.

### Module layout

```
workspace/backend/src/modules/cards/
  date-normalizer.ts        — NEW. parseAnyDateToISO + toIsoYmd + monthNameToIndex
  cards.controller.ts        — MODIFIED. call normalizer before validateData
  cards.service.ts           — UNCHANGED. acceptDraft receives already-normalized input
  cards.schemas.ts           — UNCHANGED. regex stays strict (defense in depth)
workspace/backend/test/cards/
  date-normalizer.spec.ts    — NEW. one assertion per accepted format + failure cases
  cards.controller.accept.spec.ts
                              — NEW. integration: accept with non-ISO payload returns 200
```

### Function-level pseudocode (no code-paste, just the algorithm contract)

```
parseAnyDateToISO(input):
  if input is null|undefined|whitespace: return null
  s = input.trim()

  # 1. ISO passthrough + zero-pad
  if matches /^\d{4}-\d{1,2}-\d{1,2}$/:
    d = new Date(s)
    if isNaN(d): return null
    return toIsoYmd(d)

  # 2. Slash/dot/dash numeric DD<sep>MM<sep>(YY)YY
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if m:
    [_, dd, mm, yy] = m; year = yy.length === 2 ? 2000 + +yy : +yy
    d = new Date(Date.UTC(year, +mm - 1, +dd))
    if isNaN(d): return null
    return toIsoYmd(d)

  # 3. DD-Mon(-YY(YY))?
  m = s.match(/^(\d{1,2})-([A-Za-z]{3,9})(-(\d{2,4}))?$/)
  if m:
    [_, dd, mon, _, yy] = m
    monthIdx = monthNameToIndex(mon)
    if monthIdx is null: return null
    year = yy ? (yy.length === 2 ? 2000 + +yy : +yy) : new Date().getFullYear()
    d = new Date(Date.UTC(year, monthIdx, +dd))
    if isNaN(d): return null
    return toIsoYmd(d)

  # 4. "Month DD, YYYY" / "Mon DD, YYYY" / "DD Month YYYY" / "DD Mon YYYY"
  d = Date.parse(s)
  if !isNaN(d) and looksLikeLongMonthName(s):
    return toIsoYmd(new Date(d))

  return null
```

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| `Date.parse` ambiguity for `15/07/2026` (could be read as `MM/DD/YYYY` and fail) | Regex parser handles slash forms **before** `Date.parse` ever sees them. |
| `"07/13/2026"` (impossible DD/MM) silently accepted as something else | Regex parser validates the constructed `Date` (`isNaN` check) and returns `null` on invalid rollover. |
| `new Date().getFullYear()` is evaluated once at module load, not per call | Call it inside `parseAnyDateToISO` (per invocation) so a long-running process doesn't pin a stale year. |
| Normalizer mutates `preview` shared with the draft persistence path | Controller shallow-clones `preview.summary` before mutation; the original `previewJson` in `cardStatementDraft` is not touched until `acceptDraft` writes the new normalized value. |
| Timezone drift between `Date.UTC` and server local time | All date construction uses `Date.UTC`; only `getFullYear()` reads local time to determine the current year for `DD-Mon`-without-year. Day/month are UTC. |

### Dependencies

**No new packages.** Everything uses Node 24 built-ins: `Date`, `Date.parse`, `Date.UTC`, regex literals, and a static month-name map. The existing `vitest`, `Zod`, and `Fastify` are sufficient.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

### Placement in `normalizeModelResponse()`

In `workspace/backend/src/modules/ai/ai-extraction.service.ts` lines 535–541, the three date fields are extracted from the raw AI model output and assembled into the `summary` object that is then validated by the strict Zod schema.

**Before:**
```typescript
summary: {
  currentDueDate: asString(raw.summary?.currentDueDate),
  nextClosingDate:  asString(raw.summary?.nextClosingDate),
  nextDueDate:     asString(raw.summary?.nextDueDate),
},
```

**After:**
```typescript
summary: {
  currentDueDate: pipe(asString, parseAnyDateToISO)(raw.summary?.currentDueDate),
  nextClosingDate:  pipe(asString, parseAnyDateToISO)(raw.summary?.nextClosingDate),
  nextDueDate:     pipe(asString, parseAnyDateToISO)(raw.summary?.nextDueDate),
},
```

### Import

```typescript
import { parseAnyDateToISO } from '../cards/date-normalizer';
```

### Data flow after fix

```
PDF → AiExtractionService.extractAndSave()
       → normalizeModelResponse()
          → asString(raw.summary.currentDueDate)   // e.g. "13-Jul-26"
          → parseAnyDateToISO("13-Jul-26")          // → "2026-07-13"
          → summary.currentDueDate = "2026-07-13"   // ISO, schema passes
       → validateData(cardStatementPreviewSchema, summary)
       → CardStatement (ISO dates persisted)
```

Without this fix, `asString("13-Jul-26")` returns `"13-Jul-26"` unchanged, the Zod regex rejects it, and the user gets HTTP 422.

### File changed

```
workspace/backend/src/modules/ai/
  ai-extraction.service.ts       — MODIFIED: lines 535–541, three date fields wrapped with parseAnyDateToISO
workspace/backend/src/modules/cards/
  date-normalizer.ts              — UNCHANGED (already implemented Rebound 2)
```

### Dependencies

No new packages. `parseAnyDateToISO` uses only Node 24 built-ins (same as Rebound 2).
