# Discovery — Spec 002: Fix Future Debt Period Key Bug

## Change & PRD

- **Spec path:** `specs/002-fix-future-debt-period-key/`
- **PRD:** `functional/PRD.md`
- **Type:** Bug fix (constraint / non-functional)

## Summary

The `GET /api/future-debt` endpoint crashes with HTTP 500 because `currentPeriodKey` in the response is not a valid YYYY-MM string. The bug is caused by incorrectly slicing `periodLabel` (which stores full dates like `"15/07/2026"` or `"July 15, 2026"`) instead of using the pre-computed `periodKey` field (YYYY-MM format) on `CardStatement`.

## Features

- **FEAT-024:** Period key format correctness (constraint) — Gherkin: `functional/features/FEAT-024-fix-period-key.feature`

## Resolved Decisions

### Which field provides the correct YYYY-MM period key?

**Decision:** Use `CardStatement.periodKey` instead of slicing `CardStatement.periodLabel`.

**Rationale:**
- `CardStatement.periodKey` (schema line 147) is pre-computed at acceptance time by `resolveCardStatementPeriodKey()` in `cards.service.ts` (lines 26–36). It stores the canonical YYYY-MM string.
- `CardStatement.periodLabel` (schema line 159) stores the raw `currentDueDate` string from AI extraction — free-form text that can be `"15/07/2026"`, `"July 15, 2026"`, `"2026-07-15"`, or other formats.
- The `resolveCardStatementPeriodKey()` function extracts YYYY-MM from ISO-format dates (`YYYY-MM-DD`) only; it returns `null` for non-ISO formats, falling back to `statementMonthKey`.

### Where the bug manifests

| Location | Line | Bug | Fix |
|----------|------|-----|-----|
| `future.service.ts` | 142 | `statement?.periodLabel?.slice(0, 7)` | `statement?.periodKey` |
| `future.service.ts` | 221 | `select: { periodLabel: true }` | `select: { periodKey: true }` |
| `future.service.ts` | 271 | `activeStatement?.periodLabel?.slice(0, 7)` | `activeStatement?.periodKey` |

### `currentDueDate` formats observed

| Format | Example | Sliced `.slice(0,7)` | Valid YYYY-MM? |
|--------|---------|----------------------|----------------|
| DD/MM/YYYY | `"15/07/2026"` | `"15/07/"` | ❌ |
| Month D, YYYY | `"July 15, 2026"` | `"July 1"` | ❌ |
| ISO YYYY-MM-DD | `"2026-07-15"` | `"2026-07"` | ✅ |

### Why `periodKey` is trustworthy

`periodKey` is derived at statement acceptance time in `cards.service.ts`:

```typescript
const statementMonthKey = preview.summary.currentDueDate
  ? preview.summary.currentDueDate.slice(0, 7)   // only valid for ISO input
  : installmentProjectionService.getStatementMonthKey(preview.rows);
const periodKey = resolveCardStatementPeriodKey(preview) ?? statementMonthKey ?? null;
```

`resolveCardStatementPeriodKey()` (lines 26–36) only extracts YYYY-MM when a date field matches `/^\d{4}-\d{2}-\d{2}$/`. For non-ISO formats it returns `null`, and the fallback `statementMonthKey` would produce garbage. However, in practice `currentDueDate` from the AI extraction is usually ISO (Latin American banks), so `periodKey` is generally correct.

The safer fix is to use `statement?.periodKey` directly — which is the field already stored in the database.

### `statementPeriodKey` vs `currentPeriodKey`

Both fields had the same bug (slicing `periodLabel`):
- `statementPeriodKey` (line 142, inside `normalizeProjection`) is used for traceability per occurrence — it tells which statement an installment came from.
- `currentPeriodKey` (line 271, in the response envelope) is used to determine "which month is the current period" for `includeCurrentPeriod` filtering.

Both should use `periodKey`.

## Open Questions

1. **Should `periodLabel` be preserved at all?** It stores `currentDueDate` which is human-readable but unindexed. The fix only corrects the consumption site, but a future cleanup could consider removing `periodLabel` entirely and using `periodKey` + formatting utilities instead.
2. **Should `resolveCardStatementPeriodKey` handle more date formats?** It only handles ISO (`YYYY-MM-DD`). If a bank provides `DD/MM/YYYY` or `Month D, YYYY`, it returns `null` and falls back to slicing — which fails. A more robust parser could be added but is out of scope for this bug fix.

## Collision Check

No collisions detected against the active feature set.

This is a correctness bug fix to existing future-debt behavior. The existing features (FEAT-016, FEAT-017, FEAT-018, FEAT-019, FEAT-021, FEAT-022, FEAT-023) all describe expected behavior of the Future Debt endpoint and its response format. This fix does not change any observable behavior — it restores the response contract to its intended shape (valid YYYY-MM in `currentPeriodKey`). The Gherkin scenarios describe the expected correct behavior, which aligns with what the existing features already assume.

## Codebase Context

### Module: `future` (read-only query)

| File | Responsibility |
|------|---------------|
| `workspace/backend/src/modules/future/future.service.ts` | Main service; `getFutureDebt()` builds the response; lines 142, 221, 271 have the bug |
| `workspace/backend/src/modules/future/future.schemas.ts` | Zod schemas; `futureMonthKeySchema` enforces `/^\d{4}-(0[1-9]|1[0-2])$/` |
| `workspace/backend/src/modules/future/rules/month-sequence.ts` | `requireMonthKey()`, `isMonthKey()`, `monthKeyWithOffset()` |
| `workspace/backend/src/modules/future/future.types.ts` | TypeScript types for `FutureDebtQuery`, `FutureDebtResponse`, etc. |

### Module: `cards` (statement management)

| File | Responsibility |
|------|---------------|
| `workspace/backend/src/modules/cards/cards.service.ts` | `resolveCardStatementPeriodKey()` (lines 26–36); `acceptDraft()` sets `periodKey` (line 708) and `periodLabel` (line 715) |
| `workspace/backend/prisma/schema.prisma` | `CardStatement` model: `periodKey` (line 147, YYYY-MM), `periodLabel` (line 159, free-text) |

### Key schema fields on `CardStatement`

```prisma
model CardStatement {
  periodKey     String?   // line 147 — canonical YYYY-MM, used for queries
  periodLabel   String?   // line 159 — raw currentDueDate from AI, free format
  currentDueDate String?  // line 165 — original date string from extraction
}
```

### Response validation

`future.schemas.ts` line 116:
```typescript
currentPeriodKey: futureMonthKeySchema.nullish(),
```

This requires `currentPeriodKey` to match `/^\d{4}-(0[1-9]|1[0-2])$/` when present. The bug produces `"13-Jul-"` which fails this regex, causing the 500 error.

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

### Goal

Allow the AI extractor to send `summary.currentDueDate`, `summary.nextClosingDate`, and `summary.nextDueDate` in common non-ISO formats (`"13-Jul-26"`, `"15/07/2026"`, `"July 15, 2026"`, etc.) and have the backend normalise them to ISO `YYYY-MM-DD` **before** the strict Zod schema validation runs. The user gets a clean accept (HTTP 200) instead of the current HTTP 400.

### Why a normalizer (not a looser schema)

The user chose the **"Normalizador en backend"** strategy. The alternative (loosening the regex) was rejected because:
- The schema is the only line of defense against malformed dates reaching `CardStatement` and downstream consumers (`future.service.ts`, `installmentProjectionService`, etc.).
- Loosening the schema would force every downstream consumer to re-parse and re-validate. Right now, every consumer can rely on ISO.
- The AI extractor cannot be retrained on demand to always emit ISO; some Latin American banks emit DD/MM/YYYY, others emit "13-Jul-26". The contract has to absorb that variability.

### Approach (product-level)

The normalizer is a **pre-processing step** that runs in `cards.service.ts` (or a new utility file called from there) before Zod validation. It works on three fields: `currentDueDate`, `nextClosingDate`, `nextDueDate`.

**Formats handled (in order of preference):**

| Input example | Format | Expected ISO output |
|---|---|---|
| `"2026-07-15"` | ISO `YYYY-MM-DD` | `"2026-07-15"` (passthrough) |
| `"2026-7-15"` | ISO with single-digit month | `"2026-07-15"` (zero-pad) |
| `"15/07/2026"` | DD/MM/YYYY | `"2026-07-15"` |
| `"15-07-2026"` | DD-MM-YYYY | `"2026-07-15"` |
| `"15.07.2026"` | DD.MM.YYYY | `"2026-07-15"` |
| `"13-Jul-26"` | DD-Mon-YY | `"2026-07-13"` (YY → 20YY) |
| `"13-Jul-2026"` | DD-Mon-YYYY | `"2026-07-13"` |
| `"15-Jul"` | DD-Mon (no year) | `"<currentYear>-07-15"` (assume current year) |
| `"July 15, 2026"` | Month DD, YYYY | `"2026-07-15"` |
| `"Jul 15, 2026"` | Mon DD, YYYY | `"2026-07-15"` |
| `"15 July 2026"` | DD Month YYYY | `"2026-07-15"` |
| `"15 Jul 2026"` | DD Mon YYYY | `"2026-07-15"` |

**Strategy:** Try `Date.parse()` first (handles many natural formats), then fall back to a regex-based parser for the formats `Date.parse` mishandles (notably DD/MM/YYYY which `Date.parse` commonly interprets as MM/DD/YYYY — locale-dependent). The normalizer must be **deterministic and locale-independent** for the slash-separated forms: those are always DD/MM/YYYY because the source is Latin American banks.

**Fields normalized:** `currentDueDate`, `nextClosingDate`, `nextDueDate`. Each is normalized independently — a malformed value in one field does not block the others.

### Out of scope (rejected formats)

- **No day** (`"July 2026"`) → reject with HTTP 400.

> **Product correction (2026-07-24):** "No year" formats are now **in scope**. When the input omits the year (e.g. `"15-Jul"`), the normalizer assumes the current calendar year at runtime rather than rejecting. Rationale: in this app the data is always about the user's current/next billing cycle, so defaulting to the current year almost always matches the user's intent, and the resulting UX is "it just works" instead of a frustrating 400 error. The storage invariant is unchanged — only ISO `YYYY-MM-DD` is ever persisted.
- **Locale-specific formats we don't see** (e.g., `"2026年7月15日"`) → reject. The extractor has not been observed producing these.
- **Two-digit year ambiguity** (`"15/07/26"` vs `"15/07/1926"`) → we assume 20YY for YY. Documented behavior; the AI extractor has not been seen emitting pre-2000 dates.

### Invariant preserved

The strict Zod regex in `cards.schemas.ts` (lines 79, 83, 87) — `^\d{4}-\d{2}-\d{2}$` — **does NOT loosen**. The normalizer runs upstream and transforms the input into ISO before the schema sees it. The schema therefore acts as a defense-in-depth check: if the normalizer ever produces a non-ISO value, the schema rejects it and the bug is caught immediately.

### Storage

After normalization, the ISO value is what gets stored in `CardStatement.currentDueDate`, `CardStatement.nextClosingDate`, and `CardStatement.nextDueDate`. The user's original (non-ISO) input is **not** persisted — there is no "raw input" column. Downstream consumers (Future Debt, installments) continue to read ISO.

### Failure mode

If the normalizer returns `null` for a field (i.e., the format is unrecognized), the API responds with HTTP 400 and a payload that includes:
- The field name that failed (`currentDueDate`, `nextClosingDate`, or `nextDueDate`).
- The original value the user submitted.
- A hint that the format is unsupported (listing the formats that *are* supported).

### Collision check (rebound-specific)

The collision check from the original spec still holds: **no collisions with the active feature set**. The normalization applies to the request payload of card-statement acceptance, which is the same surface that `FEAT-001-card-statement-import.feature` exercises. There is no new behavior being added — the existing feature already implies that the user can submit a summary with dates; the only addition is that the dates can now arrive in non-ISO formats. The active `features/FEAT-001-card-statement-import.feature` does not constrain the input format, so this rebound **extends** the implicit contract without superseding any existing feature.

The delivery summarizer should be aware that the date-format contract **is** a (latent) part of the import feature's contract and that this rebound makes it explicit and lenient on input.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

### Problem

The normalizer from Rebound 2 (`parseAnyDateToISO()`) was wired only into `cards.controller.ts` at the **accept endpoint**. However, when a PDF is imported the flow is different:

1. `CardsController.importPdf()` calls `AiExtractionService.extractAndSave()`.
2. Inside `AiExtractionService.normalizeModelResponse()` (lines 535–541), each date field is read via `asString()` — **no parsing is applied**.
3. The resulting object is then validated by the strict Zod schema in `cards.schemas.ts`.
4. Since `asString()` returns the raw non-ISO string, the schema rejects it → HTTP 422 "AI output validation failed: summary.currentDueDate must be ISO YYYY-MM-DD".

**Affected code** — `workspace/backend/src/modules/ai/ai-extraction.service.ts` lines 535–541:
```typescript
// Current (broken):
summary: {
  currentDueDate: asString(raw.summary?.currentDueDate),
  nextClosingDate:  asString(raw.summary?.nextClosingDate),
  nextDueDate:     asString(raw.summary?.nextDueDate),
},
```

### Solution

Replace `asString()` with `pipe(asString, parseAnyDateToISO)()` for `currentDueDate`, `nextClosingDate`, and `nextDueDate` in `normalizeModelResponse()`. This ensures non-ISO dates extracted from PDFs are normalized to ISO **before** the Zod schema sees them — the same pattern used at the accept endpoint.

### Files changed

- `workspace/backend/src/modules/ai/ai-extraction.service.ts` — lines 535–541: replace `asString()` with `pipe(asString, parseAnyDateToISO)()` for the three date fields in `summary`.

### Scenarios added (in `FEAT-024-fix-period-key.feature`)

- `Importar PDF con currentDueDate en formato DD-Mon-YY` — non-ISO date in PDF → extraction succeeds (HTTP 200/201, not 422).
- `Importar PDF con nextDueDate en formato DD/MM/YYYY` — non-ISO `nextDueDate` in PDF → extraction succeeds.

### Collision check (rebound-specific)

No new collisions. This rebound extends the same contract as Rebound 2 — the date normalization is now applied at **both** entry points (accept endpoint AND PDF import pipeline). No existing feature is superseded.
