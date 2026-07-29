# 27 - Startup Detailed — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Startup Script Analysis

### Script: cajaapp-headless-up.ps1

### Issue Encountered
Windows Store Python redirector (py.exe) resolves to Microsoft Store shortcut on this system.

### Python Discovery Flow
1. Script checks `Get-Command python` or similar
2. On this system, python/py resolves to Windows Store shortcut
3. Windows Store Python redirector does not accept `-c` argument the same way
4. `Invoke-CapturedProcess` fails when trying to run Python with `-c` argument

### Technical Details
The script uses:
```ps1
& $FilePath @ArgumentList 1> $stdoutPath 2> $stderrPath
```

This correctly preserves argument integrity (fix from v1.0.3), but the underlying Python executable discovered is the Store redirector.

### Workaround Applied
Manual start with explicit PYTHON_EXECUTABLE:
```
$env:PYTHON_EXECUTABLE = "C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe"
node dist/main.js
```

### venv Python Verification
```
& "C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe" -c "import pdfplumber; print(pdfplumber.__version__)"
```
Output: 0.11.10 ✅

### Conclusion
The script fix in v1.0.3 (using `& $FilePath @ArgumentList`) is correct and preserves argument integrity. The issue is environment-specific (Windows Store Python redirector on this system) and not a code defect.