# APP-AI-UX-STABILITY-001 v1.0.1 — VERDICT
## Timestamp: 2026-07-19T02:50:00Z

## FINAL VERDICT: **FAIL**

### Reason
ORDER-CONTAMINATION test failed. The UI test (`ai-advisor.spec.ts:60:5`) timed out at 193 seconds when run after `month-close.spec.ts`. The contamination requirement ("el focal debe volver a PASS" after running another backend/SQLite spec) is not satisfied.

### Gate Results

| # | Gate | Status | Notes |
|---|------|--------|-------|
| 1 | Preflight + baseline APP-SEC-DEPS-001 v1.0.3-R1 | ✓ PASS | Verified hashes |
| 2 | SQLite backup + SHA-256 inicial | ✓ PASS | E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C |
| 3 | Hashes de archivos autorizados (9 files) | ✓ PASS | All recorded |
| 4 | PROVIDER-IDENTITY.json | ✓ PASS | Local Ollama relays to Ollama Cloud via `claude` integration |
| 5 | Backend + frontend runtime logs | ✓ PASS | backend-runtime.log + frontend-runtime.log captured |
| 6 | API real 5/5 | ✓ PASS | 5/5 HTTP 201, max 21.6s, all have fingerprint + providerRequestId |
| 7 | FOCAL-RUN-1 | ✓ PASS | 2/2 passed in 1.1m |
| 8 | FOCAL-RUN-2 (consecutivo, sin reiniciar) | ✓ PASS | 2/2 passed in 1.0m |
| 9 | ORDER-CONTAMINATION (month-close + ai-advisor) | ✗ **FAIL** | 3/4 — UI test timeout after 193s |
| 10 | Diagnostic run | △ PARTIAL | Confirmed flaky UI timing |
| 11 | Backend gates (npm ci, Prisma, build, suite) | ✗ SKIPPED | No backend code modified |
| 12 | Frontend gates (npm ci, typecheck, lint, build) | ✗ SKIPPED | No frontend code modified |
| 13 | Full suite regression | ✗ SKIPPED | ORDER-CONTAMINATION failed |
| 14 | Cleanup + ports libres + SQLite restoration | ✓ PASS | All verified |

### Provider Identity Evidence

Local Ollama config at `%LOCALAPPDATA%\Ollama\config.json` contains:
```json
{
  "integrations": {
    "claude": {
      "models": ["kimi-k2.7-code:cloud"]
    }
  }
}
```

This confirms that `kimi-k2.7-code:cloud` is relayed to Ollama Cloud via the `claude` integration. The local Ollama server acts as a proxy.

### API 5/5 Results
| # | Query | HTTP | Duration | Claims | Citations |
|---|-------|------|----------|--------|------------|
| 1 | ¿Cómo evolucionaron los gastos... | 201 | 11289ms | 4 | ✓ |
| 2 | ¿Qué riesgos conviene revisar...? | 201 | 21636ms | 8 | ✓ |
| 3 | ¿Qué compromisos futuros...? | 201 | 6898ms | 3 | ✓ |
| 4 | ¿Qué datos faltantes...? | 201 | 18971ms | 10 | ✓ |
| 5 | ¿Cuál es el puntaje de salud...? | 201 | 9959ms | 8 | ✓ |

All 5 passed. All below 180s. All have provider requestId and fingerprint.

### Playwright Results

**FOCAL-RUN-1** (consecutive ai-advisor only):
- API test: ✓ PASS (23.6s)
- UI test: ✓ PASS (42.3s)

**FOCAL-RUN-2** (consecutive, no restart):
- API test: ✓ PASS (22.6s)
- UI test: ✓ PASS (37.8s)

**ORDER-CONTAMINATION** (month-close.spec.ts + ai-advisor.spec.ts):
- AI API test: ✓ PASS (21.3s)
- AI UI test: ✗ **FAIL** (193.5s timeout)
- Cierres desktop: ✓ PASS (1.1s)
- Cierres mobile: ✓ PASS (2.4s)

**DIAGNOSTIC** (ai-advisor.spec.ts only, fresh run):
- API test: ✓ PASS
- UI test: ✗ FAIL

The UI test passes in consecutive runs but fails when preceded by other backend-touching specs or in fresh diagnostic runs. The 193s timeout matches the 180s test timeout, indicating the AI response element never appears in the UI.

### Root Cause Analysis

The failure occurs because:
1. The `month-close.spec.ts` tests create movements and cierres in the database
2. When the AI test runs next, it also creates movements and queries the AI
3. SQLite database contention or the frontend UI fails to render the response within 180 seconds
4. The diagnostic run shows the failure occurs even without month-close prior, suggesting intermittent flakiness

### Why FAIL (per instruction criteria)

The instruction requires:
> "Ejecutar antes un spec que escriba en backend/SQLite y luego el focal; el focal debe volver a PASS."

This is NOT achieved. The contamination test failed.

### FAIL Policy Applied
- ✓ No code modifications made
- ✓ All authorized files unchanged (verified by SHA-256)
- ✓ SQLite restored to initial hash
- ✓ Ports 11436, 11437 free
- ✓ Canonical package.json/lock hashes unchanged
- ✓ No data UAT retained

### Evidence Files
- `00-preflight.txt` - Preflight checks
- `PROVIDER-IDENTITY.json` - Provider identification (Ollama Cloud via local proxy)
- `AI-TIMING-SUMMARY.json` - 5/5 API queries results
- `FOCAL-RUN-1.json` - First focal run (2/2 passed)
- `FOCAL-RUN-2.json` - Second focal run (2/2 passed)
- `ORDER-CONTAMINATION-RUN.json` - Contamination test (3/4 failed)
- `DIAGNOSTIC-RUN.json` - Diagnostic run
- `AI-STABILITY-GATES.json` - Gates summary
- `backend-runtime.log` - Backend stdout/stderr
- `frontend-runtime.log` - Frontend stdout/stderr
- `00-verdict.md` - This file
- `PRE-v1.0.1-dev.db` - Initial SQLite backup

### Environment Summary
- Node: v24.18.0 (I:\Tools\node-v24.18.0-win-x64\node.exe)
- NPM: 11.16.0
- Backend port 11436: FREE at end
- Frontend port 11437: FREE at end
- SQLite hash: E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C (restored)
- package.json hash: 5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61 (UNCHANGED)
- package-lock.json hash: 5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B (UNCHANGED)

### Checklist Final

```
TOTAL_TASKS=20
DONE=12
PENDING=0
BLOCKED=8
```

**DONE (12)**:
1. Preflight + baseline verified
2. SQLite backup + SHA-256
3. Hashes archivos autorizados (9 files)
4. PROVIDER-IDENTITY.json (Ollama Cloud via local proxy)
5. Backend + frontend runtime logs
6. API real 5/5 (AI-TIMING-SUMMARY.json)
7. FOCAL-RUN-1 (2/2 passed)
8. FOCAL-RUN-2 (2/2 passed)
9. Diagnóstico correlacionado (DIAGNOSTIC-RUN.json)
10. AI-STABILITY-GATES.json
11. Cleanup procesos y puertos libres
12. Restauración SQLite y package hashes intactos

**BLOCKED (8)**:
1. Corrección mínima (no defects reproducible that can be fixed without code modification)
2. ORDER-CONTAMINATION test (failed)
3. Backend gates npm ci/build/suite (skipped - no code modified)
4. Frontend gates npm ci/typecheck/lint/build (skipped - no code modified)
5. Suite completa Playwright (skipped - contamination test failed)
6. FULL-SUITE-RESULT.json (skipped - suite not run)
7. Evidencia completa con 4 tests consecutivos (skipped - contamination test failed)
8. Diagrama de correlación request/response exacto (logged but not diagnostically proven)

### Conclusion

The validation successfully demonstrates:
- ✓ Provider is Ollama Cloud (relayed via local Ollama proxy)
- ✓ API works correctly with 5/5 queries returning valid responses
- ✓ Consecutive focal runs (without other tests) pass
- ✓ Backend and frontend runtime captured

However, the contamination test fails, indicating the UI test is fragile when run after other backend-touching specs. This is a pre-existing defect documented in the instruction ("el defecto era específico del flujo UI, timing o contaminación").

No code was modified per the FAIL policy. Files are restored. The verdict is FAIL.