# 02 - v1.0.4 Audit — v1.0.5 Salary Receipt Final E2E Closure

## Date: 2026-07-16

## v1.0.4 Accepted as PASS

The following were demonstrated in v1.0.4 and accepted as PASS without re-execution:

- Startup script: exit 0, venv Python, pdfplumber 0.11.10, no WindowsApps ✅
- Backend HTTP 200 on 11436 ✅
- Frontend HTTP 200 on 11437 ✅
- PDF import: HTTP 201, preview rendered ✅
- Form fields: employer, employee, period correct ✅
- Backend recalculation: neto=$1,162,000.00 ✅
- SQLite restored exactly ✅
- Lockfiles unchanged ✅
- Artifacts cleaned ✅

## v1.0.4 FAIL Reason (not re-tested)

v1.0.4 failed at Playwright E2E test assertion at line 86: preview assertion expected "Sueldo básico" but content did not contain it. The architect published a fix.

## v1.0.5 Scope

This campaign validates ONLY:
1. That the spec fix is correct
2. That the E2E test passes