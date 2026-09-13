# 24 - Known Issues — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Issue 1: Playwright E2E ESM Bug (Critical)
File: tests/salary-receipts.real.spec.ts
Uses ES module imports in CommonJS project → ReferenceError: require is not defined
Fix needed: Add "type": "module" or convert to CommonJS

## Issue 2: Mocked Playwright Test (Expected Failure)
File: tests/salary-receipts.spec.ts
Uses fake PDF buffer (%PDF-1.4 E2E), not real PDF
Expected to fail — architect confirmed this is the old mock-based test

## Issue 3: Startup Script Windows Store Redirector (Environment)
On this system, Invoke-CapturedProcess encounters Windows Store Python shortcut
Workaround: Services started manually, both work correctly
Not a code defect in the vertical

## All Previous Issues Fixed
- Backend build: PASS ✅
- Backend tests: 5/5 PASS ✅
- Query validation: PASS ✅
- API smoke with real PDFs: PASS ✅
- Future base default: PASS ✅
- Future base explicit false: PASS ✅
- Replacement: PASS ✅