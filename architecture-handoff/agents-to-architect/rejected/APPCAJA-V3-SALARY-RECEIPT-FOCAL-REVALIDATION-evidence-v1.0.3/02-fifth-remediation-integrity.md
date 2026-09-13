# 02 - Fifth Remediation (Startup Script) — v1.0.3

## Date: 2026-07-16

## Fix: Invoke-CapturedProcess Python Invocation

### Previous (v1.0.2)
Used Start-Process with redirects, which corrupted Python -c argument on Windows.

### Fixed (v1.0.3)
Uses PowerShell call operator `& $FilePath @ArgumentList` which preserves argument integrity.

```ps1
try {
    & $FilePath @ArgumentList 1> $stdoutPath 2> $stderrPath
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
}
```

### Verification
- SHA-256: 771CA3E92B5757AC9C29F8AA61E2BD2323C6D0D52F24B159B29B6DFFCA6BE445 (changed from v1.0.2)
- venv Python directly works: `& "C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe" -c "import pdfplumber; print(pdfplumber.__version__)"` → 0.11.10 ✅

### Note
On this system, the script encounters Windows Store Python redirector during Python discovery. Backend was started manually and works correctly.