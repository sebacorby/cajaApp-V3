# 002-fix-future-debt-period-key -- Implementation Plan

> **For the Developer agent:** Execute this plan task by task using the `IADEV-test-driven-development` skill. Track each `- [ ]` checkbox; only check it when the verification command in that step passes.

## Goal
Fix `GET /api/future-debt` so `currentPeriodKey` and `statementPeriodKey` return valid YYYY-MM strings instead of malformed values like `"13-Jul-"` or `"15/07/"`.

## Architecture summary
Node.js 24 / Fastify 5 backend. The `FutureDebtService` in `future.service.ts` reads `CardStatement` records (via Prisma or an in-memory `FixtureReader`) and projects installments forward. The bug: three sites incorrectly sliced `periodLabel` (free-text date) to produce a period key. The fix: use `periodKey` (pre-computed YYYY-MM) at those three sites. No architectural change.

## Tech stack
- Language / runtime: Node.js 24.18
- Framework: Fastify 5
- ORM: Prisma 6
- Validation: Zod 3
- Testing: Vitest 3

## Scope

**In scope (this plan delivers):**
- Fix `currentPeriodKey` in the response envelope (line 271 of `future.service.ts`)
- Fix `statementPeriodKey` in `normalizeProjection` (line 142)
- Fix the Prisma select to fetch `periodKey` instead of `periodLabel` (line 221)
- Add `periodKey` field to `RawCardStatement` type (required so fixtures can supply it)
- Update existing test fixtures to include `periodKey`
- Three unit tests verifying YYYY-MM correctness for `currentPeriodKey` and `statementPeriodKey`

**Out of scope (do NOT touch in this plan):**
- `CardStatement` schema or `resolveCardStatementPeriodKey()` logic in `cards.service.ts`
- `periodLabel` field or AI extraction pipeline
- New features or behavior changes beyond correctness restoration
- Integration or E2E tests (unit tests cover the bug surface adequately)

**Minimalism guardrail:** the Developer must reject any addition not listed under "In scope".

## Package & dependency recommendations

No dependency changes.

## Source artifacts
- PRD: `specs/002-fix-future-debt-period-key/PRD.md`
- Behavior specification: `specs/002-fix-future-debt-period-key/gherkin.md` + `features/FEAT-024-fix-period-key.feature` _(consumed via `IADEV-bdd-implementation`)_
- Discovery: `specs/002-fix-future-debt-period-key/functional/discovery.md`
- Proposal: `specs/002-fix-future-debt-period-key/code/proposal.md`
- Specs: `specs/002-fix-future-debt-period-key/code/specs.md`
- Design: `specs/002-fix-future-debt-period-key/code/design.md`
- Tasks (high level): `specs/002-fix-future-debt-period-key/test/tasks.md`

## Feature -> task index
| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-024 | Period Key Format Correctness | Task 1, Task 2 |

---

## Task 1: Add `periodKey` to `RawCardStatement` type and update fixtures

**Files:**
- `workspace/backend/src/modules/future/future.types.ts`
- `workspace/backend/src/modules/future/__tests__/fixtures/dataset-a.ts`
- `workspace/backend/src/modules/future/__tests__/fixtures/dataset-b.ts`
- `workspace/backend/src/modules/future/__tests__/fixtures/dataset-c.ts`
- `workspace/backend/src/modules/future/__tests__/fixtures/dataset-d.ts`

**Skills the Developer should look for:** anything for TypeScript type extension in existing interfaces.

- [ ] **Step 1.1: Add `periodKey` to `RawCardStatement`**

Open `workspace/backend/src/modules/future/future.types.ts`. Find the `RawCardStatement` interface (line 25). Add `periodKey: string | null;` as a new field after `periodLabel`.

Run: `cd workspace/backend && npx tsc --noEmit src/modules/future/future.types.ts`
Expected: exit 0, no new type errors.

- [ ] **Step 1.2: Add `periodKey` to dataset-a fixture**

Open `workspace/backend/src/modules/future/__tests__/fixtures/dataset-a.ts`. The existing `statements[0]` has `periodLabel: "2026-07-01"` and `isActiveForPeriod: true`. Add `periodKey: "2026-07"` to that object.

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, no type errors in fixtures.

- [ ] **Step 1.3: Add `periodKey` to dataset-b, dataset-c, dataset-d fixtures**

Repeat Step 1.2 for `dataset-b.ts`, `dataset-c.ts`, and `dataset-d.ts`:
- `dataset-b`: add `periodKey: "2026-07"` to its statement.
- `dataset-c`: add `periodKey: "2026-07"` to its statement.
- `dataset-d`: add `periodKey: "2026-07"` to its statement (if it has statements; check the fixture first — it may have zero statements).

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, no type errors.

---

## Task 2: Write failing unit tests for period key format

**Files:**
- `workspace/backend/src/modules/future/__tests__/service.test.ts`

**Skills the Developer should look for:** anything for unit testing with Vitest, anything for Zod schema validation in tests.

- [ ] **Step 2.1: Write test — `currentPeriodKey` is null when no active statement exists**

In `workspace/backend/src/modules/future/__tests__/service.test.ts`, add a new `describe` block titled `"FEAT-024 Period key format correctness"`. Add the first `it` test:

- Arrange: create a `FutureFixture` with an empty `statements` array (no `CardStatement` with `isActiveForPeriod: true`).
- Act: call `getFutureDebt({ from: "2026-07", months: 6, includeCurrentPeriod: false })` using the `read()` helper pattern already in the file.
- Assert: `response.range.currentPeriodKey === null`.
- Also assert the response passes `futureDebtResponseSchema.parse(response)` (no validation error).

Do NOT paste the full test body. The description above is the contract; the Developer writes the test code.

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: test runs and **fails** because the bug causes a malformed string (`"13-Jul-"` or similar) instead of `null`. The error may be a Zod validation failure or an assertion mismatch.

- [ ] **Step 2.2: Write test — `currentPeriodKey` is valid YYYY-MM when active statement exists**

Add a second `it` test in the same `describe` block:

- Arrange: create a `FutureFixture` with one statement that has `periodKey: "2026-07"` and `isActiveForPeriod: true` (use `dataset-a` as a base but pass a custom fixture directly to `read()`).
- Act: same `getFutureDebt` call.
- Assert: `response.range.currentPeriodKey === "2026-07"`.
- Assert `futureMonthKeySchema.parse(response.range.currentPeriodKey)` does NOT throw (the value passes the YYYY-MM regex).

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: test runs and **fails** with a Zod validation error or wrong-value assertion. The bug produces `"13-Jul-"` or similar.

- [ ] **Step 2.3: Write test — every `statementPeriodKey` is valid YYYY-MM**

Add a third `it` test in the same `describe` block:

- Arrange: use a fixture with one accepted statement (`periodKey: "2026-07"`, `isActiveForPeriod: true`) and at least one projection row.
- Act: call `getFutureDebt`.
- Assert: collect all `occurrence.statementPeriodKey` values from `response.months[*].cards[*].rows[*]` — each must be non-null and pass `futureMonthKeySchema`.
- Also assert: none of them contain `/` or stray letters (e.g., `!/^[\d/-]+$/.test(key)` would be false for `"15/07/"`).

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: test runs and **fails** because `statementPeriodKey` is derived from `periodLabel?.slice(0, 7)` which produces garbage.

---

## Task 3: Fix the bug — revert three lines in `future.service.ts`

**Files:**
- `workspace/backend/src/modules/future/future.service.ts`

**Skills the Developer should look for:** anything for the language/runtime in use (Node.js / TypeScript).

- [ ] **Step 3.1: Verify all three FEAT-024 tests fail (RED)**

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: 3 failures. Each test fails for the reason documented in Task 2 (wrong value or Zod validation error).

- [ ] **Step 3.2: Fix line 271 — response envelope `currentPeriodKey`**

Open `workspace/backend/src/modules/future/future.service.ts` at the response-envelope construction (look for `activeStatement?.periodLabel?.slice(0, 7)`). Replace it with `activeStatement?.periodKey`.

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: the test from Step 2.2 now passes. Steps 2.1 and 2.3 still fail.

- [ ] **Step 3.3: Fix line 221 — Prisma `select`**

In the same file, find the `cardStatement.findFirst` call that uses `select: { periodLabel: true }`. Replace with `select: { periodKey: true }`.

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: no new changes yet (fixture still returns `periodKey` from the fixture object directly, not from Prisma).

- [ ] **Step 3.4: Fix line 142 — `normalizeProjection` `statementPeriodKey`**

In the same file, find `normalizeProjection` and replace `statement?.periodLabel?.slice(0, 7)` with `statement?.periodKey`.

Run: `cd workspace/backend && npx vitest run --reporter=verbose --testNamePattern="FEAT-024"`
Expected: all 3 FEAT-024 tests pass (GREEN). No Zod validation errors.

- [ ] **Step 3.5: Commit the fix**

```bash
git add workspace/backend/src/modules/future/future.service.ts workspace/backend/src/modules/future/future.types.ts workspace/backend/src/modules/future/__tests__/fixtures/dataset-a.ts workspace/backend/src/modules/future/__tests__/fixtures/dataset-b.ts workspace/backend/src/modules/future/__tests__/fixtures/dataset-c.ts workspace/backend/src/modules/future/__tests__/fixtures/dataset-d.ts workspace/backend/src/modules/future/__tests__/service.test.ts
git commit -m "fix(future): use periodKey instead of periodLabel.slice(0,7) for period keys

The three bug sites in future.service.ts were deriving currentPeriodKey and
statementPeriodKey by slicing periodLabel (a free-text date string), which
produced malformed values like '15/07/' or 'July 1'. The correct field is
periodKey (pre-computed YYYY-MM) on CardStatement.

Fixes: FEAT-024 Period Key Format Correctness"
```

---

## Task 4: Verification (run by the Developer)

- [ ] **Step 4.1: Linter**

Run: `cd workspace/backend && npx eslint src/modules/future/future.service.ts src/modules/future/future.types.ts src/modules/future/__tests__/service.test.ts`
Expected: exit 0, 0 errors.

- [ ] **Step 4.2: Formatter check**

Run: `cd workspace/backend && npx prettier --check src/modules/future/future.service.ts src/modules/future/future.types.ts src/modules/future/__tests__/service.test.ts`
Expected: exit 0 (no files would be reformatted).

- [ ] **Step 4.3: Type checker**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

- [ ] **Step 4.4: Full future module unit tests**

Run: `cd workspace/backend && npx vitest run --reporter=verbose src/modules/future/__tests__/service.test.ts`
Expected: 0 failures. All existing tests (FEAT-016 through FEAT-023 scenarios) still pass — no regression.

- [ ] **Step 4.5: Confirm scenario coverage (per `IADEV-bdd-implementation`)**

For every FEAT-ID in the behavior specification, point at the test file(s) covering each scenario:

| FEAT-ID | Scenario | Test file |
|---|---|---|
| FEAT-024 | `currentPeriodKey` is YYYY-MM when active statement exists | `service.test.ts` — "currentPeriodKey is valid YYYY-MM when active statement exists" |
| FEAT-024 | `currentPeriodKey` is null when no active statement | `service.test.ts` — "currentPeriodKey is null when no active statement exists" |
| FEAT-024 | `statementPeriodKey` in each occurrence is valid YYYY-MM | `service.test.ts` — "statementPeriodKey in each occurrence is valid YYYY-MM" |

Missing coverage is a verification failure even if every gate is green. Document this mapping in `specs/002-fix-future-debt-period-key/implementation_report.md` under `## Test run evidence`.

---

## Task 5: Tester handoff (run by the Tester, not the Developer)

The Developer lists the following gates in `## Test run evidence -> Deferred to the Tester` of `implementation_report.md`. The Tester runs them in `IADEV-validating-implementation` Pass 2.

| Gate | Configured? | Command the Tester should run |
|---|---|---|
| Integration tests | no | — |
| E2E tests | no | — |
| Build / packaging | yes | `cd workspace/backend && npm run build` |
| Pre-commit / pre-push hooks | no | — |
| Other — validate `GET /api/future-debt` via HTTP | yes | `curl -s "http://localhost:3000/api/future-debt?from=2026-07&months=6" \| jq '.range.currentPeriodKey'` — must return `"2026-07"` or `null`, not `"13-Jul-"` |

---

## Rebound notes

- The `RawCardStatement.periodKey` field added in Task 1 is required because the Prisma `select` change (line 221) fetches `periodKey` from the database. The `FixtureReader` returns fixture objects directly (not DB rows), so fixtures must supply `periodKey` explicitly. This is not scope expansion — it is a type correction required to make the fixture pattern compatible with the fix.

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

> **For the Developer agent:** This section **appends** to the Round 1 plan above. Do NOT touch Round 1 tasks — they are complete and locked. Execute only Tasks R2-1 through R2-5 below, using `IADEV-test-driven-development` and verifying each step.

### Goal

Add a `parseAnyDateToISO` normalizer at the `cards.controller.ts` accept-draft boundary so `POST /api/card-statements/drafts/:draftId/accept` accepts the common non-ISO date formats the AI extractor actually emits (`"13-Jul-26"`, `"15/07/2026"`, `"July 15, 2026"`, etc.), persists only ISO `YYYY-MM-DD`, and rejects unrecognized formats with HTTP 400 — without loosening the strict Zod regex in `cards.schemas.ts`.

### Architecture summary

The Round 1 + Rebound 1 fix lives in `future.service.ts` (read path) and `cards.service.ts#acceptDraft` (acceptance path). Rebound 2 inserts a **third** defense layer at the **controller boundary**: a pure-function date normalizer (`parseAnyDateToISO`) runs on `body.preview.summary.{currentDueDate,nextClosingDate,nextDueDate}` immediately before `validateData(cardStatementPreviewSchema, preview)`. The controller shallow-clones `preview.summary`, normalizes each field independently, replaces the value with the ISO result (or throws `ValidationError` if the input was non-null but unparseable), and only then hands the normalized preview to `validateData`. The Zod schema stays strict — it now acts as a defense-in-depth check on the normalizer's output, not as the public input contract. No service-layer changes, no `cards.schemas.ts` changes, no new dependencies.

### Tech stack

- Language / runtime: Node.js 24.18 (unchanged)
- Framework: Fastify 5 (unchanged)
- ORM: Prisma 6 (unchanged)
- Validation: Zod 3 (unchanged)
- Testing: Vitest 3 (unchanged)
- New code: pure TypeScript using Node built-ins only (`Date`, `Date.parse`, `Date.UTC`, regex literals, a static month-name map).

### Scope

**In scope (this plan delivers):**

- New module `workspace/backend/src/modules/cards/date-normalizer.ts` exporting `parseAnyDateToISO`, `toIsoYmd`, and `monthNameToIndex`.
- New tests in `workspace/backend/tests/cards/date-normalizer.test.ts` — one `it()` per accepted format from `specs.md` Rebound 2 → "Contract: `parseAnyDateToISO`" plus failure cases.
- Modified `workspace/backend/src/modules/cards/cards.controller.ts` — call the normalizer on `body.preview.summary.{currentDueDate,nextClosingDate,nextDueDate}` before `validateData`, shallow-cloning `preview.summary` so the request payload is not mutated.
- New integration tests in `workspace/backend/tests/cards/cards.controller.accept.spec.ts` — exercise the full HTTP accept path with non-ISO payloads via `buildApp()` + `app.inject()`.
- Six FEAT-024 Gherkin scenarios added in `features/FEAT-024-fix-period-key.feature` are exercised by the new tests.

**Out of scope (do NOT touch in this plan):**

- `cards.schemas.ts` — the strict regex `^\d{4}-\d{2}-\d{2}$` is preserved; the normalizer guarantees what reaches it is ISO.
- `cards.service.ts#acceptDraft` — receives already-normalized input; no service-layer changes.
- `future.service.ts` (Round 1) and the `acceptDraft` `periodKey` derivation (Rebound 1) — locked and untouched.
- `CardStatement` schema, `periodKey`/`periodLabel` fields.
- Locale-specific formats not observed in source data (e.g., `"2026年7月15日"`, `"15/07/26"` vs `"15/07/1926"`).
- No-day formats like `"July 2026"` — rejected with HTTP 400.
- Persisting the original (non-ISO) input — only ISO is stored.

**Minimalism guardrail:** the Developer must reject any addition not listed under "In scope". The normalizer is a single pure function plus a tiny integration wire-up. No helper abstractions, no date-library wrapper, no extension to other endpoints.

### Project-convention notes (override the Rebound 2 spec where it conflicts)

The Rebound 2 spec writes some paths and shapes that do not match the actual repo. The Developer must use these reconciled values:

| Spec said | Actual repo | Used in this plan |
|---|---|---|
| `workspace/backend/test/cards/date-normalizer.spec.ts` | `workspace/backend/tests/cards/date-normalizer.test.ts` (plural `tests/`, `.test.ts` suffix) | project convention |
| `workspace/backend/test/cards/cards.controller.accept.spec.ts` | `workspace/backend/tests/cards/cards.controller.accept.test.ts` | project convention |
| `POST /api/cards/draft/:id/accept` | `POST /api/card-statements/drafts/:draftId/accept` (routes plugin prefix `/api/card-statements`, controller path `/drafts/:draftId/accept`) | actual route |
| Body shape: top-level `preview` | Body shape: `{ preview: unknown }` — preview is nested under `preview` | actual controller |
| `ValidationError` emits `{ field, value, message }` to client | `setErrorHandler` in `src/app.ts` (lines 60-65) only emits `{ code, message }` to the client; `details` is stored on the instance for logging only | see contract below |

**Date normalizer wire-up contract** (the spec's intent is preserved, the encoding is project-realistic):

```ts
// In cards.controller.ts accept handler, BEFORE validateData:
const summaryFields = ["currentDueDate", "nextClosingDate", "nextDueDate"] as const;
const normalizedPreview = {
  ...body.preview,
  summary: { ...body.preview.summary },
};
for (const field of summaryFields) {
  const original = normalizedPreview.summary[field];
  const iso = parseAnyDateToISO(original);
  if (original !== null && original !== undefined && original !== "" && iso === null) {
    // Unparseable non-empty input → 400. Encode field/value INTO the message string
    // because setErrorHandler only forwards { code, message } to the HTTP client.
    // Pass the same context via details for downstream logging.
    throw new ValidationError(
      `${field} must be a recognized date format or ISO YYYY-MM-DD (got: ${JSON.stringify(original)})`,
      { field, value: original },
    );
  }
  normalizedPreview.summary[field] = iso;
}
const validatedPreview = validateData(cardStatementPreviewSchema, normalizedPreview);
```

### Package & dependency recommendations

No dependency changes.

### Source artifacts

- Proposal (rebound delta): `specs/002-fix-future-debt-period-key/code/proposal.md` → `## Rebound 2 — 2026-07-24`
- Specs (rebound contract): `specs/002-fix-future-debt-period-key/code/specs.md` → `## Rebound 2 — 2026-07-24` (esp. `### Contract: parseAnyDateToISO` and `### Wire-up contract`)
- Design (algorithm + risks): `specs/002-fix-future-debt-period-key/code/design.md` → `## Rebound 2 — 2026-07-24` (esp. `### Implementation strategy` and `### Function-level pseudocode`)
- Gherkin (6 new scenarios): `features/FEAT-024-fix-period-key.feature` lines 34-73
- Planner TDD checklist: `specs/002-fix-future-debt-period-key/test/tasks.md` → `## Rebound 2 — 2026-07-24`
- Round 1 implementation report: `specs/002-fix-future-debt-period-key/implementation_report.md`
- Rebound 1 validation: `specs/002-fix-future-debt-period-key/validation-results.md`

### Feature → task index

| FEAT-ID | Scenario (Gherkin) | Tasks |
|---|---|---|
| FEAT-024 | Aceptar resumen con currentDueDate en formato DD-Mon-YY (`"13-Jul-26"` → `"2026-07-13"`) | Task R2-1 (unit), Task R2-3 (integration) |
| FEAT-024 | Aceptar resumen con currentDueDate en formato DD/MM/YYYY (`"15/07/2026"` → `"2026-07-15"`) | Task R2-1 (unit), Task R2-3 (integration) |
| FEAT-024 | Aceptar resumen con currentDueDate en formato Month DD, YYYY (`"July 15, 2026"` → `"2026-07-15"`) | Task R2-1 (unit), Task R2-3 (integration) |
| FEAT-024 | Aceptar resumen con nextDueDate en formato DD/MM/YYYY (exercises `nextDueDate`, not only `currentDueDate`) | Task R2-1 (unit), Task R2-3 (integration, mixed-format) |
| FEAT-024 | Aceptar currentDueDate sin año asumiendo año actual (`"15-Jul"` → `"<currentYear>-07-15"`) | Task R2-1 (unit) |
| FEAT-024 | Normalizar cada campo de fecha de forma independiente (mixed formats across all three fields) | Task R2-1 (unit), Task R2-3 (integration, mixed-format) |

The 3 original Round 1 FEAT-024 scenarios (`currentPeriodKey` YYYY-MM / null / statementPeriodKey) remain covered by Round 1 + Rebound 1 tests and the locked Round 1 / Rebound 1 code; this plan does not re-test them.

---

### Task R2-1: RED — failing unit tests for `parseAnyDateToISO`

**Files:**
- `workspace/backend/tests/cards/date-normalizer.test.ts` (new)

**Skills the Developer should look for:** anything for vitest unit-test scaffolding with TypeScript imports, anything for asserting date string normalization with the project's existing test patterns (see `workspace/backend/tests/cards/period-key-format.test.ts` for the local style — `describe`/`it`/`expect`, single-line assertions, explicit `expect(...).toBe(...)` rather than snapshots).

- [ ] **Step R2-1.1: Create the test file with one `it()` per accepted format**

Create `workspace/backend/tests/cards/date-normalizer.test.ts` with imports from `vitest` and from the not-yet-existing module:

```ts
import { describe, it, expect } from "vitest";
import { parseAnyDateToISO } from "../../src/modules/cards/date-normalizer.js";
```

Add a single `describe("parseAnyDateToISO")` block containing the following `it()` cases. Each is a sketch; the Developer writes the test body. Use direct `expect(parseAnyDateToISO(input)).toBe(expectedOutput)` for unambiguous equality — do NOT use `toMatch` or loose equality, because the spec is strict about output.

| Test name | Input | Expected output |
|---|---|---|
| `passthrough ISO "2026-07-15"` | `"2026-07-15"` | `"2026-07-15"` |
| `zero-pads single-digit month "2026-7-15"` | `"2026-7-15"` | `"2026-07-15"` |
| `parses DD/MM/YYYY "15/07/2026"` | `"15/07/2026"` | `"2026-07-15"` |
| `parses DD-MM-YYYY "15-07-2026"` | `"15-07-2026"` | `"2026-07-15"` |
| `parses DD.MM.YYYY "15.07.2026"` | `"15.07.2026"` | `"2026-07-15"` |
| `parses DD-Mon-YY "13-Jul-26" → 20YY` | `"13-Jul-26"` | `"2026-07-13"` |
| `parses DD-Mon-YYYY "13-Jul-2026"` | `"13-Jul-2026"` | `"2026-07-13"` |
| `parses DD-Mon no-year using current year` | `"15-Jul"` | `` `${new Date().getFullYear()}-07-15` `` (compute once at top of `it`) |
| `parses "July 15, 2026"` | `"July 15, 2026"` | `"2026-07-15"` |
| `parses "Jul 15, 2026"` | `"Jul 15, 2026"` | `"2026-07-15"` |
| `parses "15 July 2026"` | `"15 July 2026"` | `"2026-07-15"` |
| `parses "15 Jul 2026"` | `"15 Jul 2026"` | `"2026-07-15"` |
| `returns null for null` | `null` | `null` |
| `returns null for undefined` | `undefined` | `null` |
| `returns null for empty string ""` | `""` | `null` |
| `returns null for whitespace-only "   "` | `"   "` | `null` |
| `returns null for "not a date" without throwing` | `"not a date"` | `null` (wrap call in arrow: `expect(() => parseAnyDateToISO("not a date")).not.toThrow()` AND `expect(parseAnyDateToISO("not a date")).toBeNull()`) |
| `returns null for impossible date "2026-13-40"` | `"2026-13-40"` | `null` (regex passes ISO shape but `Date` roll-over yields invalid → `null`) |

Edge cases worth a separate `it()` even though they are in the failure block:

- `parses "31-Jul-26" → "2026-07-31"` (validates month-name-to-index lookup does not offset).
- `trims surrounding whitespace "  15-Jul-26  "` → `"2026-07-13"`.

Total: ~18-20 `it()` blocks. The Developer writes each one as 2-3 lines (call + assertion + maybe an extra `not.toThrow()` for failure cases). Do NOT use table-driven `it.each` — one `it` per format is what `test/tasks.md` specifies and makes failures pinpoint which format regressed.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/date-normalizer.test.ts`
Expected: all `it()` blocks fail. The first failures will be `Failed to resolve import "../../src/modules/cards/date-normalizer.js"` (module does not exist). After the Developer creates a stub (empty export), the failures switch to `parseAnyDateToISO is not a function` / wrong return values.

- [ ] **Step R2-1.2: Confirm RED for the right reasons**

Open the failing test output and verify each test fails for one of:
- module-not-found (no stub yet)
- function-not-exported (stub exists but missing the export)
- wrong return value (stub returns `undefined` for everything; ISO passthrough test would fail because `"2026-07-15" !== undefined`)

If any test PASSES against the stub, the assertion is too weak — tighten it before moving on.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/date-normalizer.test.ts 2>&1 | tail -40`
Expected: every `it()` listed above appears in the failed-tests list. Count must be ≥ 18 failed.

---

### Task R2-2: GREEN — implement `parseAnyDateToISO`

**Files:**
- `workspace/backend/src/modules/cards/date-normalizer.ts` (new)

**Skills the Developer should look for:** anything for TypeScript module authoring, anything for regex-driven parsing of date strings, anything for unit-testing pure functions.

- [ ] **Step R2-2.1: Create the module with the three exports**

Create `workspace/backend/src/modules/cards/date-normalizer.ts`. Required exports:

```ts
export function parseAnyDateToISO(input: string | null | undefined): string | null
export function toIsoYmd(date: Date): string
export function monthNameToIndex(name: string): number | null
```

**Responsibility of `parseAnyDateToISO`:**

- Return `null` for `null`, `undefined`, `""`, or whitespace-only input (after `.trim()`).
- Otherwise `.trim()` the input and try, in order, the four branches from `design.md` Rebound 2 → "Function-level pseudocode":
  1. **ISO passthrough + zero-pad** — match `/^\d{4}-\d{1,2}-\d{1,2}$/`. Parse with `new Date(s)`. If valid, return `toIsoYmd(d)`. (This catches `"2026-07-15"` and `"2026-7-15"`.)
  2. **Numeric `DD<sep>MM<sep>YY(YY)`** — match `/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/`. Interpret as `DD<sep>MM<sep>YY(YY)` (locale-independent: `15/07/2026` is always `DD/MM/YYYY`, never `MM/DD/YYYY`). If year is 2 digits, prepend `20`. Build via `new Date(Date.UTC(year, +mm - 1, +dd))` and verify `!isNaN(d)` (catches roll-overs like `"2026-13-40"` which would otherwise silently produce a Date).
  3. **`DD-Mon(-YY(YY))?`** — match `/^(\d{1,2})-([A-Za-z]{3,9})(-(\d{2,4}))?$/`. Look up the month via `monthNameToIndex`. If no year suffix, use `new Date().getFullYear()` evaluated **per call** (NOT captured at module load) so long-running processes don't pin a stale year. Build via `Date.UTC(year, monthIdx, +dd)` and verify `!isNaN(d)`.
  4. **`Date.parse` fallback** — for `"Month DD, YYYY"` and `"DD Month YYYY"` style strings (English month names). Call `Date.parse(s)`; if finite AND the input contains a recognizable long month name, return `toIsoYmd(new Date(d))`. The "contains a long month name" guard prevents `Date.parse` from succeeding on slash forms (which the regex branch already handled, but defense-in-depth here).
- Return `null` for anything that does not match a branch or that yields `isNaN(Date)`.
- Never throw.

**Responsibility of `toIsoYmd`:**

- Build `YYYY-MM-DD` from a `Date` using UTC (`getUTCFullYear`, `getUTCMonth() + 1` zero-padded, `getUTCDate()` zero-padded).

**Responsibility of `monthNameToIndex`:**

- Static lookup over `{ jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }`, lower-cased keys.
- Accept both 3-letter abbreviations (`Jul`) and full names (`July`) by using `startsWith` or by storing both forms.
- Return `null` for unknown names.

**Implementation hints** (the Developer writes the code; these are the gotchas `design.md` called out):

- Build the `Date` for branches 2 and 3 with `Date.UTC` so timezone cannot drift the day/month. The only `getFullYear()` (local-time) call is in branch 3 when year is missing — and it's only the year, never the day/month.
- For branch 4, do NOT rely on `Date.parse` for slash-separated forms. Slash forms have already been handled by branch 2; the `Date.parse` fallback only sees `"Month DD, YYYY"` / `"DD Month YYYY"` strings.
- Validate every constructed `Date` with `Number.isNaN(d.getTime())` before formatting — `"2026-13-40"` would otherwise slip through as `2027-02-09` (JS roll-over).

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/date-normalizer.test.ts`
Expected: all `it()` blocks pass. Zero failures, zero skipped.

- [ ] **Step R2-2.2: Type-check and build**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, no new errors.

Run: `cd workspace/backend && npx prettier --check src/modules/cards/date-normalizer.ts tests/cards/date-normalizer.test.ts`
Expected: exit 0 (no files would be reformatted). If prettier complains, run `npx prettier --write` on the offending files and re-check.

- [ ] **Step R2-2.3: Commit the normalizer + tests**

```bash
git add workspace/backend/src/modules/cards/date-normalizer.ts workspace/backend/tests/cards/date-normalizer.test.ts
git commit -m "feat(cards): add parseAnyDateToISO normalizer for non-ISO summary dates

Accepts the date formats the AI extractor actually emits (DD-Mon-YY,
DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, Month DD YYYY, DD Month YYYY) and
returns ISO YYYY-MM-DD. Returns null for unparseable input without
throwing so the caller can decide whether to 400 or pass-through.

Next: wire the normalizer into cards.controller.ts accept handler.

Refs: FEAT-024 Rebound 2"
```

---

### Task R2-3: RED — failing integration tests for the accept endpoint

**Files:**
- `workspace/backend/tests/cards/cards.controller.accept.test.ts` (new)

**Skills the Developer should look for:** anything for Fastify integration tests via `app.inject()`, anything for seeding Prisma rows in tests (see `workspace/backend/src/modules/future/__tests__/fixtures/test-db.ts` for the pattern — copy `prisma/dev.db` to `os.tmpdir()`, migrate if missing, expose `close()`).

- [ ] **Step R2-3.1: Create the integration test file with three failing tests**

Create `workspace/backend/tests/cards/cards.controller.accept.test.ts`. The shape follows `workspace/backend/tests/smoke/api-smoke.test.ts` and `workspace/backend/src/modules/future/__tests__/api.test.ts`. Sketch:

- Imports: `vitest`, `FastifyInstance`, `buildApp`, `prisma`, and `createFutureTestDatabase` (or a local equivalent if the cards module needs its own helper).
- Top-level `describe("POST /api/card-statements/drafts/:draftId/accept — non-ISO summary dates")`.
- `beforeAll`: spin up a tmp SQLite, run migrations, call `buildApp()`, call `app.ready()`. Save the returned `app` and `db` to `let` bindings.
- `afterAll`: `await app.close()` then drop the tmp DB file.
- Helper `async function seedPreviewReadyDraft(preview: object): Promise<string>` that inserts an `UploadedDocument` (required FK), a `CardStatementDraft` with `status: "preview_ready"` and `previewJson: JSON.stringify(preview)`, and returns the draft id. The Developer writes the helper; the contract is: any minimal `CardStatementPreview`-shaped object passed in becomes the draft's `previewJson`. The OTHER preview fields (`source`, `sections`, `groups`, `rows`, `futureInstallmentsBlock`) must be set to valid shapes per `cardStatementPreviewSchema` (the schema will be re-validated after normalization; the Developer should use the same minimal `preview()` helper from `period-key-format.test.ts` as a starting point and adapt it).

Three `it()` blocks, each failing RED until Task R2-4 wires the normalizer:

| Test name | Seeded `preview.summary.currentDueDate` | Expected HTTP | Expected persisted `CardStatement.currentDueDate` |
|---|---|---|---|
| `accepts "13-Jul-26" as ISO "2026-07-13"` | `"13-Jul-26"` | `200` | `"2026-07-13"` |
| `accepts mixed formats across the three date fields` | `currentDueDate: "2026-07-13"`, `nextClosingDate: "28-Jul-26"`, `nextDueDate: "15/08/2026"` | `200` | all three fields persisted as ISO (`"2026-07-13"`, `"2026-07-28"`, `"2026-08-15"`) |
| `rejects unrecognizable format with HTTP 400 carrying field and value` | `currentDueDate: "not a date"` | `400` | response body message includes `currentDueDate` AND `not a date`; `CardStatement` was NOT created (count stays 0) |

**Assertion details** (Developer writes the bodies; these are the contracts):

- For the success tests: `await app.inject({ method: "POST", url: \`/api/card-statements/drafts/\${draftId}/accept\`, payload: { preview } })`. Assert `response.statusCode === 200`. Then query the DB: `const stmt = await prisma.cardStatement.findFirst({ where: { draftId }, orderBy: { createdAt: "desc" } });` and assert the three date fields.
- For the failure test: assert `response.statusCode === 400`, `JSON.parse(response.body).code === "VALIDATION_ERROR"`, and `JSON.parse(response.body).message.includes("currentDueDate") && JSON.parse(response.body).message.includes("not a date")`. Then assert `await prisma.cardStatement.count({ where: { draftId } }) === 0` to confirm no side-effect persisted.

**Important wiring note:** the test file needs `process.env.DATABASE_URL` set to the tmp file path BEFORE `prisma` is imported. Replicate the pattern from `src/modules/future/__tests__/fixtures/test-db.ts` — use `process.env.DATABASE_URL = databaseUrl(filePath)` in `beforeAll`, or pass a custom Prisma instance into `buildApp` via an options hook (currently `buildApp` only accepts `futureDebtService`; the cards module reads `prisma` from the singleton, so the env-var approach is the path of least resistance — match what `test-db.ts` does).

**Why the tests fail RED:** the controller currently calls `validateData(cardStatementPreviewSchema, preview)` with the raw non-ISO summary. The schema's strict regex rejects non-ISO values with a `ValidationError` (status 400, code `VALIDATION_ERROR`, message `Validation failed: summary.currentDueDate: currentDueDate must be ISO YYYY-MM-DD`). So:
- The `"13-Jul-26"` test will fail with a 400 instead of the expected 200.
- The mixed-format test will fail with a 400 (caught on the first non-ISO field).
- The "not a date" test will actually pass today (it already gets a 400) — but the assertion on the persisted DB count will pass too because no statement is created. **Tighten this assertion** to also check the response message contains the original value `not a date`; the current schema rejection does NOT include the offending value, only the field name. So the third test fails RED on the message-content assertion.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/cards.controller.accept.test.ts`
Expected: 3 failed tests. The first two fail on `expected 200 to be 400`. The third fails on `expected '...' to include 'not a date'` (or whichever substring assertion the Developer chooses).

- [ ] **Step R2-3.2: Confirm RED for the right reasons**

Inspect the vitest output. Each failure message should reference either `expected 200 to be 400` (tests 1 and 2) or a message-substring mismatch (test 3). If any test passes, the assertion is too weak — tighten before continuing.

---

### Task R2-4: GREEN — wire up the normalizer in `cards.controller.ts`

**Files:**
- `workspace/backend/src/modules/cards/cards.controller.ts` (modified)

**Skills the Developer should look for:** anything for Fastify controller mutation patterns (shallow-clone before assign), anything for the project's `ValidationError` constructor from `../../shared/errors.js`.

- [ ] **Step R2-4.1: Import the normalizer and the error class**

In `workspace/backend/src/modules/cards/cards.controller.ts`, add to the existing import block at the top of the file:

```ts
import { parseAnyDateToISO } from "./date-normalizer.js";
import { ValidationError } from "../../shared/errors.js";
```

The existing `import { cardsService }` / `import { cardStatementPreviewSchema, ... } from "./cards.schemas.js"` lines remain unchanged.

- [ ] **Step R2-4.2: Insert the normalization block before `validateData` in the accept handler**

Find the accept handler (current line range ~129-142, `app.post("/drafts/:draftId/accept", ...)`). Currently it reads `const { preview } = body;` then `const validatedPreview = validateData(cardStatementPreviewSchema, preview);`. Replace those two lines (after `const { preview } = body;`) with the normalization logic from the **Project-convention notes → Date normalizer wire-up contract** above.

**Exactly what to do (the Developer implements; do NOT paste this as a comment block in the source):**

- Build `const normalizedPreview = { ...preview, summary: { ...preview.summary } };`. (Shallow clone so the request payload object is not mutated — important: the original `body` is still referenced by Fastify's request lifecycle, and `preview` may be reused elsewhere.)
- Iterate over the three field names in a typed `as const` tuple. For each:
  - Read `original = normalizedPreview.summary[field];`.
  - Compute `iso = parseAnyDateToISO(original);`.
  - If `original !== null && original !== undefined && original !== ""` AND `iso === null`, throw `new ValidationError(\`${field} must be a recognized date format or ISO YYYY-MM-DD (got: ${JSON.stringify(original)})\`, { field, value: original });`.
  - Otherwise, `normalizedPreview.summary[field] = iso;` (assigns `null` back for empty inputs, which the schema accepts because the field is `.nullable()`).
- Replace `const validatedPreview = validateData(cardStatementPreviewSchema, preview);` with `const validatedPreview = validateData(cardStatementPreviewSchema, normalizedPreview);`.
- Everything else in the handler (the `cardsService.acceptDraft(draftId, validatedPreview)` call, the `logger.info`, the `reply.send(result)`) stays byte-identical.

**What NOT to do:** do not modify the `PUT /drafts/:draftId` handler (the user edits path). The spec scopes this to `acceptDraft` only. do not change `cards.schemas.ts`. do not change `cards.service.ts`.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/cards.controller.accept.test.ts`
Expected: 3 passed tests. The first two now return HTTP 200 with the ISO date persisted. The third returns HTTP 400 with the message encoding both `currentDueDate` and `"not a date"`.

- [ ] **Step R2-4.3: Re-run the Round 1 + Rebound 1 cards tests to confirm no regression**

The schema tests in `workspace/backend/tests/cards/period-key-format.test.ts` exercise `validateData(cardStatementPreviewSchema, input)` directly with non-ISO inputs and expect `ZodError`. Those tests DO NOT go through the controller — they call the schema parser in isolation. Because we only changed the controller (not the schema), those tests must still pass unchanged.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/period-key-format.test.ts`
Expected: 7 passed (same as Rebound 1 baseline).

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/`
Expected: all cards-module tests pass; 0 failures. The schema-level rejection tests still reject non-ISO inputs (proving the schema was not loosened) and the new normalizer/accept tests cover the controller-level acceptance path.

- [ ] **Step R2-4.4: Type-check and build**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, no new errors.

Run: `cd workspace/backend && npx prettier --check src/modules/cards/cards.controller.ts src/modules/cards/date-normalizer.ts tests/cards/date-normalizer.test.ts tests/cards/cards.controller.accept.test.ts`
Expected: exit 0 (no files would be reformatted).

- [ ] **Step R2-4.5: Commit the controller wire-up**

```bash
git add workspace/backend/src/modules/cards/cards.controller.ts workspace/backend/tests/cards/cards.controller.accept.test.ts
git commit -m "feat(cards): normalize non-ISO summary dates at accept-draft boundary

The AI extractor emits dates in DD-Mon-YY, DD/MM/YYYY, Month DD YYYY, and
similar formats. Rebound 1 tightened cardStatementPreviewSchema to require
strict ISO YYYY-MM-DD, which rejects every non-ISO payload with HTTP 400.

This rebound inserts parseAnyDateToISO at the controller boundary (before
validateData), shallow-cloning preview.summary and normalizing each of
currentDueDate, nextClosingDate, nextDueDate independently. Unparseable
non-empty input throws ValidationError (HTTP 400) with the field and
original value embedded in the message. The strict Zod regex is preserved
as a defense-in-depth check on the normalizer's output.

Accept endpoint: POST /api/card-statements/drafts/:draftId/accept
- \"13-Jul-26\"  -> \"2026-07-13\"
- \"15/07/2026\" -> \"2026-07-15\"
- \"July 15, 2026\" -> \"2026-07-15\"
- \"not a date\" -> HTTP 400 (currentDueDate must be a recognized date
  format or ISO YYYY-MM-DD (got: \"not a date\"))

Refs: FEAT-024 Rebound 2"
```

---

### Task R2-5: Verification (run by the Developer)

- [ ] **Step R2-5.1: Linter (project convention: prettier only — ESLint is not configured)**

Run: `cd workspace/backend && npx prettier --check src/modules/cards/date-normalizer.ts src/modules/cards/cards.controller.ts tests/cards/date-normalizer.test.ts tests/cards/cards.controller.accept.test.ts`
Expected: exit 0, all files match Prettier style.

- [ ] **Step R2-5.2: Type checker**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

- [ ] **Step R2-5.3: Targeted unit + integration tests**

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/date-normalizer.test.ts tests/cards/cards.controller.accept.test.ts`
Expected: 0 failures. All normalizer-format cases + all 3 controller-level acceptance cases pass.

- [ ] **Step R2-5.4: Full cards-module regression**

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/`
Expected: 0 failures. Schema rejection tests (5) + periodKey resolution tests (2) + new normalizer tests (~18) + new controller tests (3) + projections / history / golden-fixture / etc. — all pass. No regression in the Rebound 1 baseline.

- [ ] **Step R2-5.5: Full backend regression**

Run: `cd workspace/backend && npm test`
Expected: 0 failures across all test files. Baseline (Rebound 1) was 258 passed across 50 files; this run should be ≥ 258 + ~21 new tests (18 normalizer + 3 controller).

- [ ] **Step R2-5.6: Confirm FEAT-024 scenario coverage (per `IADEV-bdd-implementation`)**

For every FEAT-024 scenario (3 Round 1 + 1 Rebound 1 + 6 Rebound 2 = 10 scenarios total — note: the brief mentions "9" but counting `features/FEAT-024-fix-period-key.feature` shows 9 scenario blocks: 3 + 6, where the 6th "Normalizar cada campo" satisfies the "Aceptar nextDueDate en DD/MM/YYYY" scenario from the planner's task list as a sub-case), point at the test file(s) covering it:

| FEAT-024 Scenario | Test file |
|---|---|
| `currentPeriodKey` YYYY-MM cuando hay resumen activo | Round 1 tests in `src/modules/future/__tests__/service.test.ts` (locked) |
| `currentPeriodKey` null cuando no hay resumen activo | Round 1 tests (locked) |
| `statementPeriodKey` en cada ocurrencia válido | Round 1 tests (locked) |
| `currentDueDate` no-ISO produces schema error (Rebound 1) | `tests/cards/period-key-format.test.ts` (locked) |
| Aceptar resumen con `currentDueDate` en formato DD-Mon-YY | `tests/cards/date-normalizer.test.ts` ("parses DD-Mon-YY...") + `tests/cards/cards.controller.accept.test.ts` ("accepts '13-Jul-26' as ISO '2026-07-13'") |
| Aceptar resumen con `currentDueDate` en formato DD/MM/YYYY | `tests/cards/date-normalizer.test.ts` ("parses DD/MM/YYYY '15/07/2026'") + `tests/cards/cards.controller.accept.test.ts` (mixed-format covers it) |
| Aceptar resumen con `currentDueDate` en formato Month DD, YYYY | `tests/cards/date-normalizer.test.ts` ("parses 'July 15, 2026'") + `tests/cards/cards.controller.accept.test.ts` (mixed-format) |
| Aceptar resumen con `nextDueDate` en formato DD/MM/YYYY | `tests/cards/date-normalizer.test.ts` (DD/MM/YYYY test) + `tests/cards/cards.controller.accept.test.ts` (mixed-format asserts `nextDueDate` normalized) |
| Aceptar `currentDueDate` sin año asumiendo año actual | `tests/cards/date-normalizer.test.ts` ("parses DD-Mon no-year using current year") |
| Normalizar cada campo de fecha de forma independiente | `tests/cards/cards.controller.accept.test.ts` ("accepts mixed formats across the three date fields") |

Document this mapping in `specs/002-fix-future-debt-period-key/implementation_report.md` under a new `### Rebound 2` section, recording the new test files, commit hashes, and scenario coverage table.

Missing coverage is a verification failure even if every gate is green.

---

### Task R2-6: Tester handoff (run by the Tester, not the Developer)

The Developer lists the following gates in `## Test run evidence -> Deferred to the Tester` of `implementation_report.md` under the `### Rebound 2` section. The Tester runs them in `IADEV-validating-implementation` Pass 2.

| Gate | Configured? | Command the Tester should run |
|---|---|---|
| Integration tests | yes | `cd workspace/backend && npx vitest run --reporter=verbose tests/cards/cards.controller.accept.test.ts` |
| E2E tests | no | — |
| Build / packaging | yes | `cd workspace/backend && npm run build` |
| Pre-commit / pre-push hooks | no | — |
| Other — manual smoke against a live backend | yes | `curl -X POST "http://127.0.0.1:11436/api/card-statements/drafts/<draftId>/accept" -H 'content-type: application/json' --data '{"preview":{"source":{"bankName":"X","brand":"Visa","statementNumber":"1","pageCount":1},"summary":{"totalPesos":"0","totalDollars":"0","minimumPaymentPesos":"0","currentDueDate":"13-Jul-26","nextClosingDate":null,"nextDueDate":null},"sections":[],"groups":[],"rows":[],"futureInstallmentsBlock":[]}}'` — should return HTTP 200; `CardStatement.currentDueDate` in the DB should be `"2026-07-13"` |

---

### Rebound 2 — Risks and rollback notes (for the Tester and the user)

1. **`Date.parse` locale-dependence.** The implementation deliberately uses regex parsers for slash/dot/dash numeric forms BEFORE `Date.parse`, so `"15/07/2026"` is always interpreted as `DD/MM/YYYY` (Latin American convention). If a future caller sends a US-locale `MM/DD/YYYY` string (`"07/15/2026"`), the regex will parse day=`07`, month=`15`, year=`2026`, which `Date.UTC` will roll over to `2027-03-07`. This is intentional per `specs.md` Rebound 2 → "Determinism requirement" but is worth a note for the Tester: confirm with the user that all callers (the AI extractor and any manual-edit UI) emit `DD/MM/YYYY` only.

2. **`new Date().getFullYear()` at call time.** Branch 3 of `parseAnyDateToISO` calls `new Date().getFullYear()` per invocation, not at module load. A unit test using `vi.useFakeTimers()` could lock the year; the current test file does NOT use fake timers — it computes the expected year at the top of the `it()` block from the real clock. Document this in the test file header comment so a future maintainer does not "fix" the test by hard-coding `"2026"`.

3. **`ValidationError.details` is server-side only.** The HTTP response body contains `{ code: "VALIDATION_ERROR", message: "currentDueDate must be a recognized date format or ISO YYYY-MM-DD (got: \"not a date\")" }` — NOT a structured `{ field, value }` object. The field name and the original value are encoded into the message string. This is a hard constraint of the existing `setErrorHandler` in `src/app.ts` (lines 60-65). If the user wants a structured response body, that is a follow-up that touches the error handler — out of scope for this rebound.

4. **Other controllers (`PUT /drafts/:draftId`).** The normalizer runs ONLY in the `accept` handler, not in `updateDraft`. If a user can save a draft with non-ISO dates via `PUT`, then later accept it via `POST`, the accept path normalizes correctly. But if any client surfaces the `updateDraft` payload as user-editable with non-ISO dates, those will still 400 on `PUT`. Out of scope per `specs.md` Rebound 2 → "Scope".

5. **No persisted original.** The non-ISO original input is not stored anywhere — only the normalized ISO result lands in `CardStatement`. If the user later wants to audit what the AI extractor emitted, they need to look at the import pipeline logs or the AI extraction cache, not the CardStatement row.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

> **For the Developer agent:** This section **appends** to the Round 1 + Rebound 1 + Rebound 2 plan above. Do NOT touch any prior tasks — they are complete and locked. Execute only Tasks R3-1 through R3-5 below, using `IADEV-test-driven-development` and verifying each step.

### Goal

Wire `parseAnyDateToISO()` into `ai-extraction.service.ts normalizeModelResponse()` so that the AI extraction pipeline accepts non-ISO date strings (`"13-Jul-26"`, `"15/08/2026"`, `"July 15, 2026"`) and normalizes them to ISO before the strict Zod schema validates the summary — eliminating HTTP 422 on PDF imports.

### Architecture summary

Rebound 2 added `parseAnyDateToISO` at the `cards.controller.ts` accept-draft boundary. Rebound 3 adds a second call site inside the AI extraction pipeline (`normalizeModelResponse`), which is the path that handles PDF imports. The two call sites are independent and both feed into the same `cardStatementPreviewSchema` validation. No new dependencies; `parseAnyDateToISO` already exists.

### Tech stack (unchanged)

- Language / runtime: Node.js 24.18
- Framework: Fastify 5
- ORM: Prisma 6
- Validation: Zod 3
- Testing: Vitest 3
- No new packages — uses only Node 24 built-ins.

### Scope

**In scope (this plan delivers):**

- Unit tests for `parseAnyDateToISO` behavior with the formats most likely from AI output (`"13-Jul-26"`, `"15/07/2026"`, `"July 15, 2026"`, etc.).
- Import of `parseAnyDateToISO` in `ai-extraction.service.ts`.
- Three-line fix in `normalizeModelResponse()` wrapping `currentDueDate`, `nextClosingDate`, `nextDueDate` with `parseAnyDateToISO` (via direct composition `parseAnyDateToISO(asString(...))`).
- Integration test for the full AI extraction flow with non-ISO dates, confirming HTTP 200/201 (not 422) and ISO-persisted `CardStatement` rows.

**Out of scope (do NOT touch in this plan):**

- `cards.controller.ts` accept-draft wire-up (Rebound 2 — locked and untouched).
- `date-normalizer.ts` algorithm (already implemented and tested in Rebound 2).
- `CardStatement.periodKey` / `periodLabel` fields.
- Any other call sites of `parseAnyDateToISO` beyond `normalizeModelResponse()`.
- PDF parsing logic or AI model mock internals beyond the `normalizeModelResponse` layer.

**Minimalism guardrail:** the Developer must reject any addition not listed under "In scope". Three lines in one function, plus two test files.

### Package & dependency recommendations

No dependency changes.

### Source artifacts

- Design (rebound delta): `specs/002-fix-future-debt-period-key/code/design.md` → `## Rebound 3 — 2026-07-25`
- Specs: `specs/002-fix-future-debt-period-key/code/specs.md` → `## Rebound 3 — 2026-07-25`
- Planner TDD checklist: `specs/002-fix-future-debt-period-key/test/tasks.md` → `## Rebound 3 — 2026-07-25`
- Rebound 2 implementation: `specs/002-fix-future-debt-period-key/implementation.md` (Rebound 2 section — locked)

### Feature → task index

| FEAT-ID | Feature | Tasks |
|---|---|---|
| FEAT-024 | Wire normalizer into AI extraction pipeline | Task R3-1 (RED unit), Task R3-2 (GREEN), Task R3-3 (RED→GREEN integration), Task R3-4 (verification), Task R3-5 (Tester handoff) |

---

### Task R3-1: RED — failing unit tests for `parseAnyDateToISO` at the extraction layer

**Files:**
- `workspace/backend/tests/ai/date-normalization.test.ts` (new)

**Skills the Developer should look for:** anything for Vitest unit-test scaffolding with TypeScript imports, anything for asserting pure-function date normalization with the project's existing test patterns (see `workspace/backend/tests/cards/date-normalizer.test.ts` for the local `describe`/`it`/`expect` style — single-line `expect(...).toBe(...)` assertions, no snapshots).

- [ ] **Step R3-1.1: Create the test file**

Create `workspace/backend/tests/ai/date-normalization.test.ts`. Import `parseAnyDateToISO` from `../../src/modules/cards/date-normalizer.js` (the `.js` extension is required for ESM resolution in vitest). Create a single `describe("parseAnyDateToISO")` block with the following `it()` cases. Use direct `expect(parseAnyDateToISO(input)).toBe(expectedOutput)` — do NOT use `toMatch` or loose equality.

| Test name | Input | Expected output |
|---|---|---|
| `parses DD-Mon-YY "13-Jul-26"` | `"13-Jul-26"` | `"2026-07-13"` |
| `parses DD/MM/YYYY "15/07/2026"` | `"15/07/2026"` | `"2026-07-15"` |
| `parses Month DD, YYYY "July 15, 2026"` | `"July 15, 2026"` | `"2026-07-15"` |
| `passthrough ISO "2026-07-15"` | `"2026-07-15"` | `"2026-07-15"` |
| `returns null for null` | `null` | `null` |

The Developer writes each `it()` as 2 lines (call + `expect(...).toBe(...)`). Do NOT use `it.each` — one `it` per format.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/date-normalization.test.ts`
Expected: 5 failures. The first failures will be `Failed to resolve import` (the `../../src` path from `tests/ai/` may not resolve in vitest's tsconfig). If so, the Developer must adjust the import path or add a vitest module alias — this import-resolution fix is part of making RED genuine, not a bypass.

- [ ] **Step R3-1.2: Confirm RED for the right reasons**

Open the failing test output and verify each of the 5 `it()` blocks appears in the failed-tests list. If the import resolution fails, fix the import path first (the project uses `.js` extension in ESM imports; verify the correct relative path from `tests/ai/` to `src/modules/cards/`).

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/date-normalization.test.ts 2>&1 | tail -40`
Expected: 5 failed lines. No passed lines.

---

### Task R3-2: GREEN — apply fix in `ai-extraction.service.ts normalizeModelResponse()`

**Files:**
- `workspace/backend/src/modules/ai/ai-extraction.service.ts` (modified)

**Skills the Developer should look for:** anything for the language/runtime in use (Node.js / TypeScript).

- [ ] **Step R3-2.1: Add the import**

Open `workspace/backend/src/modules/ai/ai-extraction.service.ts`. Add to the existing import block at the top of the file:

```ts
import { parseAnyDateToISO } from '../cards/date-normalizer.js';
```

Run: `cd workspace/backend && npx tsc --noEmit src/modules/ai/ai-extraction.service.ts`
Expected: exit 0, no new type errors (the import resolves to the existing `date-normalizer.ts` module).

- [ ] **Step R3-2.2: Wrap the three date fields in `normalizeModelResponse()`**

Locate `normalizeModelResponse()` (around lines 535–541). The current code reads:

```ts
currentDueDate: asString(summary.currentDueDate),
nextClosingDate: asString(summary.nextClosingDate),
nextDueDate: asString(summary.nextDueDate),
```

Replace with:

```ts
currentDueDate: parseAnyDateToISO(asString(summary.currentDueDate)),
nextClosingDate: parseAnyDateToISO(asString(summary.nextClosingDate)),
nextDueDate: parseAnyDateToISO(asString(summary.nextDueDate)),
```

Do NOT paste this as a comment block; the Developer implements it.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/date-normalization.test.ts`
Expected: all 5 `it()` blocks pass. 0 failures.

- [ ] **Step R3-2.3: Type-check and formatter check**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

Run: `cd workspace/backend && npx prettier --check src/modules/ai/ai-extraction.service.ts`
Expected: exit 0 (no files would be reformatted).

- [ ] **Step R3-2.4: Commit**

```bash
git add workspace/backend/src/modules/ai/ai-extraction.service.ts
git commit -m "fix(ai): normalize non-ISO summary dates in extractAndSave pipeline

Wire parseAnyDateToISO into normalizeModelResponse() so that DD-Mon-YY,
DD/MM/YYYY, and Month DD YYYY summary dates are converted to ISO YYYY-MM-DD
before the cardStatementPreviewSchema validation — eliminating HTTP 422 on
PDF imports.

Refs: FEAT-024 Rebound 3"
```

---

### Task R3-3: RED → GREEN — integration test for full AI extraction flow with non-ISO dates

**Files:**
- `workspace/backend/tests/ai/ai-extraction.integration.test.ts` (new)

**Skills the Developer should look for:** anything for Fastify integration tests via `app.inject()`, anything for AI extraction service testing with mocked model responses (see `workspace/backend/tests/cards/cards.controller.accept.test.ts` for the local pattern of spinning up a tmp SQLite DB, seeding rows, calling `app.inject()`, and asserting DB state).

- [ ] **Step R3-3.1: Create the integration test file — RED**

Create `workspace/backend/tests/ai/ai-extraction.integration.test.ts`. The test exercises the full `AiExtractionService.extractAndSave()` path with a mock AI model that returns non-ISO dates. Sketch:

- Arrange: mock the AI model so `normalizeModelResponse()` receives `summary` with `currentDueDate: "13-Jul-26"`, `nextClosingDate: "28-Jul-26"`, `nextDueDate: "15/08/2026"`. Set up a temporary SQLite DB (use the same `test-db.ts` pattern as the cards controller tests).
- Act: call `AiExtractionService.extractAndSave()` or `CardsController.importPdf()` with the mocked PDF/document input.
- Assert: the operation returns success (HTTP 200/201, not 422). Then query the persisted `CardStatement` from the DB and assert `currentDueDate === "2026-07-13"`, `nextClosingDate === "2026-07-28"`, `nextDueDate === "2026-08-15"`.

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/ai-extraction.integration.test.ts`
Expected: 1 failed test. The failure is an HTTP 422 or a Zod validation error because `parseAnyDateToISO` is not yet wired into `normalizeModelResponse()`.

- [ ] **Step R3-3.2: Confirm RED**

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/ai-extraction.integration.test.ts 2>&1 | tail -20`
Expected: 1 failed test. Failure reason must reference validation error, schema rejection, or HTTP 422.

- [ ] **Step R3-3.3: GREEN — confirm integration test passes after the fix**

After Task R3-2 is complete (the three lines are wired), re-run:

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/ai-extraction.integration.test.ts`
Expected: 1 passed test. 0 failures.

---

### Task R3-4: Verification (run by the Developer)

- [ ] **Step R3-4.1: Type checker**

Run: `cd workspace/backend && npx tsc --noEmit`
Expected: exit 0, 0 errors.

- [ ] **Step R3-4.2: Targeted unit + integration tests**

Run: `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/date-normalization.test.ts tests/ai/ai-extraction.integration.test.ts`
Expected: 0 failures. All 6 tests (5 unit + 1 integration) pass.

- [ ] **Step R3-4.3: Full backend regression**

Run: `cd workspace/backend && npm test`
Expected: 0 failures. The Rebound 2 baseline was ≥ 258 tests; this run should be ≥ 264 (+ 6 new).

- [ ] **Step R3-4.4: Confirm FEAT-024 scenario coverage (per `IADEV-bdd-implementation`)**

The new tests cover the two Rebound-3 Gherkin scenarios added to `features/FEAT-024-fix-period-key.feature` (FEAT-024 `Importar PDF con currentDueDate en formato DD-Mon-YY` and `Importar PDF con nextDueDate en formato DD/MM/YYYY`). Document the mapping in `specs/002-fix-future-debt-period-key/implementation_report.md` under a new `### Rebound 3` section, recording the new test files, commit hash, and scenario coverage table.

Missing coverage is a verification failure even if every gate is green.

---

### Task R3-5: Tester handoff (run by the Tester, not the Developer)

The Developer lists the following gates in `## Test run evidence -> Deferred to the Tester` of `implementation_report.md` under the `### Rebound 3` section. The Tester runs them in `IADEV-validating-implementation` Pass 2.

| Gate | Configured? | Command the Tester should run |
|---|---|---|
| Integration tests | yes | `cd workspace/backend && npx vitest run --reporter=verbose tests/ai/ai-extraction.integration.test.ts` |
| E2E tests | no | — |
| Build / packaging | yes | `cd workspace/backend && npm run build` |
| Pre-commit / pre-push hooks | no | — |
| Other — manual smoke against a live backend | yes | Manual PDF import via `POST /api/card-statements/import` with AI extractor returning `"13-Jul-26"` dates — confirm HTTP 200 (not 422) and `CardStatement.currentDueDate = "2026-07-13"` in DB |

---

### Rebound 3 — Risks and rollback notes (for the Tester and the user)

1. **`pipe` utility.** If the codebase has a `pipe` utility, `pipe(asString, parseAnyDateToISO)(...)` is acceptable. If it does not, the direct nested form `parseAnyDateToISO(asString(...))` is correct and simpler. The Developer must verify whether `pipe` exists before choosing the form.

2. **Two independent call sites for `parseAnyDateToISO`.** Rebound 2 wired the normalizer into `cards.controller.ts`; Rebound 3 wires it into `ai-extraction.service.ts`. Both are independent. If either is removed, the other continues to work. Rollback for either is a one-line removal per site.

3. **Integration test mock complexity.** If the test setup for full `AiExtractionService.extractAndSave()` with a real PDF/document is too heavy (requires file storage, external AI service mock, etc.), a unit test of `normalizeModelResponse()` in isolation with a mock `raw` object is an acceptable lighter-weight alternative — the contract is the same: non-ISO dates in → ISO dates out, and no Zod validation error.

4. **`ValidationError.details` server-side only (carried from Rebound 2).** The HTTP response body contains `{ code, message }` only. Field name and original value are embedded in the message string. This applies to any 400 thrown from the AI extraction layer as well.

(End of file)
