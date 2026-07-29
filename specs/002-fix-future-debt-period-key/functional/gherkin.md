# Specification: specs/002-fix-future-debt-period-key

PRD: [PRD.md](PRD.md)

## FEAT-024: Period Key Format Correctness

<type: constraint (bug fix)>

Scenarios: [features/FEAT-024-fix-period-key.feature](features/FEAT-024-fix-period-key.feature)
Active: features/FEAT-024-fix-period-key.feature

<!-- Note: paths in gherkin.md are relative to functional/ -->

---

**Files changed:**
- `workspace/backend/src/modules/future/future.service.ts` — lines 142, 221, 271: replace `periodLabel?.slice(0, 7)` with `periodKey` in both the select and the usage sites.

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

**User request (verbatim):** "cargo ok el resumen al confirmarlo obtengo este error statementPeriodKey must use YYYY-MM format"

**Strategy chosen:** Normalizador en backend (instead of forcing the AI extractor to emit ISO).

**What changed:** The AI extractor emits dates in various formats (`"13-Jul-26"`, `"15/07/2026"`, `"July 15, 2026"`, …). Rebound 1 tightened `cards.schemas.ts` to require strict ISO `YYYY-MM-DD` for `currentDueDate`, `nextClosingDate`, `nextDueDate`, which causes every non-ISO payload to be rejected with HTTP 400. Rebound 2 adds a normalizer that runs **before** Zod validation so the schema stays strict but the endpoint accepts the common formats the extractor actually produces.

### Scenarios

**Added** (all in `features/FEAT-024-fix-period-key.feature`):

- `Aceptar resumen con currentDueDate en formato DD-Mon-YY` — `"13-Jul-26"` → `"2026-07-13"`, accepted.
- `Aceptar resumen con currentDueDate en formato DD/MM/YYYY` — `"15/07/2026"` → `"2026-07-15"`, accepted.
- `Aceptar resumen con currentDueDate en formato Month DD, YYYY` — `"July 15, 2026"` → `"2026-07-15"`, accepted.
- `Aceptar resumen con nextDueDate en DD/MM/YYYY` — exercises `nextDueDate` (not only `currentDueDate`).
- `Aceptar currentDueDate sin año asumiendo año actual` — `"15-Jul"` → `"<currentYear>-07-15"`, accepted (the normalizer assumes the current calendar year when no year is present).
- `Normalizar cada campo de fecha de forma independiente` — `currentDueDate` is ISO but `nextDueDate` is `"15-Jul-26"`; both end up normalized to ISO.

**Changed:** None.

**Removed:** None.

Prior scenarios from Rebound 1 and the original spec remain valid and unaltered. They continue to assert that after the normalizer runs, the values stored in `CardStatement` are valid ISO `YYYY-MM-DD` and the strict Zod regex is preserved.

### Key invariant preserved

The Zod schema in `cards.schemas.ts` (lines 79, 83, 87) **does not loosen**. It still requires `^\d{4}-\d{2}-\d{2}$`. The normalizer runs upstream of the schema, transforming the raw input into ISO before the schema sees it. The schema therefore acts as a defense-in-depth check on the normalizer's output, not as the public contract.

---

## Supplementary Notes

**The bug:** `future.service.ts` incorrectly sliced `periodLabel` (a free-text date like `"15/07/2026"`) to extract what it assumed was a YYYY-MM period key. The result was malformed strings like `"15/07/"` or `"July 1"`.

**The fix:** Use `CardStatement.periodKey` directly — this field is pre-computed at statement acceptance time and is guaranteed to be in YYYY-MM format.

**Files changed:**
- `workspace/backend/src/modules/future/future.service.ts` — lines 142, 221, 271: replace `periodLabel?.slice(0, 7)` with `periodKey` in both the select and the usage sites.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

**User request (verbatim):** "AI output validation failed: summary.currentDueDate must be ISO YYYY-MM-DD" — the normalizer only runs on the accept endpoint. When a PDF is imported, `ai-extraction.service.ts normalizeModelResponse()` uses `asString()` without date parsing, then the strict Zod schema rejects non-ISO dates at extraction time.

**Strategy:** Apply `parseAnyDateToISO()` inside `normalizeModelResponse()` in `ai-extraction.service.ts`, same pattern as the accept endpoint.

### Scenarios

**Added** (all in `features/FEAT-024-fix-period-key.feature`):

- `Importar PDF con currentDueDate en formato DD-Mon-YY` — non-ISO date in PDF → extraction succeeds (HTTP 200/201, not 422).
- `Importar PDF con nextDueDate en formato DD/MM/YYYY` — non-ISO `nextDueDate` in PDF → extraction succeeds.

**Changed:** None.

**Removed:** None.

Prior scenarios from Rebound 1, Rebound 2, and the original spec remain valid and unaltered.

### Key invariant preserved

The Zod schema in `cards.schemas.ts` (lines 79, 83, 87) **does not loosen**. `parseAnyDateToISO()` now runs inside `ai-extraction.service.ts normalizeModelResponse()` before the schema sees the payload, so the schema remains the defense-in-depth check on the normalizer's output.

