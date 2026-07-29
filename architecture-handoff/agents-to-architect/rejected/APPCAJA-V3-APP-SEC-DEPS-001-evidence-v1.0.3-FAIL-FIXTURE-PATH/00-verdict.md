# APP-SEC-DEPS-001 v1.0.3 — VERDICT
## Timestamp: 2026-07-18T23:14:00Z

## FINAL VERDICT: **FAIL**

### Gate Results

| # | Gate | Status | Notes |
|---|------|--------|-------|
| 1 | Preflight Node v24.18.0 | ✓ PASS | Node v24.18.0, npm 11.16.0 |
| 2 | Baseline hashes correctos | ✓ PASS | Both MATCH expected |
| 3 | SQLite backup + SHA-256 inicial | ✓ PASS | E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C |
| 4 | STAGE script v1.0.3 (exit 0) | ✓ PASS | Baseline + candidate + fixtures created |
| 5 | Fixtures obligatorios | ✓ PASS | visa-galicia-julio2026.pdf (447562 bytes) + salary-receipt.sanitized.base.pdf (2990 bytes) |
| 6 | Baseline npm ci | ✓ PASS | |
| 7 | Baseline typecheck/lint/build | ✓ PASS | |
| 8 | Baseline frontend health | ✓ PASS | HTTP 200 |
| 9 | **Baseline Playwright** | ✗ **FAIL** | 37/42 passed |
| 10 | Candidate npm ci | ✓ PASS | |
| 11 | Candidate npm audit total | ✓ PASS | **0 vulnerabilities** |
| 12 | Candidate npm ls versiones | ✓ PASS | next 16.2.10, postcss 8.5.16, js-yaml 4.2.0, uuid 11.1.1, prismjs 1.30.0 |
| 13 | Candidate typecheck/lint/build | ✓ PASS | |
| 14 | Candidate frontend health | ✓ PASS | HTTP 200 |
| 15 | **Candidate Playwright** | ✗ **FAIL** | 37/42 passed |
| 16 | candidateNewFailures | ✓ 0 | No NEW failures introduced |
| 17 | baselinePassedCandidateFailed | ✓ 0 | No baseline-passing test fails in candidate |
| 18 | **fixtureEnoentCount** | ✗ **3** | Fixtures not found at expected paths |
| 19 | **comparisonPass** | ✗ **FALSE** | Common failures + ENOENT prevent PASS |
| 20 | Cleanup + SQLite hash | ✓ PASS | Hash matches initial |
| 21 | Canonical untouched | ✓ PASS | package.json/lock unchanged |
| 22 | Promoción | ✗ **NO EJECUTADA** | GATES-PASS.json not generated (FAIL policy) |

### Comparison Summary

```
baseline:    37 passed, 5 failed
candidate:   37 passed, 5 failed

candidateNewFailures = 0  (no regressions)
baselinePassedCandidateFailed = 0  (no new failures)

Common failures (5 identical):
1. tests/e2e/card-statement-import.spec.ts:121:7
2. tests/e2e/card-statement-import.spec.ts:309:7
3. tests/privacy-mode.spec.ts:55:5
4. tests/salary-receipts.real.spec.ts:22:5
5. tests/salary-receipts.spec.ts:62:5

fixtureEnoentCount = 3
  - C:\Users\javie\AppData\Local\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\docs\08-artifacts\visa-galicia-julio2026.pdf
  - C:\Users\javie\AppData\Local\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\docs\08-artifacts\visa-galicia-julio2026.pdf
  - C:\Users\javie\AppData\Local\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf
```

### Root Cause Analysis

**The dependency remediation works perfectly:**
- npm ci: PASS (no EBUSY in staging)
- npm audit: 0 vulnerabilities
- All versions correct (next 16.2.10, postcss 8.5.16, js-yaml 4.2.0, uuid 11.1.1, prismjs 1.30.0)
- No vulnerable nested copies

**FAIL is caused by:**

1. **fixtureEnoentCount = 3**: The STAGE script copied fixtures to `%LOCALAPPDATA%\CajaApp\validation\docs\` and `%LOCALAPPDATA%\CajaApp\validation\contracts\` (parent dir), but the tests are looking for them in the v1.0.3 subdirectory (`%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\docs\` and `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\contracts\`).

2. **5 pre-existing Playwright failures**: All 5 failed tests are identical in baseline and candidate. They are NOT regressions from the dependency remediation.

3. **No GATES-PASS.json**: Per the checklist requirement "fixtureEnoentCount = 0" and "all tests passed", the gate cannot be satisfied.

### Promotion: NOT DONE (FAIL Policy Applied)

Per the instruction's failure policy:
- ✓ No promotion to canonical (package.json/lock remain at baseline)
- ✓ Canonical workspace untouched (verified)
- ✓ SQLite restored to initial hash
- ✓ Ports and processes freed
- ✓ FAIL verdict emitted

### Evidence Files
- `00-preflight.txt` - Preflight checks
- `01-stage-output.txt` - STAGE script output
- `02-baseline-npm-ci.log` - Baseline npm ci
- `03-baseline-typecheck.log` - Baseline typecheck
- `04-baseline-lint.log` - Baseline lint
- `05-baseline-build.log` - Baseline build
- `06-baseline-playwright.log` - Baseline Playwright (37/42)
- `07-candidate-npm-ci.log` - Candidate npm ci
- `08-candidate-audit.json` - Candidate audit (0 vulnerabilities)
- `09-candidate-npm-ls.txt` - Candidate npm ls (correct versions)
- `10-candidate-typecheck.log` - Candidate typecheck
- `11-candidate-lint.log` - Candidate lint
- `12-candidate-build.log` - Candidate build
- `13-candidate-playwright.log` - Candidate Playwright (37/42)
- `BASELINE-RESULT.json` - Baseline test results
- `CANDIDATE-RESULT.json` - Candidate test results
- `COMPARISON.json` - Comparison with 3 ENOENT
- `00-verdict.md` - This file
- `PRE-v1.0.3-dev.db` - Initial SQLite backup

### Environment Summary
- Node: v24.18.0 (I:\Tools\node-v24.18.0-win-x64\node.exe)
- NPM: 11.16.0
- Backend port 11436: FREE at end
- Frontend port 11437: FREE at end
- SQLite hash: E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C (restored)
- package.json hash: 7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B (baseline)
- package-lock.json hash: DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED (baseline)

### Conclusion

The dependency remediation (audit 0, correct versions, no vulnerable copies) works perfectly. The FAIL is due to:
1. **fixtureEnoentCount = 3**: Fixture path mismatch between STAGE script and test expectations
2. **5 pre-existing Playwright failures**: Identical in baseline and candidate (not regressions)

To proceed with PASS:
- STAGE script needs to copy fixtures to the v1.0.3 subdirectory path
- Pre-existing Playwright test issues need to be resolved (independent of dependency remediation)