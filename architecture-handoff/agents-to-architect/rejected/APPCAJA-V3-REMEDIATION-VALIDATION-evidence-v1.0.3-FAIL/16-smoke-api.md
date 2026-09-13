# Smoke API cannico

## Estado

El gate de smoke API no pudo ejecutarse porque el arranque headless autoritativo fall.

Se seleccionaron los puertos libres:
- Backend: 11436
- Frontend: 11437

El script `cajaapp-headless-up.ps1` report al intentar arrancar con `-Rebuild`:

```json
{"ok":false,"error":"prisma:generate fall con cdigo 1. ... Error: Prisma schema validation ... Error code: P1012 ..."}
```

Sin un backend disponible, no se puede ejecutar ninguna peticin de smoke API.

## Endpoints planificados no probados

### Lecturas base
- GET /health
- GET /api/settings
- GET /api/settings/system
- GET /api/dashboard
- GET /api/movements
- GET /api/movements/categories
- GET /api/movements/export.csv
- GET /api/reports
- GET /api/reports/export.csv
- GET /api/future-commitments
- GET /api/card-statements/statements
- GET /api/card-statements/exchange-rate
- GET /api/goals
- GET /api/budgets
- GET /api/search

### Salud Financiera
- GET /api/financial-health
- GET /api/financial-health/history
- POST /api/financial-health/snapshots
- DELETE /api/financial-health/snapshots/:snapshotId

### Asesor IA
- GET /api/ai-advisor/context
- POST /api/ai-advisor/ask
- GET /api/ai-advisor/history
- GET /api/ai-advisor/history/:interactionId
- DELETE /api/ai-advisor/history/:interactionId

Resultado: NOT RUN (dependencia de arranque headless fallida).
