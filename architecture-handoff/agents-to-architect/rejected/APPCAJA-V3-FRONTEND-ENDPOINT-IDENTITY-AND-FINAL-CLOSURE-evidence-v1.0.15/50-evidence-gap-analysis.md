# Evidence Gap Analysis — v1.0.15

**Generated:** 2026-07-15 23:14
**Folder:** APPCAJA-V3-FRONTEND-ENDPOINT-IDENTITY-AND-FINAL-CLOSURE-evidence-v1.0.15

---

## Exists (documentación escrita a mano, no artefactos originales)

| File | Size | Content |
|------|------|---------|
| 00-verdict.md | 1470 | Verdict escrito manualmente |
| 01-environment.md | 417 | Environment escrito manualmente |
| 02-integrity-preflight.md | 665 | Preflight escrito manualmente |
| 03-v1013-audit.md | 820 | Audit escrito manualmente |
| 04-sqlite-initial.md | 485 | SQLite written manually |
| 05-change-summary.md | 807 | Change summary escrita manualmente |
| 06-frozen-files-policy.md | 357 | Frozen files escrito manualmente |
| 10-backend-gates.md | 502 | Backend gates escrito manualmente |
| 11-frontend-gates.md | 506 | Frontend gates escrito manualmente |
| 20-playwright-results.md | 2844 | Playwright results escrito manualmente |
| 30-cleanup.md | 641 | Cleanup escrito manualmente |
| 31-known-issues.md | 1559 | Known issues escrito manualmente |
| 40-deliverable-to-architect.md | 1265 | Deliverable escrito manualmente |
| 99-inventory.md | 881 | Inventory escrito manualmente |

---

## Missing (NO EXISTE — fue eliminado en cleanup)

### Playwright Artifacts (test-results/)

The `test-results/` folder was deleted during cleanup. The following artifacts no longer exist:

- `**/trace.zip` — Playwright trace files
- `**/video.webm` — Video recordings of tests
- `**/*.png` — Screenshots of failures
- `**/error-context.md` — Error context files (ACTUAL failure evidence)
- `**/results.json` — Playwright JSON results

### Raw Console Output

No se capturó la salida cruda de:
- `npx playwright test ai-advisor.spec.ts --project=chromium` (focal)
- `npx playwright test --project=chromium` (full suite)
- `npm run typecheck` (salida completa)
- `npm run lint` (salida completa)
- `npm run build` (salida completa)
- Backend vitest run (salida completa)

### Python Environment Evidence

No se documentó durante la campaña:
- `py -0p` output
- `python --version` output
- Existencia de `workspace/backend/.venv/Scripts/python.exe`
- `requirements.txt` hash
- Stack completo del ENOENT

### Files Modified — No están en la carpeta

Los archivos modificados tampoco están materializados:
- `start-cajaapp.ps1` (diff o contenido de la línea modificada)
- `cajaapp-headless-up.ps1` (diff o contenido de la línea modificada)
- `workspace/frontend/tests/ai-advisor.spec.ts` (contenido relevante)

### ZIP de resultados

No se generó un ZIP conteniendo los resultados reales.

---

## Root Cause of Gap

La campaña original ejecutó los tests y luego ejecutó cleanup (eliminando node_modules, .next, test-results) ANTES de materializar los artefactos en la carpeta de evidencia.

Los archivos .md en la carpeta son resúmenes escritos manualmente después del hecho, NO los resultados originales de los tests.

---

## Para materializar correctamente se necesita:

1. **Re-ejecutar los tests** para generar los artefactos originales
2. **Copiar test-results/** completo a la carpeta de evidencia ANTES del cleanup
3. **Capturar stdout/stderr** de cada comando como archivo .log
4. **Documentar Python env** antes de ejecutar los tests

---

## Confirmación Google Drive

No se puede confirmar sincronización hasta que los archivos existan localmente.

**Estado actual:** carpeta renombrada correctamente, pero vacía de artefactos reales.
