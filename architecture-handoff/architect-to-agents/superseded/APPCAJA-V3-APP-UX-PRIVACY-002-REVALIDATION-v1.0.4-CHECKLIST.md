# APP-UX-PRIVACY-002 v1.0.4 — Checklist

- Node.js v24.18.0, root, rutas, puertos y PIDs.
- Backup binario de `dev.db` y SHA-256 inicial.
- SHA-256 de `privacy-mode.spec.ts`; cero cambios productivos.
- Frontend typecheck, lint y build sin errores.
- Backend y frontend reales.
- Ejecutar `npx playwright test tests/privacy-mode.spec.ts --project=chromium --workers=1 --retries=0`.
- Sin mocks, retries ni skips.
- Validar mensajes de éxito, persistencia y reversibilidad.
- Auditar texto, aria-label y title en Inicio, Movimientos, Ingresos, Tarjetas y Cierres.
- Confirmar que el test deriva `sourceId` UUID del ID unificado y encuentra un único contenedor visible.
- Confirmar máscara, reaparición del importe y capturas.
- Confirmar cleanup mediante DELETE con `sourceId` y ausencia del centinela.
- Detener procesos, liberar puertos y restaurar SQLite al hash inicial.

Evidencia: `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.4/`.

El agente sólo valida. Cualquier fallo determina FAIL.