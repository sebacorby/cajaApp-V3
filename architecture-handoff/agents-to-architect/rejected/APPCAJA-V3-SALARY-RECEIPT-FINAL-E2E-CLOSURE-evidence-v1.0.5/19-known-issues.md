# 19 - Known Issues — v1.0.5

## Issue: TypeError: preview.getByDisplayValue is not a function

**File:** workspace/frontend/tests/salary-receipts.real.spec.ts:86

**Root Cause:** The architect's published fix uses `getByDisplayValue()` as a Locator method. In Playwright, `getByDisplayValue()` is a method on `Page` and `Frame` objects, NOT on `Locator` objects. The variable `preview` is declared as:
```ts
const preview = page.getByTestId("salary-receipt-preview");
```
This returns a `Locator`, so `preview.getByDisplayValue(...)` throws `TypeError`.

**Impact:** E2E test cannot run to completion.

**Fix Needed:** Use a valid Locator method within `preview`:
- `preview.locator('input').filter({ hasText: /Sueldo b[aá]sico/i }).isVisible()`
- `preview.getByRole('textbox', { name: /Sueldo b[aá]sico/i }).isVisible()`
Or use Page method:
- `page.getByDisplayValue(/Sueldo b[aá]sico/i).isVisible()`