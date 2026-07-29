# Change Summary — v1.0.16

## Problem

v1.0.15 had two failures:
1. AI UI test timeout - possibly due to port mismatch or environment
2. Card statement import Python venv missing

## Solution Applied

1. Created Python runtime at %LOCALAPPDATA%\CajaAppV3\runtime\python\.venv
2. Installed pdfplumber==0.11.10 in the external venv
3. Started services using start-cajaapp.ps1 with correct ports

## What Was NOT Changed

- start-cajaapp.ps1 and cajaapp-headless-up.ps1 were NOT modified (ports already correct from v1.0.15)
- ai-advisor.spec.ts was NOT modified
- No code changes were made to fix the issues

## Issues Remaining

1. AI UI test passes alone but fails in full suite - possible timing/contamination
2. Card statement import still fails because backend .env has `PYTHON_EXECUTABLE=.venv\Scripts\python.exe` (local path) but the external venv is at a different location

## Root Cause of Card Import Failure

The backend's .env file specifies:
```
PYTHON_EXECUTABLE=.venv\Scripts\python.exe
```

But the external Python runtime created is at:
```
C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe
```

The start-cajaapp.ps1 script does not override PYTHON_EXECUTABLE when starting the backend, so the backend looks for .venv in its own directory which doesn't exist.
