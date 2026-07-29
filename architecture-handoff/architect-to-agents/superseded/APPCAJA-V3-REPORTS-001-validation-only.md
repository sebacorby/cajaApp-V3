# APPCAJA-V3-REPORTS-001 — Validación exclusiva de Reportes reales

## 1. Regla de trabajo

El agente sólo valida. No está autorizado a modificar código, configuración, migraciones, dependencias, tests ni el SSOT.

Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`.

## 2. Alcance implementado

- módulo backend `src/modules/reports`;
- `GET /api/reports`;
- `GET /api/reports/export.csv`;
- `src/lib/finance/reports-api.ts`;
- `ReportesSection` real;
- drilldown Reportes → Movimientos;
- test unitario `tests/reports/reports.service.test.ts`;
- Playwright `tests/reports.spec.ts`.

## 3. Backend

Ejecutar:

1. `npm ci`;
2. `npm run prisma:generate`;
3. `npm run prisma:migrate:deploy`;
4. `npm run build`;
5. `npm run test`.

Confirmar `3/3 PASS` en `tests/reports/reports.service.test.ts`.

Smoke obligatorio:

```text
GET /api/reports?from=2026-07-01&to=2026-07-31
GET /api/reports?from=2026-04-01&to=2026-06-30
GET /api/reports?from=2026-01-01&to=2026-12-31
GET /api/reports/export.csv?from=2026-01-01&to=2026-12-31
```

Validar:

- ingresos, egresos y resultado por ARS/USD;
- promedios mensuales;
- período anterior equivalente;
- porcentajes y escalas calculados en backend;
- categorías y fuentes;
- deuda de tarjeta;
- ingresos recurrentes;
- calidad del dato;
- CSV con BOM UTF-8, delimitador `;` y nombre determinístico;
- `400` para `from > to` y rangos mayores a cinco años.

## 4. Frontend

Ejecutar:

1. `npm ci`;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build`;
5. `$env:PLAYWRIGHT_HTML_OPEN = "never"`;
6. `npx playwright test tests/reports.spec.ts --project=chromium --workers=1 --retries=0 --trace=on`.

Confirmar:

- `data-testid="reports-section"` visible;
- rango real y editable;
- estados loading, error y vacío;
- resumen, comparación y evolución mensual;
- tablas de categorías, fuentes, deuda e ingresos recurrentes;
- descarga CSV;
- drilldown a Movimientos con `movement-drilldown-banner`;
- limpieza del drilldown y regreso al período global;
- regresión visual de Dashboard, Movimientos, Tarjetas y Deuda futura.

## 5. Entrega

Entregar evidencias en `architecture-handoff/agents-to-architect/pending-validation` sin modificar código. Incluir comandos, outputs, respuestas JSON, CSV, trace/capturas, UAT y pendientes reales.
