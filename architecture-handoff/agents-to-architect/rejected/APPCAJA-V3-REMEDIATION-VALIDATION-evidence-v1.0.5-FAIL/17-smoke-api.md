# Smoke API

Status: **NOT RUN**

Razón: El arranque headless falló (`cajaapp-headless-up.ps1 -Rebuild` retornó `ok:false`) debido a errores de build/typecheck en el frontend. Sin entorno levantado, no es posible ejecutar las validaciones de smoke API.

Endpoints planificados (no ejecutados):
- GET /health
- GET /api/settings
- GET /api/dashboard?from=<inicio>&to=<fin>
- GET /api/reports?from=<inicio>&to=<fin>
- GET /api/future?from=<mes>&months=3
- GET /api/budgets/overview?from=<mes>&to=<mes>&status=active
- GET /api/goals/overview?status=active&limit=4
- GET /api/financial-health?from=<inicio>&to=<fin>
- GET /api/financial-health/history?limit=6
- GET /api/ai-advisor/context?from=<inicio>&to=<fin>
- GET /api/ai-advisor/history?limit=12
- GET /api/search?q=ingreso&page=1&limit=10
