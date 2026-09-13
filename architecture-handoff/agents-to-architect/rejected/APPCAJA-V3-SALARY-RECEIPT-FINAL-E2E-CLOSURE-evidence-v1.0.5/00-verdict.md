# VAL-2026-07-16-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.5 — FINAL VERDICT

## Validation Campaign: APP-SALARY-RECEIPT-FINAL-E2E-CLOSURE v1.0.5
## Date: 2026-07-16

---

## OVERALL RESULT: ❌ FAIL

---

## Summary

The startup script runs successfully with exit 0 (venv Python, pdfplumber 0.11.10, no WindowsApps). The Playwright E2E test loads without ESM/require errors and the spec lint passes. However, the test fails at runtime with `TypeError: preview.getByDisplayValue is not a function` at line 86.

The architect's published fix for the test assertion is incorrect: `getByDisplayValue()` is a Page/Frame method in Playwright, not a Locator method. The test uses `preview.getByDisplayValue(...)` where `preview` is a `Locator`, which is invalid API usage.

This is a test code defect published by the architect, not a vertical code defect.

---

## Gate Results

### ✅ PASS
| Gate | Result |
|------|--------|
| Node.js v24.18.0 exact | ✅ |
| Spec lint (0 errors, 0 warnings) | ✅ |
| Playwright --list (1 test discovered) | ✅ |
| No ESM/require load error | ✅ |
| **Startup script (authoritative)** | ✅ **exit 0, JSON valid** |
| Backend HTTP 200 on 11436 | ✅ |
| Frontend HTTP 200 on 11437 | ✅ |
| Node v24.18.0 in state | ✅ |
| pythonExecutable = venv (not WindowsApps) | ✅ |
| pdfplumberVersion = 0.11.10 | ✅ |
| SQLite backup/restore | ✅ (E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208) |
| Lockfiles unchanged | ✅ |
| Script unchanged | ✅ |
| Spec (architect's fix) unchanged | ✅ |
| Artifacts cleaned | ✅ |

### ❌ FAIL
| Gate | Result | Reason |
|------|--------|--------|
| Playwright E2E real | ❌ | `TypeError: preview.getByDisplayValue is not a function` at line 86 — architect's published fix is incorrect API usage |

---

## Root Cause

The architect's fix at `tests/salary-receipts.real.spec.ts:86`:
```ts
await expect(preview.getByDisplayValue(/Sueldo b[aá]sico/i)).toBeVisible();
```

`getByDisplayValue()` is a method on `Page` and `Frame` objects, NOT on `Locator` objects. The variable `preview` is a `Locator`:
```ts
const preview = page.getByTestId("salary-receipt-preview");
```

Therefore `preview.getByDisplayValue(...)` throws `TypeError: preview.getByDisplayValue is not a function`.

**Correct alternatives** would be:
- `preview.locator('input').filter({ hasText: /Sueldo b[aá]sico/i }).isVisible()`
- `preview.getByRole('textbox', { name: /Sueldo b[aá]sico/i }).isVisible()`
- `page.getByDisplayValue(/Sueldo b[aá]sico/i).isVisible()`

---

## Evidence Location
```
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-evidence-v1.0.5\
```
20 evidence files. ZIP: playwright-salary-receipt-final-v1.0.5.zip (3,432,986 bytes, SHA-256 BE67535406B1CDEE587E91A32D87947C61782DD16215E13381969C9DD7685FF1).

---

*Validation performed by IADEV-delivery-tester agent*
*Campaign: APP-SALARY-RECEIPT-FINAL-E2E-CLOSURE v1.0.5*