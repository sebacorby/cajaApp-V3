# Tasks: Fix Future Debt Period Key Bug

## 1. Write failing tests first

- [ ] 1.1 Add unit test: `currentPeriodKey` returns null when no active statement exists
  - Arrange: empty database (no `CardStatement` with `isActiveForPeriod=true`)
  - Act: call `getFutureDebt({ from: '2026-07', months: 6 })`
  - Assert: `range.currentPeriodKey === null`
- [ ] 1.2 Add unit test: `currentPeriodKey` is valid YYYY-MM when active statement exists
  - Arrange: `CardStatement` with `periodKey = "2026-07"` and `isActiveForPeriod = true`
  - Act: call `getFutureDebt({ from: '2026-07', months: 6 })`
  - Assert: `range.currentPeriodKey === "2026-07"` and passes `futureMonthKeySchema`
- [ ] 1.3 Add unit test: `statementPeriodKey` in each occurrence is valid YYYY-MM
  - Arrange: `CardStatement` with `periodKey = "2026-07"` and installment rows
  - Act: call `getFutureDebt({ from: '2026-07', months: 6 })`
  - Assert: every `occurrence.statementPeriodKey` passes `futureMonthKeySchema`; none contain `/` or stray letters

## 2. Fix the bug

- [ ] 2.1 Line 271: `activeStatement?.periodLabel?.slice(0, 7)` → `activeStatement?.periodKey`
- [ ] 2.2 Line 221: `select: { periodLabel: true }` → `select: { periodKey: true }`
- [ ] 2.3 Line 142: `statement?.periodLabel?.slice(0, 7)` → `statement?.periodKey`

## 3. Verification

- [ ] 3.1 Run FEAT-024 scenario tests
  - Scenario: `currentPeriodKey` is valid YYYY-MM when active statement exists
  - Scenario: `currentPeriodKey` is null when no active statement
  - Scenario: `statementPeriodKey` in each occurrence is valid YYYY-MM
- [ ] 3.2 Run full test suite (`npm test`)
  - All existing tests must still pass (no regression in FEAT-016 through FEAT-023)

---

## Rebound 2 — 2026-07-24 — Backend date normalizer for non-ISO summary fields

TDD-ordered tasks. Strict red-green-refactor discipline: every test is observed failing before the implementation that makes it pass.

### 1. RED — failing unit tests for `parseAnyDateToISO`

- [ ] 1.1 Create `workspace/backend/test/cards/date-normalizer.spec.ts` with one `it()` per accepted format, all asserted **failing** (the module does not exist yet).
  - ISO passthrough: `parseAnyDateToISO("2026-07-15")` → `"2026-07-15"`.
  - ISO single-digit month zero-pad: `parseAnyDateToISO("2026-7-15")` → `"2026-07-15"`.
  - `DD/MM/YYYY`: `parseAnyDateToISO("15/07/2026")` → `"2026-07-15"`.
  - `DD-MM-YYYY`: `parseAnyDateToISO("15-07-2026")` → `"2026-07-15"`.
  - `DD.MM.YYYY`: `parseAnyDateToISO("15.07.2026")` → `"2026-07-15"`.
  - `DD-Mon-YY`: `parseAnyDateToISO("13-Jul-26")` → `"2026-07-13"`.
  - `DD-Mon-YYYY`: `parseAnyDateToISO("13-Jul-2026")` → `"2026-07-13"`.
  - `DD-Mon` (no year): `parseAnyDateToISO("15-Jul")` → `"<currentYear>-07-15"`.
  - `"Month DD, YYYY"`: `parseAnyDateToISO("July 15, 2026")` → `"2026-07-15"`.
  - `"Mon DD, YYYY"`: `parseAnyDateToISO("Jul 15, 2026")` → `"2026-07-15"`.
  - `"DD Month YYYY"`: `parseAnyDateToISO("15 July 2026")` → `"2026-07-15"`.
  - `"DD Mon YYYY"`: `parseAnyDateToISO("15 Jul 2026")` → `"2026-07-15"`.
  - Nullish / empty: `parseAnyDateToISO(null)`, `undefined`, `""`, `"   "` → all `null`.
  - Unrecognized format: `parseAnyDateToISO("not a date")`, `parseAnyDateToISO("2026-13-40")` → both `null` (no throw).
- [ ] 1.2 Run `vitest test/cards/date-normalizer.spec.ts` and confirm **every** assertion fails (module not found / function undefined / wrong return values).

### 2. GREEN — implement `parseAnyDateToISO`

- [ ] 2.1 Create `workspace/backend/src/modules/cards/date-normalizer.ts`.
  - Export `parseAnyDateToISO(input: string | null | undefined): string | null`.
  - Export `toIsoYmd(date: Date): string` helper.
  - Export `monthNameToIndex(name: string): number | null` helper (static map `Jan..Dec` → `0..11`).
  - Implement in the order documented in `design.md` Rebound 2 → "Function-level pseudocode": null guard → ISO regex → numeric `DD<sep>MM<sep>YY(YY)` regex (slash/dot/dash) → `DD-Mon(-YY(YY))?` regex → `Date.parse` fallback for `"Month DD, YYYY"`-style strings.
- [ ] 2.2 Run `vitest test/cards/date-normalizer.spec.ts` and confirm **all** assertions pass.

### 3. RED — failing integration test for the accept endpoint

- [ ] 3.1 In `workspace/backend/test/cards/cards.controller.accept.spec.ts`, add a test that:
  - Seeds a `cardStatementDraft` with `previewJson` containing `summary.currentDueDate = "13-Jul-26"` (non-ISO).
  - Calls `POST /api/cards/draft/:id/accept`.
  - Asserts HTTP 200 and that the resulting `CardStatement.currentDueDate` in the DB equals `"2026-07-13"`.
- [ ] 3.2 Add a mixed-format test: `currentDueDate = "2026-07-13"`, `nextClosingDate = "28-Jul-26"`, `nextDueDate = "15/08/2026"` → HTTP 200, all three fields persisted as ISO.
- [ ] 3.3 Add a failure test: `currentDueDate = "not a date"` (non-null, unrecognizable) → HTTP 400 with response body containing `field: "currentDueDate"` and `value: "not a date"`.
- [ ] 3.4 Run `vitest test/cards/cards.controller.accept.spec.ts` and confirm all three new tests **fail** (no wire-up yet → 400 on the non-ISO input).

### 4. GREEN — wire up the normalizer in the controller

- [ ] 4.1 In `workspace/backend/src/modules/cards/cards.controller.ts`, locate the accept-draft handler (currently calls `validateData(cardStatementPreviewSchema, preview)`).
- [ ] 4.2 Import `parseAnyDateToISO` from `./date-normalizer` and `ValidationError` from the project's error utility.
- [ ] 4.3 Before `validateData`, build a shallow-cloned `preview = { ...preview, summary: { ...preview.summary } }`.
- [ ] 4.4 For each of `["currentDueDate", "nextClosingDate", "nextDueDate"]`:
  - If `preview.summary[field]` is non-null, call `parseAnyDateToISO(preview.summary[field])`.
  - If the result is `null` AND the original was non-null, throw `new ValidationError({ field, value: preview.summary[field], message: "<field> must be a recognized date format or ISO YYYY-MM-DD" })`.
  - Otherwise assign the (possibly null) result back onto `preview.summary[field]`.
- [ ] 4.5 Leave `validateData(cardStatementPreviewSchema, preview)` exactly as-is. The strict regex now acts as defense in depth.
- [ ] 4.6 Run `vitest test/cards/cards.controller.accept.spec.ts` and confirm all three new tests now pass.

### 5. Verification — full regression + new scenarios

- [ ] 5.1 Run `vitest test/cards/date-normalizer.spec.ts` — all pass.
- [ ] 5.2 Run `vitest test/cards/cards.controller.accept.spec.ts` — all pass (new + pre-existing).
- [ ] 5.3 Run the full test suite (`npm test` in `workspace/backend`). All prior tests (FEAT-016 through FEAT-023, FEAT-024, the rest) must still pass.
- [ ] 5.4 Run the Gherkin scenarios for FEAT-024 (the three original Rebound-0/1 scenarios plus the six Rebound-2 scenarios). All nine must pass.
  - Original: `currentPeriodKey` válido cuando hay resumen activo.
  - Original: `currentPeriodKey` null cuando no hay resumen activo.
  - Original: `statementPeriodKey` en cada ocurrencia válido.
  - Rebound 2: `Aceptar resumen con currentDueDate en formato DD-Mon-YY`.
  - Rebound 2: `Aceptar resumen con currentDueDate en formato DD/MM/YYYY`.
  - Rebound 2: `Aceptar resumen con currentDueDate en formato Month DD, YYYY`.
  - Rebound 2: `Aceptar resumen con nextDueDate en formato DD/MM/YYYY`.
  - Rebound 2: `Aceptar currentDueDate sin año asumiendo año actual`.
  - Rebound 2: `Normalizar cada campo de fecha de forma independiente`.
- [ ] 5.5 Manual smoke: hit `POST /api/cards/draft/:id/accept` with each of the 6 Gherkin inputs and confirm HTTP 200 + persisted ISO value.

---

## Rebound 3 — 2026-07-25 — Wire date normalizer into AI extraction pipeline

TDD-ordered tasks. The `parseAnyDateToISO` function already exists and is tested from Rebound 2; this rebound adds a second call site.

### 1. RED — failing unit test for `parseAnyDateToISO` at the extraction layer

- [ ] 1.1 Create `workspace/backend/test/ai/date-normalization.test.ts`.
  - Test: `parseAnyDateToISO("13-Jul-26")` → `"2026-07-13"` (verifies DD-Mon-YY → ISO, the format that was causing HTTP 422).
  - Test: `parseAnyDateToISO("15/07/2026")` → `"2026-07-15"` (verifies DD/MM/YYYY → ISO).
  - Test: `parseAnyDateToISO("July 15, 2026")` → `"2026-07-15"` (verifies Month D, YYYY → ISO).
  - Test: `parseAnyDateToISO("2026-07-15")` → `"2026-07-15"` (passthrough, unchanged).
  - Test: `parseAnyDateToISO(null)` → `null` (nullish passthrough).
- [ ] 1.2 Run `vitest test/ai/date-normalization.test.ts` and confirm all assertions **fail** (the extraction service does not yet call `parseAnyDateToISO`).

### 2. GREEN — apply fix in `ai-extraction.service.ts`

- [ ] 2.1 In `workspace/backend/src/modules/ai/ai-extraction.service.ts`, add import:
  ```typescript
  import { parseAnyDateToISO } from '../cards/date-normalizer';
  ```
- [ ] 2.2 In `normalizeModelResponse()` (around lines 535–541), replace the three `asString()` calls:
  - `currentDueDate: asString(raw.summary?.currentDueDate)` → `currentDueDate: pipe(asString, parseAnyDateToISO)(raw.summary?.currentDueDate)`
  - `nextClosingDate: asString(raw.summary?.nextClosingDate)` → `nextClosingDate: pipe(asString, parseAnyDateToISO)(raw.summary?.nextClosingDate)`
  - `nextDueDate: asString(raw.summary?.nextDueDate)` → `nextDueDate: pipe(asString, parseAnyDateToISO)(raw.summary?.nextDueDate)`
- [ ] 2.3 Run `vitest test/ai/date-normalization.test.ts` and confirm all assertions now **pass**.

### 3. Integration test — full PDF import flow with non-ISO dates (E2E level)

- [ ] 3.1 In `workspace/backend/test/ai/ai-extraction.integration.spec.ts` (or a new file), add a test that:
  - Mocks the AI model to return a `summary` with `currentDueDate: "13-Jul-26"`, `nextClosingDate: "28-Jul-26"`, `nextDueDate: "15/08/2026"`.
  - Calls `AiExtractionService.extractAndSave()` (or the full `CardsController.importPdf()` if a test helper exists).
  - Asserts HTTP 200/201 (not 422) and that the persisted `CardStatement` has `currentDueDate: "2026-07-13"`, `nextClosingDate: "2026-07-28"`, `nextDueDate: "2026-08-15"`.
- [ ] 3.2 Run `vitest test/ai/ai-extraction.integration.spec.ts` and confirm the test **fails** before the fix (HTTP 422) and **passes** after.

### 4. Verification — full regression

- [ ] 4.1 Run `vitest test/ai/date-normalization.test.ts` — all pass.
- [ ] 4.2 Run `vitest test/ai/ai-extraction.integration.spec.ts` — all pass.
- [ ] 4.3 Run the full test suite (`npm test` in `workspace/backend`). All prior tests (FEAT-016 through FEAT-024, Rebound 1, Rebound 2 scenarios) must still pass.
- [ ] 4.4 Run the Gherkin scenarios for FEAT-024. All scenarios including the two Rebound-3 additions must pass:
  - Original (Rebound 0): `currentPeriodKey` válido cuando hay resumen activo.
  - Original (Rebound 0): `currentPeriodKey` null cuando no hay resumen activo.
  - Original (Rebound 0): `statementPeriodKey` en cada ocurrencia válido.
  - Rebound 2: `Aceptar resumen con currentDueDate en formato DD-Mon-YY`.
  - Rebound 2: `Aceptar resumen con currentDueDate en formato DD/MM/YYYY`.
  - Rebound 2: `Aceptar resumen con currentDueDate en formato Month DD, YYYY`.
  - Rebound 2: `Aceptar nextDueDate en formato DD/MM/YYYY`.
  - Rebound 2: `Aceptar currentDueDate sin año asumiendo año actual`.
  - Rebound 2: `Normalizar cada campo de fecha de forma independiente`.
  - Rebound 3: `Importar PDF con currentDueDate en formato DD-Mon-YY`.
  - Rebound 3: `Importar PDF con nextDueDate en formato DD/MM/YYYY`.
