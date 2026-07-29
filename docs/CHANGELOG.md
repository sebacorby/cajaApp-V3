## Jul 25 2026 — Bulk Delete Future Debt Rows (spec 006)

- Verdict: PASS, Rebound 1 (Round 1 FAIL → Rebound 1 PASS)
- Features added (features/): FEAT-029-future-debt-row-deletion
- Docs updated: technical.md (Future Debt module — DELETE /api/future-debt/rows/:id added, read-only description updated)
- Commits: none recorded
- Deprecated: none
- What: Per-row checkbox selection + select-all in Future Debt view; "Eliminar N filas" button with inline confirmation (Confirmar/Cancelar); `DELETE /api/future-debt/rows/:id` endpoint with cascade delete for `isManual = true` rows (deletes both `CardInstallmentProjection` and `ManualCardPurchase`); TanStack Query invalidation on success
- Round 1 blocking: missing E2E spec (F-001) + debug console.error artifact (F-003); resolved in Rebound 1
- Verification: 316 backend tests pass, backend typecheck 0 errors, frontend typecheck 0 errors, Playwright E2E spec with 6 scenarios

## Jul 25 2026 — Fix Future Debt Missing Card Reference + Delete Statement (spec 005)

- Verdict: PASS, 1 round
- Features added (features/): FEAT-027-fix-projection-row-reference, FEAT-028-delete-accepted-card-statement
- Docs updated: domain.md (Flow 1 — rowId correction step added), technical.md (cards/ module — new endpoint + script noted)
- Commits: none recorded
- Deprecated: none
- Bug 1: `CardInstallmentProjection.rowId` stored preview row IDs (from AI extraction) instead of database-generated UUIDs, causing `missing_card_reference` diagnostics on all accepted statement installments. Fix: after inserting `CardStatementRow` records, query them back ordered by `displayOrder`, build a composite-key map `(displayOrder:sectionKey:groupKey) → row UUID`, and update each projection's `rowId` to the actual persisted UUID — all inside the same `acceptDraft()` transaction.
- Bug 2: No `DELETE /statements/:statementId` endpoint; accepted statements with bad data could not be removed. Fix: added endpoint + `cardsService.deleteStatement()` (hard-delete, cascade to children); frontend `tarjetas-section.tsx` gained AlertDialog delete button for accepted statements only.
- Verification: 312 tests pass, backend typecheck 0 errors, frontend typecheck 0 errors, frontend build clean.

## Jul 25 2026 — Fix Future Debt Missing Card Reference (spec 004)

- Verdict: PASS, 1 round
- Features added (features/): FEAT-026-fix-card-reference
- Docs updated: none (bug fix — no module/schema/interface changes)
- Commits: none recorded
- Deprecated: none
- Bug: `cards.service.ts acceptDraft()` stored `groupKey: r.groupId` (section ID) as `CardStatementRow.groupKey`, breaking the `normalizeProjection()` row→group join and causing all future installments to show `missing_card_reference` / "sin tarjeta".
- Fix: `groupKey: r.id` (1 line in `cards.service.ts` line ~830) — stores actual group ID, restoring the correct `cardLast4` derivation.
- Verification: 306 tests pass, typecheck clean, build clean, smoke tests 3/3.

## Jul 25 2026 — Rebound 3 on spec 002 (code)

- Requested: "AI output validation failed: summary.currentDueDate must be ISO YYYY-MM-DD" — Rebound 2 wired `parseAnyDateToISO()` into `cards.controller.ts` accept-draft boundary, but the AI extraction pipeline (`ai-extraction.service.ts normalizeModelResponse()`) still passed raw `asString()` dates to the strict Zod schema, causing HTTP 422 on PDF imports.
- Changed: `workspace/backend/src/modules/ai/ai-extraction.service.ts` (lines 540–542 — `parseAnyDateToISO` wrapping all three date fields in `normalizeModelResponse()`); `workspace/backend/tests/ai/date-normalization.test.ts` (NEW, 6 unit cases); `workspace/backend/tests/ai/ai-extraction.test.ts` (NEW, 5 integration cases via `any`-cast on `normalizeModelResponse`); `features/FEAT-024-fix-period-key.feature` (2 new scenarios added by planner, lines 73–74)
- Verdict: PASS (1 rebound round) — 305/305 backend tests green (+24 vs. Rebound 2), 11/11 rebound tests green, typecheck/build/prettier clean
- Behavior change (intended): `ai-extraction.service.ts normalizeModelResponse()` now normalizes non-ISO date strings to ISO before Zod validation — PDF imports with `currentDueDate: "13-Jul-26"` or `nextDueDate: "15/07/2026"` succeed instead of returning HTTP 422. Second independent call site for `parseAnyDateToISO` alongside the Rebound 2 `cards.controller.ts` accept-draft boundary. Zod schema unchanged.

## Jul 24 2026 — Revisar drafts pendientes (spec 003)

- Verdict: PASS, 2 rounds (Round 1 + Round 2 re-validation)
- Features added (features/): FEAT-025-revisar-drafts-pendientes
- Docs updated: none (new UI feature extending existing functionality — no module/schema/interface changes)
- Commits: none recorded
- Deprecated: none
- What: Pending drafts panel in Import Center listing `preview_ready` and `failed` CardStatementDraft records; actions: Accept (existing endpoint), View (Zustand handoff → TarjetasSection editable preview), Discard (AlertDialog confirmation → DELETE cascade)
- Backend: `GET /api/card-statements/drafts` (list with status filter + pagination), `DELETE /api/card-statements/drafts/:draftId` (cascade delete draft + document)
- Frontend: `PendingDraftsPanel` in `importaciones-section.legacy.tsx`, `FinanceUIState` extended with `pendingCardStatementDraftId` handoff, `TarjetasSection` boot effect consumes pending draft
- Tests: 294/294 backend tests pass, 7 Playwright E2E tests written (require live server); all 6 FEAT-025 scenarios covered
- Round 2 reversed Round 1 blocking findings (test file missing, no coverage) — transient glob issue

## Jul 24 2026 — Rebound 2 on spec 002 (gherkin)

- Requested: Accept and normalize common non-ISO summary date formats (`"13-Jul-26"`, `"15/07/2026"`, `"July 15, 2026"`, etc.) emitted by the AI extractor, instead of strict 400. Strict Zod regex preserved as defense-in-depth on normalizer output.
- Changed: `workspace/backend/src/modules/cards/date-normalizer.ts` (NEW — `parseAnyDateToISO` + `toIsoYmd` + `monthNameToIndex`); `workspace/backend/src/modules/cards/cards.controller.ts` (normalization block in `accept` handler before `validateData`); `workspace/backend/tests/cards/date-normalizer.test.ts` (NEW, 20 unit tests); `workspace/backend/tests/cards/cards.controller.accept.test.ts` (NEW, 3 HTTP integration tests via `app.inject()`); `features/FEAT-024-fix-period-key.feature` (6 new scenarios added upstream by planner, lines 34–73)
- Verdict: PASS (round 1) — 281/281 backend tests green (+23 vs. Rebound 1), 23/23 rebound tests green, typecheck/build/prettier clean
- Behavior change (intended): `POST /api/card-statements/drafts/:draftId/accept` now accepts DD-Mon-YY, DD-Mon-YYYY, DD-Mon (current year), DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, "Month DD, YYYY", "DD Month YYYY", and "DD Mon YYYY" summary date formats and persists them as ISO. Unparseable non-empty input returns HTTP 400 with the field name and original value encoded in the message body. Numeric slash/dot/dash forms are parsed deterministically as DD/MM/YYYY (Latin American locale).
- Scope kept tight: only the `accept` handler; `PUT /drafts/:draftId` still rejects non-ISO dates with 400 (out of scope per the rebound brief).

## Jul 24 2026 — Rebound 1 on spec 002 (code)

- Requested: Fix "statementPeriodKey must use YYYY-MM format" crash on draft accept (same root cause as Round 1 survived inside `acceptDraft()`)
- Changed: `workspace/backend/src/modules/cards/cards.service.ts` (acceptDraft periodKey resolution, lines 738–740, 757–760); `workspace/backend/src/modules/cards/cards.schemas.ts` (summary dates now require `^\d{4}-\d{2}-\d{2}$`, lines 77–86); `workspace/backend/tests/cards/period-key-format.test.ts` (new, 7 tests)
- Verdict: PASS (round 1) — 258/258 backend tests green, 7/7 rebound tests green, typecheck/build/prettier clean
- Behavior change: non-ISO `summary` dates now return HTTP 400 at the controller where they previously crashed mid-transaction with HTTP 500 (user-requested defensive tightening)

## Jul 24 2026 — Fix Future Debt Period Key Bug (spec 002)

- Verdict: PASS, 1 round
- Features added (features/): FEAT-024-fix-period-key
- Docs updated: none (data-field usage bug — no module/schema/interface changes)
- Commits: none recorded
- Deprecated: none
- Bug: `future.service.ts` sliced `periodLabel` (free-text `"15/07/2026"`) to build `currentPeriodKey`/`statementPeriodKey`, producing `"15/07/"` or `"13-Jul-"` — failed `futureMonthKeySchema` regex, caused HTTP 500
- Fix: replaced `periodLabel?.slice(0, 7)` with `periodKey` at 3 sites (lines 142, 221, 271 in `future.service.ts`); added `periodKey` to `RawCardStatement` type and 4 test fixtures
- Verification: typecheck clean, `npm run build` exit 0, 21 tests pass (6 service + 15 API), `currentPeriodKey` returns `"2026-07"` in all outputs

## Jul 24 2026 — Bugfix rebound 1 (spec 001)

- Fix: Replaced `deuda-futura-section.tsx` with thin re-export to `FutureDebtView.tsx`. Deleted orphaned `future-api.ts`.
- Root cause: `deuda-futura-section.tsx` imported from `future-api.ts` which called the old `/api/future-commitments` endpoint (404).
- Verdict: PASS
- Note: 409 on `/api/card-statements/import` not investigated — separate issue.

## Jul 24 2026 — Grounding created

- source-commit: no-git
- Documents seeded into docs/: technical.md, domain.md
- Features seeded into features/: FEAT-001 … FEAT-015 (15 features)
- Preserved deprecations: none

## Jul 24 2026 — Deuda futura de tarjetas (spec 001)

- Source commit: no-git
- Status: PASS (backend + frontend validation)
- New endpoint: GET /api/future-debt?from=YYYY-MM&months=6&includeCurrentPeriod=false
- 16 business rules (RN-001 … RN-016) implemented and tested
- 7 product decisions (Q1–Q7) resolved and encoded
- 49 backend test files / 251 tests passing
- 5 frontend Playwright tests passing (minimal-viable; full FEAT coverage deferred)
- FEAT-015 deprecated (renamed to .feature.old)
- No new npm packages, no Prisma migration
- See: specs/001-deuda-futura-de-tarjetas/

## Jul 24 2026 — Bugfix rebound 1 (continued) (spec 001)

- Fix: `deuda-futura-section.tsx` now wraps `FutureDebtView` in `QueryClientProvider` with a local `QueryClient`. Prevents "No QueryClient set" runtime error.
- Verdict: PASS (typecheck 0, 5/5 Playwright tests, navigation regression 2/2)

## Jul 24 2026 — Bugfix rebound 1 (continued) (spec 001)

- Fix: `future.service.ts` — replaced non-null assertion `!` on `cardId`/`cardLast4` with null coalescing + early `continue` guard. Root cause: `cardLast4` was null at runtime causing `TypeError: Cannot read property 'trim' of null`.
- Verdict: PASS (251 backend tests, 5 frontend Playwright tests)
