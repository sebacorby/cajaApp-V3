# 21-playwright-summary.md

Playwright — suite completa

Timestamp: 2026-07-15T01:51:00

## Comando

```powershell
$env:CAJAAPP_API_BASE_URL="http://127.0.0.1:11436"
$env:CAJAAPP_FRONTEND_BASE_URL="http://127.0.0.1:11437"
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:11437"
$env:PLAYWRIGHT_HTML_OPEN="never"
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test --project=chromium --workers=1 --retries=0 --trace=on
```

CWD: `I:\cajaApp-V3-real\workspace\frontend`

## Resultado

- Tests descubiertos: 25
- Exit code: 1
- Passed: 17
- Failed: 8
- Skipped: 0
- Duración: 9.4m

## Tests fallados

1. `tests\ai-advisor.spec.ts:19:5` — Asesor IA: `askResponse.ok()` es false (HTTP 422).
2. `tests\categories.spec.ts:19:7` — Administración de categorías: test timeout 90s.
3. `tests\chart-parity.spec.ts:15:5` — Dashboard modos visuales: strict mode violation en botón "Actualizar".
4. `tests\debit-csv-import.spec.ts:14:7` — Importación CSV: strict mode violation en descripción del movimiento.
5. `tests\e2e\card-statement-import.spec.ts:99:7` — Importación PDF Galicia Visa: solo 112 filas extraídas, esperadas >= 125.
6. `tests\e2e\deuda-futura\future.spec.ts:13:7` — Deuda futura: strict mode violation en "Confirmado".
7. `tests\global-search.spec.ts:14:5` — Búsqueda global: no se encuentra diálogo `Buscar en CajaApp` en mobile.
8. `tests\sidebar-data-quality.spec.ts:34:5` — Sidebar: test timeout 90s.

## Tests aprobados

- alert-center.spec.ts
- budgets.spec.ts
- dashboard-trend-visual.spec.ts
- card-statement-import.spec.ts (segundo test)
- dashboard.spec.ts
- deuda-futura\card-history.spec.ts
- deuda-futura\dashboard-alerts.spec.ts
- deuda-futura\movements-export.spec.ts
- deuda-futura\reports.spec.ts
- deuda-futura\settings.spec.ts
- incomes.spec.ts
- financial-health.spec.ts
- goals.spec.ts
- movements.spec.ts
- quality-audit.spec.ts (3 tests)

## Veredicto del bloque

**FAIL** — 8 de 25 tests fallaron. La suite no alcanza 0 failed.
