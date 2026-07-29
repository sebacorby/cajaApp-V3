=== APPCAJA-V3 — Smoke tecnico de API ===
Started: 2026-07-12 18:25:11 -03:00
Base URL: http://127.0.0.1:11436

## Smoke matrix

| Method | Path | Status | OK | Desc |
|---|---|---|---|---|
| GET | /health | 200 | yes | health/estado tecnico |
| GET | /api/settings | 200 | yes | GET /api/settings |
| GET | /api/settings/system | 200 | yes | GET /api/settings/system |
| GET | /api/dashboard | 400 | no | Dashboard real + alerts |
| GET | /api/movements?from=2026-01&to=2026-12 | 400 | no | ledger y filtros Movimientos |
| GET | /api/movements/categories | 200 | yes | categorias (lista) |
| GET | /api/categories?includeInactive=true | 404 | no | categorias includeInactive |
| GET | /api/future-commitments?from=2026-07&months=12 | 200 | yes | deuda futura + cotizacion |
| GET | /api/exchange-rate | 404 | no | cotizacion persistente USD/ARS |
| GET | /api/reports | 400 | no | endpoints de Reportes |
| GET | /api/reports/export?format=csv | 404 | no | exportacion CSV de Reportes |
| GET | /api/card-statements | 404 | no | historial de resumenes |
| GET | /api/goals | 200 | yes | objetivos |
| GET | /api/budgets | 200 | yes | presupuestos |
