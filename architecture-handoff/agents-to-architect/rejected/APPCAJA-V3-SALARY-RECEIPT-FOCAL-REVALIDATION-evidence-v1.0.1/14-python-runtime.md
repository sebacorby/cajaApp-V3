# 14 - Python Runtime — v1.0.1 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Status: NOT TESTED (blocked by build failure)

## Direct Verification (prior to revalidation)

```
& "C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe" -c "import pdfplumber; print(pdfplumber.__version__)"
```
Result: pdfplumber 0.11.10 ✅

## Script Check

The remediations in cajaapp-headless-up.ps1 (lines 302, 317) use:
```
"import pdfplumber;print(pdfplumber.__version__)"
```
No space inside argument ✅

However, startup was not attempted due to backend build failure.
