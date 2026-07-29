# 01 - Environment — v1.0.5 Salary Receipt Final E2E Closure

## Date: 2026-07-16

## Node.js
node --version: v24.18.0 (exact required) ✅

## Initial File SHA-256

| File | SHA-256 |
|------|---------|
| cajaapp-headless-up.ps1 | D4160DB0AEF793188F134D2D50A20BFDCBCC679D38E1F90EF6D951CA2CC58B1C |
| workspace/frontend/tests/salary-receipts.real.spec.ts | DF922256C1A8C2FB956CC7B8CA34D83A9794A7DB20B57976EF5D1394224BE467 |
| workspace/backend/package-lock.json | 825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87 |
| workspace/frontend/package-lock.json | DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED |
| workspace/backend/prisma/dev.db | E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208 |

## SQLite Backup
Path: C:\Users\javie\AppData\Local\Temp\cajaapp-salary-receipt-final-e2e-closure-v1.0.5\dev.db.backup
Size: 5,402,624 bytes
SHA-256: E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208

## Spec Content Verification (Preflight)
1. getByDisplayValue(/Sueldo b[aǭ]sico/i) EXISTS in spec ✅
2. toContainText(/Sueldo b[aá]sico/i) NOT at line 86 ✅
3. No page.route ✅
4. No test.skip ✅
5. No test.fixme ✅
6. Uses salary-receipt.sanitized.base.pdf ✅
7. Creates byte-distinct copy per execution ✅
8. Cleanup via /reverse in finally ✅