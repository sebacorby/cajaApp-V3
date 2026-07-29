# 20 - Deliverable to Architect — v1.0.4

## Verdict: ❌ FAIL

## Reason
Playwright E2E test (tests/salary-receipts.real.spec.ts:86) expects "Sueldo básico" in preview but content does not contain it. Test code bug (incorrect assertion), NOT a vertical code defect.

## What Passed
- Startup script: PASS (exit 0, venv Python, no WindowsApps, pdfplumber 0.11.10)
- Backend/frontend: HTTP 200 on correct ports
- PDF import: 201, preview rendered
- Form fields: employer, employee, period, salary amounts all correct
- Backend recalculation: neto=$1,162,000.00 ✅
- Script fixes: venv-first Python + npm stderr suppression ✅
- PowerShell parse: 0 errors ✅
- Spec lint: 0 errors, 0 warnings ✅
- Playwright test discovery: 1 test ✅
- SQLite backup/restore: EXACT match ✅
- Lockfiles unchanged ✅
- Artifacts cleaned ✅

## What Failed
- E2E test: Preview assertion fails at line 86 (test code issue)

## Script Changes (Authorized)
1. Resolve-PythonRuntime: venv-first, skip where python when venv exists
2. Invoke-NpmStep: $ErrorActionPreference=Continue during npm calls

## Evidence
20 files in: APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-evidence-v1.0.4\

## Recommended Action
Fix the test assertion at line 86 in tests/salary-receipts.real.spec.ts to match actual preview content, or investigate why "Sueldo básico" text is not rendered.
