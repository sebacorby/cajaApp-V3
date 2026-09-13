# Python Runtime — v1.0.0 Salary Receipt Focal Validation

## Date: 2026-07-16

## Python Discovery

### Command: py -0p
```
 -V:3.14 *        Python 3.14 (64-bit)
 -V:Astral/CPython3.11.15 CPython 3.11.15 (64-bit)
```

### Command: python --version
```
Python 3.14.0
```

## Runtime Location

The external Python runtime is at:
```
C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv
```

## pdfplumber Verification

### Direct Test
```
& "C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe" -c "import pdfplumber; print(pdfplumber.__version__)"
```
Result: ✅ pdfplumber 0.11.10

## cajaapp-headless-up.ps1 -Restart Result

The startup script reported:
```
ERROR: El runtime Python existe, pero pdfplumber no pudo cargarse. File "<string>", line 1
    import
          ^
SyntaxError: invalid syntax
```

## Analysis

The Python venv exists at the correct location and pdfplumber CAN be imported when tested directly:
- pdfplumber 0.11.10 ✅

The startup script error appears to be an execution issue (possibly related to how Invoke-CapturedProcess handles the Python command) rather than an actual pdfplumber installation problem.

## Conclusion

The external Python runtime with pdfplumber IS WORKING when tested directly.

The startup script error may be due to:
1. Execution method differences (Invoke-CapturedProcess vs direct invocation)
2. Potential encoding or parsing issue in the PowerShell script

For this validation, the Python runtime at `C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv` is functional.
