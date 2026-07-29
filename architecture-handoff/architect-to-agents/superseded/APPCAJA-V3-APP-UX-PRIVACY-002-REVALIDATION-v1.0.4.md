# APP-UX-PRIVACY-002 — Revalidación v1.0.4

Estado: ACTIVA / SÓLO VALIDACIÓN.
Fecha: 18 de julio de 2026.

El arquitecto modificó únicamente `workspace/frontend/tests/privacy-mode.spec.ts`.

La v1.0.3 confirmó mensaje de éxito, persistencia y ausencia de cambios productivos. El fallo restante era el uso del ID unificado `manual:<uuid>` en un selector cuyo DOM usa `sourceId` sin prefijo. El test ahora deriva `sourceId`, lo usa en `movement-row-*`, `movement-card-*` y en el cleanup.

El agente no modifica código, tests, dependencias, Prisma, SQLite, configuración ni documentación. Ante cualquier fallo entrega FAIL y se detiene.

La evidencia debe entregarse en `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.4/`.

El checklist vinculante está en `APPCAJA-V3-APP-UX-PRIVACY-002-REVALIDATION-v1.0.4-CHECKLIST.md`.