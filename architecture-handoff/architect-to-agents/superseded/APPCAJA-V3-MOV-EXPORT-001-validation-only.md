# APPCAJA-V3-MOV-EXPORT-001 — Validación exclusiva de exportación de Movimientos

## Regla

El agente sólo valida. No modifica código, dependencias, tests, configuración ni SSOT. Entorno: Windows x64 + Node.js exacto `v24.18.0`.

## Backend

Ejecutar `npm ci`, `npm run prisma:generate`, `npm run prisma:migrate:deploy`, `npm run build` y `npm run test`.

Confirmar `2/2 PASS` en:

```text
tests/movements/movements-export.test.ts
```

Validar:

```text
GET /api/movements/export.csv?from=2026-07-01&to=2026-07-31
```

Repetir con:

- `q`;
- `type`;
- `source`;
- `category`;
- `status`;
- `currency`;
- `minAmount` y `maxAmount`;
- `includeProjected=true`;
- combinación de filtros;
- `page=1&pageSize=1` y confirmar que el CSV no queda limitado a una fila.

Comprobar BOM UTF-8, `;`, escaping de comillas/separadores, nombre determinístico, `X-Exported-Records` y columnas de trazabilidad.

## Frontend

Ejecutar typecheck, lint, build y:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = "never"
npx playwright test tests/movements-export.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

Confirmar:

- botón `Exportar filtro CSV`;
- descarga con búsqueda activa;
- el CSV incluye sólo el conjunto filtrado;
- filtros Proyectados incluyen filas proyectadas;
- exportación desde un drilldown de Reportes;
- regresión de paginación, CRUD manual, categorías e importación CSV.

## Entrega

Guardar evidencias en `architecture-handoff/agents-to-architect/pending-validation` sin remediar código. Incluir comandos, outputs, CSVs, trace, capturas y pendientes reales.
