# APP-UX-PRIVACY-002 — Revalidación v1.0.3

Estado: ACTIVA / SÓLO VALIDACIÓN.
Fecha: 18 de julio de 2026.

El arquitecto modificó únicamente `workspace/frontend/tests/privacy-mode.spec.ts`.

La v1.0.2 confirmó que el mensaje de guardado ya funciona. El fallo restante era un strict mode violation porque el centinela aparecía en las vistas responsivas `movement-row-*` y `movement-card-*`. Las dos aserciones ahora seleccionan, mediante `movementId`, únicamente el contenedor visible.

El agente no modifica código, tests, dependencias, Prisma, SQLite, configuración ni documentación. Ante cualquier fallo entrega FAIL y se detiene.

La evidencia debe entregarse en `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.3/`.

El checklist vinculante está en `APPCAJA-V3-APP-UX-PRIVACY-002-REVALIDATION-v1.0.3-CHECKLIST.md`.