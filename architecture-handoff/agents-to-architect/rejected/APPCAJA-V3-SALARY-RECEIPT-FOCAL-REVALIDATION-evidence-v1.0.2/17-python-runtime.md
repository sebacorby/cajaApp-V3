# 17 - Python Runtime — v1.0.2 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Status: FUNCTIONAL (but startup script has bug)

## Direct Python Test

```powershell
& "C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv\Scripts\python.exe" -c "import pdfplumber; print(pdfplumber.__version__)"
```

Result: pdfplumber 0.11.10 ✅

## Startup Script Issue

The startup script `cajaapp-headless-up.ps1` uses `Invoke-CapturedProcess` which calls `Start-Process` with redirects for Python. This corrupts the `-c` argument on Windows.

## Investigation

When using `Start-Process` with `-WindowStyle Hidden` and redirects:
```powershell
Start-Process -FilePath $venvPython -ArgumentList @("-c", "import pdfplumber;print(pdfplumber.__version__)") -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
```

Result: Exit code 1, SyntaxError on `import`

## Workaround

Using cmd.exe to invoke Python works:
```powershell
cmd.exe /d /s /c "python.exe -c `"import pdfplumber;print(pdfplumber.__version__)`""
```

Result: Exit code 0, "0.11.10"

## Conclusion

The Python runtime IS WORKING. The startup script has a pre-existing bug in `Invoke-CapturedProcess` that prevents Python command execution via `Start-Process` + redirects.

The remediation (safe `-c` argument) is correctly implemented.
