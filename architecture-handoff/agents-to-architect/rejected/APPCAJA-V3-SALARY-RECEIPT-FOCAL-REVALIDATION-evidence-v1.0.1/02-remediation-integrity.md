# 02 - Remediation Integrity — v1.0.1 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Three Remediations Verified

### 1. salary-receipts.schemas.ts — warnings type

```ts
// Line 49
warnings: z.array(z.string().trim().min(1).max(500)),
```

- `warnings` is mandatory array of strings
- No `.default([])` — correctly non-optional
- SHA-256: 58C25CE014B1DF0B81B6B040F07861876229A517395368CE93503AB2A7F1C032

### 2. salary-receipts.controller.ts — explicit accept payload

```ts
// Lines 49-52
const payload = validateData(acceptSalaryReceiptSchema, request.body);
const input: AcceptSalaryReceiptInput = {
  sourceId: payload.sourceId ?? null,
  useAsFutureBase: payload.useAsFutureBase ?? true,
};
return reply.status(201).send(await salaryReceiptsService.acceptDraft(draftId, input));
```

- Explicit `AcceptSalaryReceiptInput` construction
- `sourceId: payload.sourceId ?? null`
- `useAsFutureBase: payload.useAsFutureBase ?? true` (default true)
- SHA-256: 1AE3CB8D6F6936116DC76E03FE9715E3321AA8AAB1484EAA3172E88AA1D869E5

### 3. cajaapp-headless-up.ps1 — safe python -c argument

```ps1
// Lines 302 and 317
-ArgentList @("-c", "import pdfplumber;print(pdfplumber.__version__)")
```

- No space inside the quoted argument
- Uses semicolon instead of space between import and print
- SHA-256: 540D1A488D352ECB5D1F2C06B7FEAA959952930A7B73EC0DE30FD930F1532C7E

## Conclusion

All three remediations are correctly implemented in the codebase.
