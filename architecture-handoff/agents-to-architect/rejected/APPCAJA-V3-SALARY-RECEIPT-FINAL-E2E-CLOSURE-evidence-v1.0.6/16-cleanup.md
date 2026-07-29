# 16 - Cleanup — v1.0.6

## Date: 2026-07-16

## Services Stopped
Script: cajaapp-headless-up.ps1 -Stop
Result: ok=true, stopped=[59612, 53664]

## Ports Verified Free
11436: (no listener)
11437: (no listener)

## SQLite Restored
From: C:\Users\javie\AppData\Local\Temp\cajaapp-salary-receipt-final-e2e-closure-v1.0.6\dev.db.backup
To: I:\cajaApp-V3\workspace\backend\prisma\dev.db
SHA-256: E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208 ✅

## Artifacts Cleaned
- backend/node_modules ✅
- backend/dist ✅
- frontend/node_modules ✅
- frontend/.next ✅
- frontend/test-results ✅
- frontend/playwright-report ✅

## Runtime Python Preserved
C:\Users\javie\AppData\Local\CajaAppV3\runtime\python\.venv NOT deleted ✅