# Verdict — v1.0.15

**Date:** 2026-07-15
**Status:** FAIL — evidencia incompleta

## ⚠️ Evidencia No Materializada

**Esta carpeta NO contiene los artefactos originales de la campaña.**
Los archivos .md son resúmenes escritos manualmente después del cleanup.
Los resultados reales (24 PASS / 2 FAIL) fueron observados en consola pero NO fueron capturados como archivos antes del cleanup.

Ver: `50-evidence-gap-analysis.md`

---

## Resultados Observados (no documentados)

Los siguientes resultados fueron observados en la terminal pero los artefactos fueron eliminados antes de ser materializados:

### Backend gates
- npm ci: 0 vulnerabilities
- prisma generate: OK
- prisma migrate status: 14 migrations, up to date
- build: OK (0 errors)
- vitest: 154 tests PASS (3.18s)

### Frontend gates
- npm ci: OK
- typecheck: 0 errors
- lint: 3 warnings (pre-existing)
- build: OK

### Playwright suite (observado en consola)
- 24 passed, 2 failed (5.8m)
- ✅ AI Advisor API test (ai-advisor.spec.ts:19) — PASS
- ❌ AI Advisor UI test (ai-advisor.spec.ts:60) — FAIL (timeout 180s)
- ❌ Card statement import (e2e/card-statement-import.spec.ts:121) — FAIL (Python ENOENT)

### Cambio aplicado
- `start-cajaapp.ps1` line 4: `FrontendPort = 3000` → `FrontendPort = 11437`
- `cajaapp-headless-up.ps1` line 10: `FrontendPort = 3000` → `FrontendPort = 11437`

---

## Lo que hace falta para materializar

1. Re-ejecutar los tests con captura de salida
2. Copiar test-results/ completo antes del cleanup
3. Documentar Python env (py -0p, python --version, .venv existence)
4. Materializar los archivos modificados (diff de start-cajaapp.ps1 y cajaapp-headless-up.ps1)
5. Generar ZIP con los resultados

---

## Recomendación

NO emitir v1.0.16 hasta que la evidencia de v1.0.15 esté materializada con los artefactos originales.
