# 03 - Remediation Integrity — v1.0.7

## Date: 2026-07-16

## Spec Fix (Architect Published — DEFINITIVE)

File: workspace/frontend/tests/salary-receipts.real.spec.ts

### v1.0.6 (incorrect):
```ts
await expect(page.getByDisplayValue(/Sueldo b[aá]sico/i)).toBeVisible();
```

### v1.0.7 (published by architect — CORRECT):
```ts
await expect.poll(
  async () =>
    preview.locator("input").evaluateAll((inputs) =>
      inputs.some((input) =>
        /Sueldo b[aá]sico/i.test((input as HTMLInputElement).value),
      ),
    ),
  {
    message: "El preview debe renderizar el concepto Sueldo básico en un campo editable",
    timeout: 15_000,
  },
).toBe(true);
```

This uses `Locator.evaluateAll()` to read the actual `value` property of all input elements inside the preview, which is a valid Playwright API.

## Integrity Check

- Initial SHA-256 of spec: 41DF2B7D34843B0F07E07B5975CB493B83B3FED7614BF5BCD0277BE4ADC80085
- Final SHA-256 of spec: 41DF2B7D34843B0F07E07B5975CB493B83B3FED7614BF5BCD0277BE4ADC80085
- Result: UNCHANGED ✅

## Script (No Changes in v1.0.7)
- Initial SHA-256: D4160DB0AEF793188F134D2D50A20BFDCBCC679D38E1F90EF6D951CA2CC58B1C
- Final SHA-256: D4160DB0AEF793188F134D2D50A20BFDCBCC679D38E1F90EF6D951CA2CC58B1C
- Result: UNCHANGED ✅
