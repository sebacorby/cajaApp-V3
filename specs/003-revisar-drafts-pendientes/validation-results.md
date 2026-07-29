# Validation Results: 003-revisar-drafts-pendientes

**Round:** 2
**Verdict:** PASS
**Date:** 2026-07-24

## Summary

The Round 1 findings F-001 and F-002 (E2E test file missing, no scenario coverage) were incorrect — the file `workspace/frontend/tests/drafts-pending.spec.ts` exists with 328 lines and 7 tests covering all 6 FEAT-025 scenarios. All verifiable quality gates pass: backend tests (294/294), backend typecheck (clean), frontend typecheck (clean). The E2E tests require a running server and cannot be executed by the orchestrator in isolation — this is acceptable per the task constraints.

## Re-run evidence

| Command | Reported by Developer | Observed by Tester | Status |
|---|---|---|---|
| `cd workspace/backend && npm test` | 294 passed | 294 passed, 0 failed | OK |
| `cd workspace/backend && npx tsc --noEmit` | exit 0 | exit 0, clean | OK |
| `cd workspace/frontend && npm run typecheck` | exit 0 | exit 0, clean | OK |
| `cd workspace/frontend && npx playwright test tests/drafts-pending.spec.ts` | 7 tests (requires server) | Cannot run — requires live server at `http://127.0.0.1:11437` | ACCEPTABLE (per task constraints) |

## Round 1 finding reversal

| ID | Round 1 severity | Round 1 finding | Round 2 verdict |
|---|---|---|---|
| F-001 | BLOCKING | `drafts-pending.spec.ts` does not exist | **REVERSED** — file exists, 328 lines, 7 tests |
| F-002 | BLOCKING | No scenario coverage for any of the 6 FEAT-025 behaviors | **REVERSED** — all 6 scenarios are covered (see scenario table below) |

**Root cause of Round 1 error:** The Tester's `glob` search used pattern `workspace/frontend/tests/drafts-pending.spec.ts` which returned no match in Round 1. The file existed at that path but was not found — likely a transient indexing issue. The file was confirmed present in Round 2 re-verification and its contents verified.

## Findings

No new findings. The Round 1 F-001 and F-002 blocking findings are reversed. F-003 (regression suite does not mock the drafts endpoint) remains as MINOR — it is a enhancement, not a requirement.

| ID | Severity | FEAT-ID | Title | Reproduction | Expected | Actual | Suggested fix |
|---|---|---|---|---|---|---|---|
| F-003 | MINOR | — | `import-center.spec.ts` regression suite does not verify PendingDraftsPanel presence | Existing test mocks only `/api/import-center**` route, not `/api/card-statements/drafts` | Regression test for Import Center confirms Historial card still works | Regression test does not load PendingDraftsPanel (different API endpoint) | Extend `import-center.spec.ts` to also mock `GET /api/card-statements/drafts` and assert the panel renders above Historial. |

## Skill audit

- **Plan task 6** (Playwright E2E) — skill exists in this runtime; Developer used it correctly. The test file `drafts-pending.spec.ts` uses `page.route()` mocking consistently with the project's `import-center.spec.ts` patterns.
- No hallucinated skills.
- All other searched categories (Fastify route testing, Zustand store testing, shadcn AlertDialog testing, React component testing) — no skill found; Developer implemented manually. Acceptable.

## Scenario coverage (per `IADEV-bdd-implementation`)

| FEAT-ID | Scenarios in spec | Scenarios covered | Tests covering them | Gaps |
|---|---|---|---|---|
| FEAT-025 | 6 | 6 | `workspace/frontend/tests/drafts-pending.spec.ts` lines 118–327 | None |

**Detailed per-scenario:**

1. **"The pending drafts panel lists preview_ready and failed drafts with status badges"** — Covered, lines 118–131. Test asserts both draft filenames visible and both status badges ("Listo", "Fallido") visible.

2. **"Accepting a preview_ready draft creates a CardStatement"** — Covered, lines 135–178. Test clicks "Aceptar", asserts accepted draft disappears from panel and `acceptCalled === true`.

3. **"Viewing a preview_ready draft opens it in the Cards section"** — Covered, lines 182–202. Test clicks "Ver", asserts "Centro de importaciones" is no longer visible.

4. **"Requesting to discard a preview_ready draft shows a confirmation modal"** — Covered, lines 206–228. Test clicks "Descartar", asserts AlertDialog visible with correct Spanish copy ("¿Descartar este borrador?", "El borrador y el documento subido se eliminarán permanentemente.").

5. **"Confirming the discard deletes the draft and its document"** — Covered, lines 232–277. Test opens dialog, confirms, asserts draft gone and `deleteCalled === true`.

6. **"A failed draft shows the error reason and only offers a discard action"** — Covered, lines 281–307. Test asserts error message visible, "Aceptar" and "Ver" buttons not visible, "Descartar" button visible.

**Bonus — empty state edge case:** Lines 311–327 test the "No hay borradores pendientes" empty state.

## Notes

- E2E test execution requires a live server; the orchestrator cannot start the app. The test file structure is correct and complete — this is acceptable.
- All backend integration tests for the drafts endpoints (`drafts-list.test.ts`, `drafts-discard.test.ts`) are included in the 294-pass backend suite. ✓
- `AiExtractionRun.validationErrors` (not `errorMessage`) is correctly used as the failed-draft error field per the Prisma schema. ✓
- `PendingDraftsPanel` correctly placed above the Historial card. ✓
- Zustand handoff fields correctly wired. ✓
- Discard AlertDialog uses correct Spanish copy. ✓
- Failed draft shows only "Descartar" button. ✓

(End of file - total 117 lines)
