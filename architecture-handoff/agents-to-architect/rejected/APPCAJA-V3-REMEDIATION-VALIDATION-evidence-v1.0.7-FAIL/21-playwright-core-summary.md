# 21-playwright-core-summary.md

Suite core de Playwright — resumen ejecutivo

Timestamp: 2026-07-14T22:24:00

## Comando

```powershell
$env:CAJAAPP_API_BASE_URL="http://127.0.0.1:11436"
$env:CAJAAPP_FRONTEND_BASE_URL="http://127.0.0.1:11437"
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:11437"
$env:PLAYWRIGHT_HTML_OPEN="never"
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on `
  --grep-invert "Asesor IA usa contexto estructurado"
```

CWD: `I:\cajaApp-V3-real\workspace\frontend`

## Resultado

- Tests descubiertos: 24
- Exit code: 1
- Passed: 11
- Failed: 13
- Skipped: 0
- Duración: 25.7m

## Tests fallados

1. `[chromium] › tests\alert-center.spec.ts:18:5 › centro de alertas: contador, evidencia, actualización, acción y mobile` — `getByTestId('alert-center-panel')` no visible.
2. `[chromium] › tests\categories.spec.ts:19:7 › Administración de categorías › crea reglas, recategoriza y archiva sin perder movimientos` — fila recategorizada no contiene "Sin clasificar".
3. `[chromium] › tests\chart-parity.spec.ts:15:5 › Dashboard alterna modos visuales sin perder datos equivalentes` — test timeout 120s.
4. `[chromium] › tests\debit-csv-import.spec.ts:14:7 › Importación de débitos CSV › previsualiza, acepta, deduplica y revierte una importación` — preview no contiene la descripción esperada.
5. `[chromium] › tests\e2e\card-statement-import.spec.ts:99:7 › card statement import › imports Galicia Visa PDF and renders the real preview` — `card-statement-import-state` no alcanza estado final.
6. `[chromium] › tests\e2e\dashboard.spec.ts:32:7 › Dashboard real › muestra movimientos reales del ledger y separa compromisos` — test timeout 720s.
7. `[chromium] › tests\e2e\deuda-futura\card-history.spec.ts:8:5 › Tarjetas muestra historial navegable y trazabilidad del resumen` — `card-statement-history` no visible.
8. `[chromium] › tests\e2e\deuda-futura\dashboard-alerts.spec.ts:15:5 › Dashboard muestra una alerta determinística y abre su origen` — test timeout 120s.
9. `[chromium] › tests\e2e\deuda-futura\future.spec.ts:13:7 › Deuda y compromisos futuros › muestra un compromiso confirmado y permite abrir su origen` — compromiso creado está hidden.
10. `[chromium] › tests\financial-health.spec.ts:43:5 › Salud financiera conserva fórmula, evidencia, navegación e historial` — `USD.status` esperaba `insufficient_data`, recibió `calculated`.
11. `[chromium] › tests\global-search.spec.ts:14:5 › búsqueda global: teclado, navegación por registro y mobile` — strict mode violation, dos elementos con el mismo texto.
12. `[chromium] › tests\movements.spec.ts:13:7 › Movimientos manuales › crea, edita y anula un movimiento desde la UI` — strict mode violation, dos elementos con el mismo texto editado.
13. `[chromium] › tests\sidebar-data-quality.spec.ts:34:5 › Sidebar muestra indicadores determinísticos y navega a su origen` — test timeout 90s.

## Tests aprobados

- budgets.spec.ts
- dashboard-trend-visual.spec.ts
- e2e\card-statement-import.spec.ts (segundo test)
- e2e\deuda-futura\movements-export.spec.ts
- e2e\deuda-futura\reports.spec.ts
- e2e\deuda-futura\settings.spec.ts
- e2e\incomes.spec.ts
- goals.spec.ts
- quality-audit.spec.ts (3 tests)

## Veredicto del bloque

**FAIL** — la suite core no pasa; 13 de 24 tests fallaron con errores reproductibles de UI, timeout o validación de datos.
