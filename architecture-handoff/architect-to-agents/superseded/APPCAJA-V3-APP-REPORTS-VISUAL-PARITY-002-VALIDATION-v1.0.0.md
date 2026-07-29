# APPCAJA-V3 — APP-REPORTS-VISUAL-PARITY-002
## Validación v1.0.0

Estado: ACTIVA / SÓLO VALIDACIÓN.
Fecha: 18 de julio de 2026.

Root local canónico:
`C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`

Entorno obligatorio: Windows x64 y Node.js exacto v24.18.0.

## Objetivo

Validar la paridad visual real de Reportes: evolución mensual, lista/donut por categoría, selector ARS/USD sin conversión, tablas accesibles equivalentes, drilldown a Movimientos y CSV, conservando los gráficos del Dashboard.

## Archivos implementados

1. `workspace/frontend/src/components/finance/charts/chart-contracts.ts`
2. `workspace/frontend/src/components/finance/charts/monthly-evolution-chart.tsx`
3. `workspace/frontend/src/components/finance/charts/category-donut.tsx`
4. `workspace/frontend/src/components/finance/sections/reportes-section.tsx`
5. `workspace/frontend/tests/e2e/deuda-futura/reports.spec.ts`

No cambió backend, `reports-api.ts`, cálculos, persistencia, Prisma, dependencias, navegación ni configuración.

## Autoridad

El agente sólo ejecuta y documenta validación. No modifica código, tests, dependencias, SQLite, configuración, documentación ni estas instrucciones. Cualquier fallo produce evidencia FAIL y detención inmediata.

## Playwright focal exacto

`npx playwright test tests/e2e/deuda-futura/reports.spec.ts tests/chart-parity.spec.ts tests/e2e/dashboard.spec.ts --project=chromium --workers=1 --retries=0`

No usar filtros adicionales, skips, retries ni actualización de snapshots.

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-evidence-v1.0.0/`

El checklist v1.0.0 es vinculante.