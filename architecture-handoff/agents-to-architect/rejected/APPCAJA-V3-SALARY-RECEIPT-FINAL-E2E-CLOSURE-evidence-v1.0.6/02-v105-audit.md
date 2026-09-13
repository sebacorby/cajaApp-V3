# 02 - v1.0.5 Audit — v1.0.6 Salary Receipt Final E2E Closure

## Date: 2026-07-16

## v1.0.5 Accepted as PASS (gates demonstrated)

The following were demonstrated in v1.0.5 (or earlier) and accepted as PASS without re-execution:

- Startup script: exit 0, venv Python, pdfplumber 0.11.10, no WindowsApps ✅
- Backend HTTP 200 on 11436 ✅
- Frontend HTTP 200 on 11437 ✅
- PDF import: HTTP 201, preview rendered ✅
- Form fields: employer, employee, period correct ✅
- Backend recalculation: neto=$1,162,000.00 ✅
- SQLite restored exactly ✅
- Lockfiles unchanged ✅
- Artifacts cleaned ✅

## v1.0.5 FAIL Reason

v1.0.5 failed with: `TypeError: preview.getByDisplayValue is not a function` — the fix used `preview.getByDisplayValue()` which doesn't exist (getByDisplayValue is not a Locator method).

## v1.0.6 Scope

This campaign validates ONLY:
1. That the second spec fix is correct
2. That the E2E test passes