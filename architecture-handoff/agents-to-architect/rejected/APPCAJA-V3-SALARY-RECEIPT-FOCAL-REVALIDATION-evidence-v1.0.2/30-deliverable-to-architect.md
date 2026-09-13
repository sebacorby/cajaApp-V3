# 30 - Deliverable to Architect — v1.0.2 Salary Receipt Focal Revalidation

## Date: 2026-07-16
## Campaign: APP-SALARY-RECEIPT-FOCAL-REVALIDATION v1.0.2

---

## Verdict: ❌ FAIL

**Reason:** The v1.0.2 fix (fourth remediation) successfully resolved the TypeScript build error. However, two pre-existing infrastructure issues block full runtime validation: (1) startup script `Invoke-CapturedProcess` bug corrupts Python `-c` argument, (2) missing salary receipt test PDF prevents end-to-end testing.

---

## What Was Tested — Results

### Gates PASS (17)

| Gate | Result |
|------|--------|
| Node.js v24.18.0 exact | ✅ |
| Fourth remediation correct | ✅ |
| Backend npm ci | ✅ (0 vulnerabilities) |
| Frontend npm ci | ✅ (10 moderate) |
| Prisma generate | ✅ |
| Prisma migrate status | ✅ (15 migrations) |
| Prisma migrate deploy | ✅ |
| **Backend build** | ✅ **PASS** |
| **Backend focal test** | ✅ **5/5 PASS** |
| Query defaults | ✅ |
| Query explicit values | ✅ |
| Query negative cases | ✅ (all 400) |
| Frontend focal lint | ✅ (0 errors, 0 warnings) |
| SQLite backup | ✅ |
| SQLite restore | ✅ (E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208) |
| Integrity final | ✅ |
| Cleanup | ✅ |

### Gates BLOCKED/FAIL (8)

| Gate | Result | Reason |
|------|--------|--------|
| Startup script | ❌ FAIL | `Invoke-CapturedProcess` bug |
| API smoke (full scenario) | BLOCKED | Missing PDF |
| Default future base | BLOCKED | Missing PDF |
| Explicit false future base | BLOCKED | Missing PDF |
| Replacement | BLOCKED | Missing PDF |
| Playwright focal | BLOCKED | Startup failure |
| Frontend build | NOT RUN | Startup failure |
| Python pdfplumber in script | ❌ FAIL | `Start-Process` corrupts `-c` |

---

## Fourth Remediation — STATUS: ✅ CORRECT

The fourth defect (`listSalaryReceiptsQuerySchema` type mismatch causing TS2345 at controller:57) was **successfully fixed and verified**.

### Changed Files

| File | Before (v1.0.1) | After (v1.0.2) |
|------|-----------------|----------------|
| salary-receipts.schemas.ts | Used `.default()` + `.transform()` + `.coerce.number()` | Pure input contract with `.optional()`, no defaults |
| salary-receipts.controller.ts | `validateData(listSalaryReceiptsQuerySchema, request.query)` (fails TS) | `validateData` then manual normalization with defaults |

### Verification

- Backend build: **PASS** ✅
- Backend focal test: **5/5 PASS** ✅
- Query HTTP tests: **ALL PASS** ✅

---

## Pre-existing Infrastructure Issues

### 1. `Invoke-CapturedProcess` Python Bug (CRITICAL)

**File:** `cajaapp-headless-up.ps1` — `Invoke-CapturedProcess` function

**Problem:** `Start-Process` + Python + `-WindowStyle Hidden` + redirects corrupts the `-c` argument.

**Evidence:**
```powershell
# Fails (via Start-Process):
Start-Process -FilePath python -ArgumentList @("-c", "import pdfplumber;print(__version__)")
# Error: SyntaxError on "import"

# Works (via cmd.exe):
cmd.exe /d /s /c "python.exe -c `"import pdfplumber;print(__version__)`""
# Result: 0.11.10
```

**Impact:** Startup script cannot verify Python, blocking startup gate.

**Workaround:** Backend started manually on port 11436 — runs correctly.

**Fix needed:** Use cmd.exe for Python invocations in `Invoke-CapturedProcess`, or special-case Python calls to use the cmd.exe pattern.

### 2. Missing Salary Receipt Test PDF

**Problem:** No `.pdf` file exists in `contracts/examples/salary-receipts/` or elsewhere for testing import flow.

**Only file present:** `salary-receipt.sanitized.preview.json` (example data, not a PDF)

**Impact:** Cannot test: import → draft → edit → accept → reverse → replacement flow.

**Playwright test note:** `tests/salary-receipts.spec.ts` uses mocks for all API endpoints, does not test with real PDF.

**Fix needed:** Add a sanitized salary receipt PDF to test fixtures.

---

## Evidence Location

```
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-evidence-v1.0.2\
```

30 files generated:
- 00-verdict.md
- 01-environment.md through 28-evidence-inventory.txt
- 30-deliverable-to-architect.md

---

## No Code Modified

All vertical files unchanged except the 2 files intentionally fixed in v1.0.2:
- `salary-receipts.schemas.ts` — remediated ✅
- `salary-receipts.controller.ts` — remediated ✅

Other files (service, extraction service, ps1 script) — unchanged since v1.0.1 ✅

SQLite: Restored to exact hash ✅

Lockfiles: Unchanged ✅

---

## Required Actions

1. **Fix `Invoke-CapturedProcess`** — Use cmd.exe pattern for Python invocations, or add Python-specific handling
2. **Add test PDF** — Create or add a sanitized salary receipt PDF to `contracts/examples/salary-receipts/` for smoke testing
3. **Re-run validation** — After fixes, re-run v1.0.3 to complete full API smoke, future base, replacement, and Playwright tests

---

## Verdict by Gate

```
✅ Node.js v24.18.0 exact
✅ Fourth remediation integrity
✅ Backend npm ci (0 vulns)
✅ Frontend npm ci
✅ Prisma generate
✅ Prisma migrate status
✅ Prisma migrate deploy
✅ Backend build PASS ← v1.0.2 fix success
✅ Backend focal test 5/5 PASS ← v1.0.2 fix success
✅ Query defaults HTTP PASS
✅ Query explicit HTTP PASS
✅ Query negatives HTTP PASS (all 400)
✅ Frontend focal lint 0/0 PASS
✅ SQLite backup/restore
✅ Integrity final
❌ Startup script FAIL (pre-existing Invoke-CapturedProcess bug)
BLOCKED: API smoke, future base, replacement, Playwright (missing PDF)

VERDICT: FAIL — Pre-existing infrastructure issues, NOT vertical code defect
```

---

*IADEV-delivery-tester agent — APP-SALARY-RECEIPT-FOCAL-REVALIDATION v1.0.2*
