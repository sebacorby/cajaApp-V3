# 04 - Authorized Script Changes

## Script: cajaapp-headless-up.ps1

### Fix 1: Resolve-PythonRuntime

**Problem**: When a venv exists at the expected path, the script was still probing `where python` or `where py`, which could return Windows Store Python paths (containing `Microsoft\WindowsApps`).

**Solution**: If venv Python exists at the expected path, validate and use it directly WITHOUT probing `where python` or `where py`. Skip any paths containing `Microsoft\WindowsApps`.

```powershell
# Before: probe where python/where py regardless of venv
# After:
if (Test-Path $venvPythonPath) {
    $pythonExe = $venvPythonPath
    # Validate and use directly - skip where python/where py
} else {
    # Only then probe system python
}
```

### Fix 2: Invoke-NpmStep

**Problem**: Under `$ErrorActionPreference=Stop`, Prisma generates stderr output during `npm install` which was being treated as a terminating exception, causing the script to fail.

**Solution**: Wrap the `Invoke-CapturedProcess` call with `$ErrorActionPreference=Continue` during npm invocations to prevent Prisma stderr from becoming a terminating exception.

```powershell
# Before: $ErrorActionPreference=Stop for all invocations
# After:
$ErrorActionPreference = 'Continue'
Invoke-CapturedProcess ... # npm calls
$ErrorActionPreference = 'Stop'
```

## Authorization
These fixes were authorized by the architect in the v1.0.3 closure directive.
