# 19 - Known Issues — v1.0.6

## Issue: TypeError: page.getByDisplayValue is not a function

**File:** workspace/frontend/tests/salary-receipts.real.spec.ts:86

**Root Cause:** The architect's second fix uses `page.getByDisplayValue()`. In Playwright 1.61.1, `getByDisplayValue()` is a **Locator** method (to filter a locator by display value), NOT a Page method. `page.getByDisplayValue()` does not exist and throws TypeError.

**Playwright Version:** 1.61.1

**Impact:** E2E test cannot run to completion.

**Fix Needed:** Use a valid Locator-based method:
```ts
// Option 1: Locator.filter with hasText
preview.locator('input').filter({ hasText: /Sueldo b[aá]sico/i }).isVisible()

// Option 2: Locator.getByRole
preview.getByRole('textbox', { name: /Sueldo b[aá]sico/i }).isVisible()

// Option 3: page.locator with value selector
page.locator('input[value*="Sueldo"]').isVisible()
```