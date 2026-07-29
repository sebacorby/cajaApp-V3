# SSOT — APP-UX-PRIVACY-002

Estado: CERRADO / PASS.
Fecha de cierre: 18 de julio de 2026.

P5 permanece CERRADO / PASS.

APP-UX-PRIVACY-002 quedó implementado y validado técnicamente.

Resultado final:
- preferencia `hideAmounts` persistida en Settings;
- frontend fail-closed durante carga o error de preferencias;
- importes monetarios enmascarados globalmente sin alterar datos persistidos, API, exportaciones ni backups;
- activación y desactivación reversibles;
- mensaje de guardado estable;
- Playwright focal aprobado con backend y frontend reales;
- auditoría sin fugas monetarias en Inicio, Movimientos, Ingresos, Tarjetas y Cierres;
- cleanup del movimiento centinela confirmado;
- SQLite restaurada al hash inicial;
- sin cambios realizados por el agente de validación.

Evidencia aceptada:
`architecture-handoff/agents-to-architect/accepted/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.4-PASS/`

Las instrucciones v1.0.4 quedaron en `architect-to-agents/superseded`.

No quedan tareas abiertas dentro de este vertical.