# VAL-2026-07-16-SALARY-RECEIPT-001-REVALIDATION-v1.0.2 — FINAL VERDICT

## Validation Campaign: APP-SALARY-RECEIPT-FOCAL-REVALIDATION v1.0.2
## Date: 2026-07-16

---

## OVERALL RESULT: ❌ FAIL

---

## Summary

### Fixed in v1.0.2

The fourth TypeScript defect (`listSalaryReceiptsQuerySchema` type mismatch causing TS2345 at controller line 57) was **successfully fixed**. Backend now builds cleanly and all salary-receipts unit tests pass (5/5).

### But Two Pre-existing Infrastructure Issues Block Further Validation

1. **Startup script `Invoke-CapturedProcess` bug** — Python invocation via `Start-Process` + redirects corrupts the `-c` argument, causing SyntaxError even though the Python runtime works correctly
2. **Missing salary receipt test PDF** — No sanitized PDF exists in codebase to perform end-to-end API smoke test

---

## Gate Results

### ✅ PASS

| Gate | Result |
|------|--------|
| Node.js v24.18.0 exact | ✅ |
| Fourth remediation integrity | ✅ (schemas.ts + controller.ts changed as expected) |
| Backend npm ci | ✅ (0 vulnerabilities) |
| Frontend npm ci | ✅ (10 moderate not fixed per rules) |
| Prisma generate | ✅ |
| Prisma migrate status | ✅ (15 migrations) |
| Prisma migrate deploy | ✅ |
| Backend build | ✅ **PASS** |
| Backend focal test | ✅ **5/5 PASS** |
| Query defaults (no params) | ✅ (200, {value:[], count:0}) |
| Query explicit (limit=1&includeReversed=true) | ✅ (200) |
| Query negatives | ✅ (all return 400) |
| Frontend focal lint | ✅ (0 errors, 0 warnings) |
| SQLite backup/restore | ✅ (E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208) |
| Integrity final | ✅ (all files unchanged except 2 fixed files) |

### ❌ FAIL / BLOCKED

| Gate | Result | Reason |
|------|--------|--------|
| Startup script | ❌ FAIL | `Invoke-CapturedProcess` bug corrupts Python `-c` argument |
| API smoke (import flow) | BLOCKED | Missing salary receipt PDF |
| Default future base | BLOCKED | Missing salary receipt PDF |
| Explicit false future base | BLOCKED | Missing salary receipt PDF |
| Replacement scenario | BLOCKED | Missing salary receipt PDF |
| Playwright focal | BLOCKED | Frontend not started (startup script failure) |

---

## Fourth Remediation Verification

### Changed Files (v1.0.2)

| File | SHA-256 (v1.0.1) | SHA-256 (v1.0.2) | Status |
|------|------------------|------------------|--------|
| salary-receipts.schemas.ts | 58C25CE0... | 777D1A09... | CHANGED ✅ |
| salary-receipts.controller.ts | 1AE3CB8D... | 167FFF5B... | CHANGED ✅ |

### Code Changes

**schemas.ts** — Pure input contract:
```ts
const listSalaryReceiptsLimitSchema = z.string().regex(/^(?:[1-9]|[1-9]\d|100)$/, ...);
export const listSalaryReceiptsQuerySchema = z.object({
  limit: listSalaryReceiptsLimitSchema.optional(),
  includeReversed: z.enum(["true", "false"]).optional(),
});
```

**controller.ts** — Normalizes after validation:
```ts
const queryInput = validateData(listSalaryReceiptsQuerySchema, request.query);
const query = {
  limit: queryInput.limit === undefined ? 20 : Number(queryInput.limit),
  includeReversed: queryInput.includeReversed === "true",
};
```

---

## Blocking Issues Detail

### 1. Startup Script Python Bug (Pre-existing)

The `Invoke-CapturedProcess` function uses `Start-Process` with `-WindowStyle Hidden` and output redirects. When Python is invoked with `-ArgumentList @("-c", "import pdfplumber;print(...)")`, Python receives only `import\r\n` instead of the full one-liner.

**Root cause:** `Start-Process` + Python + `-WindowStyle Hidden` + redirects = command corruption on Windows.

**Impact:** `cajaapp-headless-up.ps1 -Restart -Rebuild -JsonOnly` fails before services start.

**Workaround:** Backend started manually with correct Node v24.18.0 and PYTHON_EXECUTABLE. Backend runs correctly on port 11436.

### 2. Missing Test PDF (Pre-existing)

No sanitized salary receipt PDF exists in `contracts/examples/salary-receipts/` or elsewhere in the codebase. The only file there is `salary-receipt.sanitized.preview.json` (example data, not a PDF).

**Impact:** Cannot perform end-to-end import → preview → edit → accept → reverse scenario.

---

## Recommendation

The salary-receipts vertical code is now **build-clean and test-passing** after the v1.0.2 fix. However, two pre-existing infrastructure issues block full validation:

1. Fix `Invoke-CapturedProcess` to use cmd.exe for Python commands (not `Start-Process` directly), OR provide a different mechanism for Python verification
2. Add a sanitized salary receipt PDF to the test fixtures

**Verdict: FAIL** — Not because the vertical code is broken, but because pre-existing infrastructure issues prevent full runtime validation.

---

*Validation performed by IADEV-delivery-tester agent*
*Campaign: APP-SALARY-RECEIPT-FOCAL-REVALIDATION v1.0.2*
