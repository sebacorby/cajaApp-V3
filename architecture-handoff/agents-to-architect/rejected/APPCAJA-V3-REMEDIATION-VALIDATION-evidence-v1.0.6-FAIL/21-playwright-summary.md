# 21-playwright-summary.md

Playwright — resumen

Timestamp: 2026-07-14T19:50:36

## Ejecución

- Comando: `npx playwright test --project=chromium --workers=1 --retries=0 --trace=on`
- Directorio: `I:\cajaApp-V3-real\workspace\frontend`
- Variables: `CAJAAPP_API_BASE_URL=http://127.0.0.1:11436`, `PLAYWRIGHT_HTML_OPEN=never`
- Inicio: 2026-07-14T19:35:36
- Fin: interrumpido por timeout de herramienta a los 15 minutos
- Estado: **FAIL** (no completó)

## Tests observados en el log parcial

Se alcanzaron a ejecutar 25 tests con 1 worker. Fallas registradas antes de la interrupción:

1. **ai-advisor.spec.ts:19:5** — `Asesor IA usa contexto estructurado, cita fuentes y limpia su historial`
   - Error: `askResponse.ok()` fue false (HTTP no 2xx).
   - Causa: modelo Ollama no disponible (ver `18-ai-provider.md`).

2. **alert-center.spec.ts:18:5** — `centro de alertas: contador, evidencia, actualización, acción y mobile`
   - Error: `getByTestId('header-alert-center')` no visible en 30s.

3. **budgets.spec.ts:8:5** — `crea un presupuesto real, muestra el resumen autoritativo y limpia los datos UAT`
   - Error: timeout de 720000ms excedido.

4. **categories.spec.ts:19:7** — `Administración de categorías › crea reglas, recategoriza y archiva sin perder movimientos`
   - Error: timeout de 90000ms excedido esperando botón `Movimientos`.

## Resultados parciales

- Tests completados antes de la interrupción: 4 (todos fallados)
- Tests pendientes al momento del timeout: 21 (la suite no pudo finalizar)
- Total programado: 25 tests
- Passed: desconocido (interrumpido)
- Failed: 4+ (mínimo confirmado)
- Skipped: 0

## Reporte HTML

No se generó reporte HTML final porque la suite fue interrumpida. Los artefactos parciales (screenshots, videos, traces) quedan en `workspace\frontend\test-results\`.

## Resultado

**FAIL** — la suite no completó dentro del tiempo disponible y presentó fallas en los tests iniciales.
