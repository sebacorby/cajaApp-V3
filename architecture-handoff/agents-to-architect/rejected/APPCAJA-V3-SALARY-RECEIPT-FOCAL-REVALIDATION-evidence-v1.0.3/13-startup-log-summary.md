# 13 - Startup — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Status: PARTIAL

Backend and frontend started manually (not via startup script) due to Windows Store Python redirector issue on this system.

### Manual Start Results
- Backend on port 11436: HTTP 200 ✅
- Frontend on port 11437: HTTP 200 ✅
- Prisma migrations: applied ✅

### Startup Script Issue
`Invoke-CapturedProcess` encounters Windows Store Python redirector (py.exe resolves to Microsoft Store shortcut) during Python discovery.

### Workaround
Services started directly:
- Backend: `node dist/main.js` with PYTHON_EXECUTABLE env var
- Frontend: `node .next/standalone/server.js` with env vars

Both services work correctly with real PDFs.