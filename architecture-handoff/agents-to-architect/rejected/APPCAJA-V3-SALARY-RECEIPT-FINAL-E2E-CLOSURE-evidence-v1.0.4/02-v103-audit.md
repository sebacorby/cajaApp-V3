# 02 - v1.0.3 Audit

## Validation Campaign: APP-SALARY-RECEIPT-FINAL-E2E-CLOSURE v1.0.3

---

## Gates that PASSED

| Gate | Result |
|------|--------|
| Backend build (npm run build) | ✅ |
| 5/5 focal tests pass | ✅ |
| API smoke with real PDFs | ✅ |
| Future base tests | ✅ |
| Replacement tests | ✅ |

## Gates that FAILED

| Gate | Result | Reason |
|------|--------|--------|
| Playwright E2E | ❌ | ESM/CommonJS load error — required module failed to load |
| Startup script | ❌ | Windows Store Python path in pythonExecutable (Microsoft\WindowsApps) |

## Architect's Closure Directive (v1.0.3)

The architect issued a closure directive requiring two specific script fixes before re-validation:

### Fix 1: Resolve-PythonRuntime
- If venv Python exists, validate and use it directly WITHOUT probing `where python` or `where py`
- Skip any paths containing `Microsoft\WindowsApps`

### Fix 2: Invoke-NpmStep
- Wrap `Invoke-CapturedProcess` call with `$ErrorActionPreference=Continue`
- Prevent Prisma stderr output from becoming a terminating exception under `$ErrorActionPreference=Stop`

---

*Refer to 04-script-change.md for the authorized fixes applied in v1.0.4*
