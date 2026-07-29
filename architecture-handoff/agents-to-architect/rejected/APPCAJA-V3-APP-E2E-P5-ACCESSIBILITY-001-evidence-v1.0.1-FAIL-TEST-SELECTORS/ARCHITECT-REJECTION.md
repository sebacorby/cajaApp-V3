# APP-E2E-P5-ACCESSIBILITY-001 v1.0.1 — Rechazo arquitectónico

Estado: FAIL técnico de tests.

La implementación productiva de Cierres y Respaldo no presenta defecto demostrado. Los tres fallos fueron strict-mode violations causados por selectores globales que también alcanzaban internals de Next.js: `__next-route-announcer__`, `nextjs-portal` y `#next-logo`.

Remediación v1.0.2: se modifican únicamente `backup-restore.spec.ts`, `month-close.spec.ts` y `quality-audit.spec.ts`. No se modifica código productivo, backend, Prisma, SQLite, dependencias ni configuración.