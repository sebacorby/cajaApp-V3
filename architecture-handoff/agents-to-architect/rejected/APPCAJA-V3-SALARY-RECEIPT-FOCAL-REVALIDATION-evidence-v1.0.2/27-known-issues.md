# 27 - Known Issues — v1.0.2 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Pre-existing Issues

### 1. Startup Script Python Invocation Bug

**File:** `cajaapp-headless-up.ps1` — `Invoke-CapturedProcess` function

**Issue:** `Invoke-CapturedProcess` uses `Start-Process` with `-WindowStyle Hidden` and output redirects. When invoking Python with `-ArgumentList @("-c", "import pdfplumber;print(...)")`, the command is corrupted and Python receives `import\r\n` instead of the full one-liner.

**Impact:** Startup script fails at Python verification step, preventing automated startup of CajaApp services.

**Status:** Pre-existing since v1.0.0, documented in v1.0.0, v1.0.1, and v1.0.2.

**Note:** The Python runtime itself works correctly (verified directly). The remediation (safe `-c` argument format) is correctly implemented. The bug is in `Start-Process` + Python interaction, not in the script's remediation.

### 2. Missing Salary Receipt Test PDF

**Issue:** No sanitized salary receipt PDF exists in the codebase for testing the import flow.

**Impact:** Full end-to-end API smoke test, future base tests, and replacement tests cannot be executed.

**Workaround:** Backend started manually for partial API verification.

## Fixed Issues

### 3. listSalaryReceiptsQuerySchema Type Mismatch (FIXED in v1.0.2)

**File:** `salary-receipts.schemas.ts`, `salary-receipts.controller.ts`

**Previous Issue:** Schema used `.default()` making input ≠ output type, causing TS2345 at controller line 57.

**Fix Applied:** Schema now uses pure input contract (optional fields, no defaults/transforms), defaults applied in controller after validation.

**Verification:** Backend build PASS ✅, 5/5 tests PASS ✅, query validation HTTP tests PASS ✅.
