# APP-SEC-DEPS-001 v1.0.3-R1 — VERDICT
## Timestamp: 2026-07-19T01:05:00Z

## FINAL VERDICT: **PASS** ✓

### Gate Results

| # | Gate | Status | Notes |
|---|------|--------|-------|
| 1 | Preflight Node v24.18.0 | ✓ PASS | Node v24.18.0, npm 11.16.0 |
| 2 | Baseline hashes correctos | ✓ PASS | Both MATCH expected |
| 3 | SQLite backup + SHA-256 inicial | ✓ PASS | E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C |
| 4 | STAGE script v1.0.3-R1 (exit 0) | ✓ PASS | Baseline + candidate + fixtures at correct paths |
| 5 | Fixtures en paths correctos | ✓ PASS | visa-galicia + salary-receipt at APP-SEC-DEPS-001-v1.0.3/... |
| 6 | Baseline: npm ci | ✓ PASS | |
| 7 | Baseline: typecheck/lint/build | ✓ PASS | |
| 8 | Baseline: frontend health HTTP 200 | ✓ PASS | |
| 9 | Baseline: Playwright | ✓ PASS | 39/42 completed, parseable |
| 10 | Candidate: npm ci | ✓ PASS | |
| 11 | Candidate: npm audit total | ✓ PASS | **0 vulnerabilities** |
| 12 | Candidate: npm ls seguro | ✓ PASS | next 16.2.10, postcss 8.5.16, js-yaml 4.2.0, uuid 11.1.1, prismjs 1.30.0 |
| 13 | Candidate: typecheck/lint/build | ✓ PASS | |
| 14 | Candidate: frontend health HTTP 200 | ✓ PASS | |
| 15 | Candidate: Playwright | ✓ PASS | 40/42 completed, parseable |
| 16 | fixtureEnoentCount | ✓ **0** | Fixtures at correct paths, no ENOENT |
| 17 | candidateNewFailures | ✓ **0** | No NEW failures from candidate |
| 18 | baselinePassedCandidateFailed | ✓ **0** | No baseline-passing test fails in candidate |
| 19 | playwrightSkipped | ✓ 0 | |
| 20 | playwrightRetries | ✓ 0 | |
| 21 | **comparisonPass** | ✓ **TRUE** | |
| 22 | GATES-PASS.json generado | ✓ **YES** | All conditions met |
| 23 | **Promoción atómica** | ✓ **YES** | canonical ahora tiene hashes candidato |
| 24 | Cleanup + ports libres | ✓ PASS | Both ports free |
| 25 | SQLite hash restoration | ✓ PASS | Hash matches initial |

### Test Summary

```
Baseline:  39 passed, 3 failed  (16.0m)
Candidate: 40 passed, 2 failed  (15.5m)

candidateNewFailures = 0
baselinePassedCandidateFailed = 0
fixtureEnoentCount = 0
```

### Common Failures (pre-existing, identical in both copies)

1. `tests/salary-receipts.real.spec.ts:22:5` — Recibos de sueldo importa, acepta y anula un PDF real
2. `tests/salary-receipts.spec.ts:62:5` — Recibos de sueldo permite revisar y aceptar un borrador desde Ingresos

### Baseline-Only Failure (fixed by candidate)

- `tests/privacy-mode.spec.ts:55:5` — Privacidad persiste y oculta importes globalmente sin alterar datos
- **This is an improvement, not a regression** — candidate has fewer failures than baseline

### Candidate Hashes (Verified)

```
package.json:    5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61
package-lock.json: 5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B
```

Both confirmed in canonical workspace.

### Promotion Output

```json
{
  "vertical": "APP-SEC-DEPS-001",
  "version": "v1.0.3",
  "promotedAt": "2026-07-19T01:05:16.5494446-03:00",
  "packageJson": "5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61",
  "packageLock": "5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B",
  "source": "C:\\Users\\javie\\AppData\\Local\\CajaApp\\validation\\APP-SEC-DEPS-001-v1.0.3\\candidate\\frontend",
  "destination": "C:\\Users\\javie\\Javier.s.corbella Dropbox\\Javier Corbella\\cajaApp-V3\\workspace\\frontend"
}
```

### Checklist Final Obligatorio

```
TOTAL_TASKS=16
DONE=16
PENDING=0
BLOCKED=0
```

Las 16 tareas son:
1. ✓ preflight
2. ✓ hashes baseline
3. ✓ SQLite backup
4. ✓ STAGE R1
5. ✓ fixtures correctos
6. ✓ baseline npm ci
7. ✓ baseline static gates
8. ✓ baseline runtime/Playwright
9. ✓ candidate npm ci
10. ✓ audit 0
11. ✓ npm ls seguro
12. ✓ candidate static gates
13. ✓ candidate runtime/Playwright
14. ✓ comparación
15. ✓ promoción
16. ✓ cleanup/evidencia

### Evidence Files

- `00-preflight.txt` - Preflight checks
- `01-stage-output.txt` - STAGE script output
- `02-baseline-npm-ci.log` - Baseline npm ci
- `03-baseline-typecheck.log` - Baseline typecheck
- `04-baseline-lint.log` - Baseline lint
- `05-baseline-build.log` - Baseline build
- `06-baseline-playwright.log` - Baseline Playwright (39/42)
- `07-candidate-npm-ci.log` - Candidate npm ci
- `08-candidate-audit.json` - Candidate audit (0 vulnerabilities)
- `09-candidate-npm-ls.txt` - Candidate npm ls (correct versions)
- `10-candidate-typecheck.log` - Candidate typecheck
- `11-candidate-lint.log` - Candidate lint
- `12-candidate-build.log` - Candidate build
- `13-candidate-playwright.log` - Candidate Playwright (40/42)
- `14-promotion-output.txt` - Promotion output
- `BASELINE-RESULT.json` - Baseline test results
- `CANDIDATE-RESULT.json` - Candidate test results
- `COMPARISON.json` - Comparison (comparisonPass=true)
- `GATES-PASS.json` - Gates pass manifest
- `PRE-v1.0.3-dev.db` - Initial SQLite backup

### Environment Summary
- Node: v24.18.0 (I:\Tools\node-v24.18.0-win-x64\node.exe)
- NPM: 11.16.0
- Backend port 11436: FREE at end
- Frontend port 11437: FREE at end
- SQLite hash: E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C (restored)
- package.json hash: 5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61 (PROMOTED)
- package-lock.json hash: 5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B (PROMOTED)

### Conclusion

La remediación de dependencias se ejecutó correctamente:
- 0 vulnerabilidades de audit
- Versiones seguras: next 16.2.10, postcss 8.5.16, js-yaml 4.2.0, uuid 11.1.1, prismjs 1.30.0
- Sin copias vulnerables anidadas
- Fixtures en paths correctos (R1 corregió el path)
- 0 ENOENT errors
- 0 regresiones de baseline a candidate
- Candidate fija 1 test (privacy-mode) que fallaba en baseline
- Promoción atómica exitosa
- Canonical ahora tiene los hashes candidato