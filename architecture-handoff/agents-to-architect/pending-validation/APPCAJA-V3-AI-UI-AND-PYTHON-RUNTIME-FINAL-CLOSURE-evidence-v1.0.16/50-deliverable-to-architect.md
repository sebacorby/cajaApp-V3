# Deliverable to Architect — v1.0.16

## Status

FAIL - 24/26 tests pass, 2 failures remain

## Results

| Gate | Result |
|------|--------|
| Backend npm ci | ✅ PASS |
| prisma generate | ✅ PASS |
| prisma migrate status | ✅ PASS (14 migrations, up to date) |
| backend build | ✅ PASS |
| backend unit tests (154) | ✅ PASS |
| frontend npm ci | ✅ PASS |
| frontend typecheck | ✅ PASS (0 errors) |
| frontend lint | ⚠️ 3 warnings (pre-existing) |
| frontend build | ✅ PASS |
| identity verification | ✅ PASS (ports 11436/11437) |
| AI Advisor API test (alone) | ✅ PASS |
| Playwright suite | ⚠️ 24/26 PASS |

## Python Runtime

- Created at: C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv
- Python version: 3.11.15
- pdfplumber: 0.11.10 installed

## Failures

### 1. AI Advisor UI Test (ai-advisor.spec.ts:60)
- **Symptom:** Timeout waiting for `ai-advisor-response` element (180s)
- **Note:** Passes when run alone, fails in full suite (timing/contamination issue)
- **Diagnosis needed:** Possible state contamination from previous tests in suite

### 2. Card Statement Import (e2e/card-statement-import.spec.ts:121)
- **Symptom:** `Failed to spawn Python: spawn .venv\Scripts\python.exe ENOENT`
- **Root cause:** Backend .env has `PYTHON_EXECUTABLE=.venv\Scripts\python.exe` but .venv doesn't exist in backend directory
- **Fix needed:** Either:
  - Create .venv in backend directory, OR
  - Set PYTHON_EXECUTABLE env var to external runtime path when starting backend

## What Was Done

1. Created Python external runtime at %LOCALAPPDATA%\CajaAppV3\runtime\python\.venv
2. Installed pdfplumber==0.11.10
3. Verified services on correct ports (11436/11437)
4. Captured all test artifacts (traces, videos, screenshots) in evidence folder
5. Cleanup completed (node_modules, .next deleted; SQLite restored)

## Evidence Folder

`APPCAJA-V3-AI-UI-AND-PYTHON-RUNTIME-FINAL-CLOSURE-evidence-v1.0.16`

Contains:
- Log files from all commands
- Playwright test results (playwright-results-v1.0.16.zip - 236MB)
- Test traces, videos, screenshots
- All gate results

## Instruction

According to v1.0.16 instruction: "No corresponde emitir una v1.0.16 hasta tener ese material"

The evidence is now complete and available for auditor's review.
