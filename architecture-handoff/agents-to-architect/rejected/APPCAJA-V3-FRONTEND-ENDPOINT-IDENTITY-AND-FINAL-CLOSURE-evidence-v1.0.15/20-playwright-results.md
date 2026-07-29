# Playwright Full Suite Results

## Summary

**24 passed, 2 failed** (5.8 minutes)

## Passed Tests

1. ✅ ai-advisor.spec.ts:19 — "Asesor IA mantiene fingerprint, claims y citas consistentes" (API test)
2. ✅ card-statement-import.spec.ts:309 — "stops polling and offers retry when extraction fails"
3. ✅ dashboard.spec.ts:48 — "muestra movimientos reales del ledger y separa compromisos"
4. ✅ card-history.spec.ts:8 — "Tarjetas muestra historial navegable y trazabilidad del resumen"
5. ✅ dashboard-alerts.spec.ts:15 — "Dashboard muestra una alerta determinística y abre su origen"
6. ✅ future.spec.ts:16 — "Deuda y compromisos futuros muestra un compromiso confirmado"
7. ✅ movements-export.spec.ts:16 — "Movimientos exporta exactamente el filtro activo"
8. ✅ reports.spec.ts:24 — "Reportes consume datos reales, exporta y abre el detalle"
9. ✅ settings.spec.ts:6 — "Configuración persiste perfil local y tema global"
10. ✅ incomes.spec.ts:20 — "Ingresos crea, proyecta y persiste ingresos ARS y USD" (7 subtests)
11. ✅ financial-health.spec.ts:53 — "Salud financiera conserva fórmula, evidencia, navegación e historial"
12. ✅ global-search.spec.ts:18 — "búsqueda global: teclado, navegación por registro y mobile"
13. ✅ goals.spec.ts:8 — "crea un objetivo, registra un aporte y limpia los datos UAT"
14. ✅ movements.spec.ts:15 — "Movimientos manuales crea, edita y anula un movimiento"
15. ✅ quality-audit.spec.ts:29 — "todas las secciones funcionales navegan sin promesas ficticias"
16. ✅ quality-audit.spec.ts:64 — "las once secciones están disponibles en navegación móvil" (11 subtests)
17. ✅ quality-audit.spec.ts:88 — "header y navegación no exponen controles ficticios"
18. ✅ sidebar-data-quality.spec.ts:42 — "Sidebar muestra indicadores determinísticos"

## Failed Tests

1. ❌ ai-advisor.spec.ts:60 — "Asesor IA responde en UI desktop y conserva acceso mobile"
   - Error: timeout waiting for `ai-advisor-response` element after submit (180s)
   - Context: Question was filled and submit clicked, but response Card did not render

2. ❌ e2e\card-statement-import.spec.ts:121 — "imports Galicia Visa PDF and renders the real preview"
   - Error: `Failed to spawn Python: spawn .venv\Scripts\python.exe ENOENT`
   - Context: Python venv not set up in test environment

## AI Advisor Test Details

### Test 1 (API) — PASSED
- Creates movements via API
- Gets context fingerprint: 64-char hash ✅
- Posts question to /api/ai-advisor/ask
- Validates fingerprint match, claims, citations ✅

### Test 2 (UI) — TIMEOUT
- Creates movements via API
- Navigates to AI Advisor in browser
- Fills question, clicks submit
- Waits for `ai-advisor-response` element: **TIMEOUT after 180s**
- Error context shows full UI rendered including submit button
