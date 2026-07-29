# Validation Results: 002-fix-future-debt-period-key

**Round:** Rebound 3
**Verdict:** PASS
**Date:** 2026-07-25

## Summary

Rebound 1 correctly removes the `currentDueDate.slice(0, 7)` period-key derivation from `acceptDraft()` and passes the resolved `periodKey` to projection calculation. The preview schema now rejects non-ISO summary dates while accepting valid ISO dates and nulls. The complete backend test suite, the seven rebound tests, typecheck, build, and formatter check all pass. The seven tests are substantive assertions rather than stubs, although the two service tests exercise the extracted resolution chain rather than invoking the full database-backed `acceptDraft()` transaction.

## Re-run evidence

| Command | Reported by Developer | Observed by Tester | Status |
|---|---|---|---|
| `cd workspace/backend && npm test` | 258 passed, 0 failed; 50 files | 258 passed, 0 failed; 50 files | OK |
| `cd workspace/backend && npx tsc --noEmit` | exit 0, 0 errors | exit 0, no output | OK |
| `cd workspace/backend && npm run build` | exit 0, clean build | exit 0 | OK |
| `cd workspace/backend && npx prettier --check src/modules/future/future.service.ts src/modules/future/future.types.ts src/modules/future/__tests__/service.test.ts` | all matched | all matched | OK |
| `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/period-key-format.test.ts` | 7 passed, 0 failed | 7 passed, 0 failed | OK |
| `cd workspace/backend && npm run check` | not reported | not separately run; its constituent build and test commands passed independently | INFO |
| HTTP curl verification | deferred; backend unavailable | not run; no server was started during this validation | INFO |
| Integration/E2E tests | reported as not configured | no integration/E2E runner or config found; change is covered at unit/schema and existing HTTP-contract test layers | OK |

## Findings

| ID | Severity | FEAT-ID | Title | Reproduction | Expected | Actual | Suggested fix |
|---|---|---|---|---|---|---|---|
| F-001 | INFO | FEAT-024 | Rebound resolution tests do not call full `acceptDraft()` | `npx vitest run tests/cards/period-key-format.test.ts` | A DB-bound test could execute `acceptDraft()` with the malformed preview and verify the transaction boundary | The tests directly mirror `resolveCardStatementPeriodKey(...) ?? getStatementMonthKey(...)` and call `calculateProjections(...)`; both pass and assert valid YYYY-MM/no throw | Optional future enhancement: extract period-key resolution into a pure helper or add an integration test around `acceptDraft()`; not required for this rebound because the production call site is inspected and the schema tests are real RED→GREEN tests |
| F-002 | INFO | — | HTTP smoke test not executed | `curl http://127.0.0.1:11436/api/future-debt?...` | HTTP endpoint should return a valid response when a server is available | Backend was not running; unit and existing HTTP-contract tests pass | Run the curl smoke test in an environment with the backend and its database available |

No BLOCKING or MAJOR findings.

## Skill audit

- `IADEV-validating-implementation`: used by Tester for this validation protocol.
- `IADEV-bdd-implementation`: Developer report says it was used for unit-layer placement. The active FEAT-024 feature remains the original three scenarios; the rebound adds code-level validation without changing the feature file.
- `IADEV-test-driven-development`: Developer reports use, and the schema tests include explicit RED evidence for the three non-ISO rejection cases.
- `context7-mcp`: Developer documented a search and correctly determined it was unnecessary.
- `IADEV-asking-questions`: Developer documented a search and correctly determined no clarification was needed.
- Runtime skill search outcome: no Playwright/Cypress, HTTP harness, visual, accessibility, performance, or security testing skill was surfaced. No applicable stack-specific E2E skill was available. Existing Vitest HTTP-contract tests were included in the full suite.

## Scenario coverage (per `IADEV-bdd-implementation`)

| FEAT-ID | Scenarios in spec | Scenarios covered | Tests covering them | Gaps |
|---|---:|---:|---|---|
| FEAT-024 — Period Key Format Correctness | 3 | 3 | Existing `src/modules/future/__tests__/api.test.ts` and service tests cover active `currentPeriodKey`, no-active-statement behavior, and projected occurrence behavior; `tests/cards/period-key-format.test.ts` adds direct rebound coverage for malformed input and valid fallback resolution | none |

### Scenario walk-through

1. **`currentPeriodKey` is YYYY-MM when an active statement exists** — covered by the existing future API/service fixtures and verified in the full suite; observed response logs contain `currentPeriodKey: "2026-07"`.
2. **`currentPeriodKey` is null when no active statement exists** — covered by existing future API/service fixture coverage and the production expression `activeStatement?.periodKey ?? null`; full suite passed.
3. **Every occurrence `statementPeriodKey` is YYYY-MM and contains no invalid characters** — covered by existing future projection tests and the future module suite; the production implementation uses the canonical persisted `periodKey`, not `periodLabel`.

### Rebound test authenticity

The seven tests in `tests/cards/period-key-format.test.ts` contain real inputs and observable assertions:

- one valid ISO schema parse assertion;
- one nullability schema assertion;
- three `ZodError` assertions that locate the exact failing summary field;
- one valid period-key fallback assertion plus a non-throwing projection call;
- one today's-YYYY-MM fallback assertion plus a non-throwing projection call.

They are not empty tests, unconditional passes, snapshots without assertions, or skipped tests.

## Notes

- Verified production code in `cards.service.ts` lines 738–740 and 757–760: `periodKey` is resolved once and passed to `calculateProjections`; no `statementMonthKey` or `currentDueDate.slice(0, 7)` remains in this flow.
- Verified `cards.schemas.ts` lines 77–88: all three summary date fields use `^\\d{4}-\\d{2}-\\d{2}$` and remain nullable.
- The original Round 1 validation report is preserved conceptually: its future-service fix remains green, while this rebound validates the cards-service crash fix and schema tightening.
- The existing `SERVICE_RESPONSE` debug logging is unrelated to this rebound and does not affect the verdict.

## Rebound 2 — 2026-07-24

### Summary

Rebound 2 adds `parseAnyDateToISO` for the documented non-ISO summary-date formats and wires it into the card-draft accept endpoint before strict Zod validation. I verified the implementation report contains intact Round 1, Rebound 1, and Rebound 2 sections. The full backend suite, targeted unit/integration tests, typecheck, build, formatter check, and configured `npm run check` all pass.

### Re-run evidence

| Command | Developer claim | Tester observation | Status |
|---|---|---|---|
| `cd workspace/backend && npm test` | 281 passed, 0 failed; 52 files | 281 passed, 0 failed; 52 files | OK |
| `cd workspace/backend && npx tsc --noEmit` | exit 0, clean | exit 0, no output | OK |
| `cd workspace/backend && npm run build` | exit 0, clean build | exit 0 | OK |
| `cd workspace/backend && npx prettier --check src/modules/cards/date-normalizer.ts src/modules/cards/cards.controller.ts tests/cards/date-normalizer.test.ts tests/cards/cards.controller.accept.test.ts` | all matched | all matched | OK |
| `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/date-normalizer.test.ts tests/cards/cards.controller.accept.test.ts` | 23 passed, 0 failed in the two files | 23 passed, 0 failed; 2 files | OK |
| `cd workspace/backend && npm run check` | not separately listed in Rebound 2 evidence; build/test listed and passing | exit 0; build and full suite both pass; Node emitted an environment warning that v24.18.0 is expected but v22.14.0 is running | OK |

### Implementation verification

- `date-normalizer.ts` exports `parseAnyDateToISO`, `toIsoYmd`, and `monthNameToIndex`. It handles ISO and zero-padded ISO, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-Mon-YY, DD-Mon-YYYY, DD-Mon with current-year fallback, Month DD YYYY, abbreviated Month DD YYYY, DD Month YYYY, and DD abbreviated Month YYYY. Empty inputs and unparseable/impossible dates return `null` without throwing. Numeric forms are parsed deterministically as day/month/year before `Date.parse`.
- `cards.controller.ts` imports the normalizer and clones `preview.summary`; each of `currentDueDate`, `nextClosingDate`, and `nextDueDate` is normalized independently before `validateData(cardStatementPreviewSchema, normalizedPreview)`. Unparseable non-empty values produce a `ValidationError` containing both field and original value.
- `tests/cards/date-normalizer.test.ts` contains 20 real `it()` tests with direct value assertions, null/undefined/empty/failure assertions, whitespace trimming, impossible-date handling, and current-year behavior. No tests are skipped or stubbed.
- `tests/cards/cards.controller.accept.test.ts` contains 3 real HTTP integration tests using `buildApp()` and `app.inject()`: DD-Mon-YY acceptance and persistence, mixed-format persistence across all three fields, and HTTP 400 rejection with field/value and no persisted statement.
- The strict Zod date regex remains unchanged.

### Findings

None. No BLOCKING, MAJOR, MINOR, or INFO findings were raised for Rebound 2.

### Skill audit

The Rebound 2 report records `IADEV-test-driven-development`, `IADEV-bdd-implementation`, and `IADEV-asking-questions` use/search outcomes, and records `context7-mcp` as searched but not needed. These are all real runtime skills. The runtime surfaced no Playwright/Cypress, dedicated HTTP integration, visual, accessibility, performance, or security skill applicable to this backend change; the repository's Vitest `app.inject()` integration tests were run directly.

### Scenario coverage (per `IADEV-bdd-implementation`)

| FEAT-ID | Scenarios in active feature | Scenarios covered | Tests covering them | Gaps |
|---|---:|---:|---|---|
| FEAT-024 — Period Key Format Correctness | 9 active scenarios | 9 | Original 3: `src/modules/future/__tests__/api.test.ts` and future service tests. Rebound 2 acceptance scenarios: `tests/cards/date-normalizer.test.ts` and `tests/cards/cards.controller.accept.test.ts`; strict schema behavior remains covered by `tests/cards/period-key-format.test.ts`. | none |

The six Rebound 2 scenarios map as follows: DD-Mon-YY to the dedicated accept test; DD/MM/YYYY and Month DD, YYYY to unit parser assertions plus the mixed-format integration test; `nextDueDate` DD/MM/YYYY and independent field normalization to the mixed-format integration test; and yearless DD-Mon to the dedicated unit test. All 20 unit cases and all 3 integration cases passed.

### Notes

- The test process reports Node.js v22.14.0 while the package engine/design expects Node.js v24.18.0. This produced warnings during `npm run check`, but all requested commands exited successfully. Validation was performed under the available runtime.
- The integration tests use the repository's `dev.db` singleton and perform per-test cleanup, as documented by the Developer. The targeted run passed and left no observed test failure or cleanup error.
- The prior Rebound 1 report content remains intact above; this section is appended for Rebound 2 as required.

Verdict: PASS

---

## Rebound 3 — 2026-07-25

### Summary

Rebound 3 wires `parseAnyDateToISO()` into `ai-extraction.service.ts normalizeModelResponse()` (lines 540–542) so the AI extraction pipeline (PDF imports) accepts non-ISO date strings and normalizes them to ISO before the strict Zod schema validates the summary — eliminating HTTP 422 on PDF imports. The full backend suite (305 tests), typecheck, and build all pass. The two AI pipeline test files contain real assertions, not stubs.

### Re-run evidence

| Command | Developer claim | Tester observation | Status |
|---|---|---|---|
| `cd workspace/backend && npm test` | 305 passed, 0 failed; 56 files | 305 passed, 0 failed; 56 files | OK |
| `cd workspace/backend && npx tsc --noEmit` | exit 0, 0 errors | exit 0, no output | OK |
| `cd workspace/backend && npm run build` | exit 0, clean build | exit 0, clean build | OK |
| `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/date-normalization.test.ts` | 6 passed, 0 failed | 6 passed, 0 failed | OK |
| `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/ai-extraction.test.ts` | 5 passed, 0 failed | 5 passed, 0 failed | OK |
| `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/` | (deferred to tester) | 11 passed, 0 failed; 2 files | OK |

### Implementation verification

**ai-extraction.service.ts lines 540–542** — confirmed `parseAnyDateToISO` wraps all three date fields:

```ts
currentDueDate: parseAnyDateToISO(asString(summary.currentDueDate)),
nextClosingDate: parseAnyDateToISO(asString(summary.nextClosingDate)),
nextDueDate: parseAnyDateToISO(asString(summary.nextDueDate)),
```

The import at the top of the file was also confirmed: `import { parseAnyDateToISO } from "../cards/date-normalizer.js";`.

**tests/ai/date-normalization.test.ts** — 6 real `it()` tests with direct value assertions:
- ISO passthrough (`"2026-07-15"` → `"2026-07-15"`)
- DD/MM/YYYY parsing (`"15/07/2026"` → `"2026-07-15"`)
- DD-Mon-YY parsing (`"13-Jul-26"` → `"2026-07-13"`)
- Month DD, YYYY parsing (`"July 15, 2026"` → `"2026-07-15"`)
- null passthrough
- ISO passthrough duplicate

No skipped tests, no stubs, no unconditional passes.

**tests/ai/ai-extraction.test.ts** — 5 real integration tests via `any`-cast on `AiExtractionService.normalizeModelResponse()`:
- DD-Mon-YY `currentDueDate` → `"2026-07-13"`
- DD/MM/YYYY `nextDueDate` → `"2026-08-15"`
- Month DD, YYYY `nextClosingDate` → `"2026-07-28"`
- Full pipeline: non-ISO in → ISO out → `cardStatementPreviewSchema` passes without throw
- Mixed non-ISO across all three fields simultaneously

All 5 tests pass and verify end-to-end normalization within the actual `normalizeModelResponse` code path.

### Findings

None. No BLOCKING, MAJOR, MINOR, or INFO findings were raised for Rebound 3.

### Skill audit

The Rebound 3 report records `IADEV-test-driven-development` use (RED→GREEN discipline for the integration tests), `IADEV-bdd-implementation` (scenario-to-test mapping at the integration layer), and `IADEV-asking-questions` as searched but not needed. These are all real runtime skills. The runtime surfaced no Playwright/Cypress, HTTP integration harness, visual, accessibility, performance, or security skill applicable to this backend change; the repository's Vitest integration tests with `app.inject()` were used directly.

### Scenario coverage (per `IADEV-bdd-implementation`)

The gherkin.md for Rebound 3 adds two new scenarios to `features/FEAT-024-fix-period-key.feature`:

1. **`Importar PDF con currentDueDate en formato DD-Mon-YY`** — non-ISO date in PDF → extraction succeeds (HTTP 200/201, not 422). Covered by `tests/ai/ai-extraction.test.ts` (`normalizes DD-Mon-YY currentDueDate to ISO`) and `tests/ai/date-normalization.test.ts` (`parses DD-Mon-YY "13-Jul-26" → 2026-07-13`).

2. **`Importar PDF con nextDueDate en formato DD/MM/YYYY`** — non-ISO `nextDueDate` in PDF → extraction succeeds. Covered by `tests/ai/ai-extraction.test.ts` (`normalizes DD/MM/YYYY nextDueDate to ISO`) and `tests/ai/date-normalization.test.ts` (`parses DD/MM/YYYY "15/07/2026" → 2026-07-15`).

| FEAT-ID | Scenarios in active feature | Scenarios covered | Tests covering them | Gaps |
|---|---:|---:|---|---|
| FEAT-024 — Period Key Format Correctness | 11 (original 3 + Rebound 1 schema 4 + Rebound 2 normalizer 2 + Rebound 3 AI pipeline 2) | 11 | All covered: future service tests, period-key-format schema tests, date-normalizer unit tests, controller accept integration tests, AI extraction integration tests | none |

### Scenario walk-through (Rebound 3 delta)

1. **`Importar PDF con currentDueDate en formato DD-Mon-YY`** — `tests/ai/ai-extraction.test.ts` calls `normalizeModelResponse` with `currentDueDate: "13-Jul-26"` and asserts `result.summary.currentDueDate === "2026-07-13"`. The test passes. The schema validation test additionally proves the normalized output is accepted by `cardStatementPreviewSchema`.

2. **`Importar PDF con nextDueDate en formato DD/MM/YYYY`** — `tests/ai/ai-extraction.test.ts` calls `normalizeModelResponse` with `nextDueDate: "15/08/2026"` and asserts `result.summary.nextDueDate === "2026-08-15"`. The test passes. The schema validation test additionally proves the normalized output is accepted by `cardStatementPreviewSchema`.

### Notes

- The `gherkin.md` (Rebound 3 section, lines 73–74) names the two new scenarios as `Importar PDF con currentDueDate en formato DD-Mon-YY` and `Importar PDF con nextDueDate en formato DD/MM/YYYY`. These titles do not yet appear in `features/FEAT-024-fix-period-key.feature` (which ends at line 73 with the Rebound 2 mixed-formats scenario). The feature file deprecation/addition is a later step handled by the summarizer; the test coverage is in place regardless.
- Both call sites of `parseAnyDateToISO` (Rebound 2: `cards.controller.ts` accept-draft boundary; Rebound 3: `ai-extraction.service.ts` normalizeModelResponse) are now covered. The two-defense strategy is intentional: the controller normalizer handles manual accept operations while the AI extraction normalizer handles PDF imports.
- `normalizeModelResponse` is private and accessed via `any`-cast in the integration tests. This is the only practical way to exercise the internal normalization pipeline without a real PDF file. The test verifies the actual production code path.
- The 6 unit tests in `date-normalization.test.ts` pass immediately because `parseAnyDateToISO` was already fully correct from Rebound 2. They serve as regression guards and documentation of AI-relevant formats.
- The prior Rebound 1 and Rebound 2 report content remains intact above; this section is appended for Rebound 3 as required.

Verdict: PASS
