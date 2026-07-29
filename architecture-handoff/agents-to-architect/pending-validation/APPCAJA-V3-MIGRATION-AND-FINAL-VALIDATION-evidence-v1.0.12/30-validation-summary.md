# APPCAJA-V3-MIGRATION-AND-FINAL-VALIDATION v1.0.12

## Verdict: FAIL

## Summary

Migrations applied successfully. Infrastructure operational (backend 11436, frontend 11437, Ollama 11434). AI Advisor queries work correctly. However, Playwright focal test fails due to fingerprint mismatch bug in frozen code.

## Component Results

| Component | Status | Notes |
|-----------|--------|-------|
| Prisma Migrations | PASS | 3 migrations applied |
| Backend build | PASS | |
| Backend tests | PASS | 148/148 |
| Frontend build | PASS | |
| Frontend typecheck | PASS | |
| Frontend lint | PASS | 0 errors, 3 warnings |
| Backend startup | PASS | PID 38676, Node v24.18.0 |
| Frontend startup | PASS | PID 38228, port 11437 |
| Health check | PASS | HTTP 200 |
| AI context smoke | PASS | sourceCount=28 |
| AI Advisor queries | PASS | 5/5 queries succeed |
| Playwright focal | FAIL | fingerprint mismatch |

## Failure Details

**Test:** `ai-advisor.spec.ts:19:5` - "Asesor IA usa contexto estructurado, cita fuentes y limpia su historial"

**Error:**
```
Expected: "f234b9654222621170a65dce0dd09b8b0edd1ec5ceee0265f1010a4b1fe8ef2c"
Received: "a728d2f5c8f1a6f79b05dbf929f245f56c15efd91267e4bec08e16f9cb1ece75"
```

**Root cause (probable):** In `ai-advisor.service.ts`:
- Context endpoint (line 698-702) computes `sourceFingerprint` using `health.formula.version`
- Ask endpoint (line 1118-1123) computes `sourceFingerprint` using `context.financialHealthFormulaVersion`
- When `addSimulationSource()` is called (line 1230), it recomputes fingerprint with potentially mismatched schemaVersion

**Code is frozen - requires architect fix.**

## SQLite State

- Pre-migration baseline: `BF0C3528D1426691FD275E17CB6DC4A9170C769DE540C166F1B1B832EF4B1552`
- Post-migration baseline: `E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208`
- Current: Modified by test data

## Ports Used

- Backend: 11436
- Frontend: 11437
- Ollama: 11434

## Evidence Files

- `21-ai-real-query-01.json` through `25-ai-real-query-05.json`: AI query responses
- `27-ai-playwright-run-01.log`: First Playwright focal execution (FAIL)
- `28-ai-playwright-run-02.log`: Second Playwright focal execution (FAIL)
- `29-playwright-full.log`: Full Playwright execution output (FAIL)
