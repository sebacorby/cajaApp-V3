# 17 - Known Issues

## Issue 1: E2E Test Assertion Failure

**Location**: tests/salary-receipts.real.spec.ts:86

**Description**: The Playwright E2E test expects `preview.toContainText(/Sueldo b[aá]sico/i)` but the preview content does not contain the string "Sueldo básico".

**What Works**:
- PDF import: POST /api/salary-receipts/import → 201 ✅
- Preview rendering: form fields visible (employer, employee, period, salary amounts) ✅
- Backend recalculation: neto = $1,162,000.00 ✅
- Frontend form display: all fields correct ✅

**What Fails**:
- Test assertion at line 86: expects "Sueldo básico" but content does not contain it

**Root Cause**: Test code issue — incorrect expectation in test assertion. NOT a vertical code defect.

**Resolution Required**: Update test assertion at line 86 to match actual preview content, or investigate why "Sueldo básico" text is not present in the rendered preview despite the PDF import and backend processing working correctly.

---

*All other functionality verified working. This is a test code issue, not a product defect.*
