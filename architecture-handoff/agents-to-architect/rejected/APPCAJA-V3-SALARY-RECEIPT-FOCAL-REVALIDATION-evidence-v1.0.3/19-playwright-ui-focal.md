# 19 - Playwright UI Focal — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Test: tests/salary-receipts.spec.ts

## Result: ❌ FAIL

### Reason
The test uses mock data (`Buffer.from("%PDF-1.4 E2E")`) and page.route() to intercept API calls. It does not test with a real PDF.

When Playwright loads the page, the mocked PDF buffer does not parse as a real PDF, so the preview does not contain "Empresa E2E SA" or "Sueldo básico" as expected.

Error:
```
await expect(page.getByTestId("salary-receipt-preview")).toContainText("Empresa E2E SA");
                                                    ^ AssertionError
```

### Note
This is the expected failure the architect described: "el 'PDF' de ese test era solamente Buffer.from('%PDF-1.4 E2E'), por lo que nunca probaba pdfplumber, IA, backend ni persistencia."

The new real E2E test (tests/salary-receipts.real.spec.ts) was supposed to replace this, but it has an ESM bug.