# APP-UX-PRIVACY-002 v1.0.3 — Checklist vinculante

1. Usar Windows x64 y Node.js v24.18.0 exacto.
2. Registrar root, rutas de Node/npm, puertos y PIDs.
3. Crear copia binaria nueva de `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Registrar SHA-256 de `workspace/frontend/tests/privacy-mode.spec.ts` y confirmar que ningún archivo productivo cambió desde v1.0.2.
5. Ejecutar frontend typecheck, lint y build. Cero errores; sólo warnings preexistentes documentados.
6. Levantar backend y frontend reales.
7. Ejecutar exactamente `npx playwright test tests/privacy-mode.spec.ts --project=chromium --workers=1 --retries=0`.
8. No usar mocks para Settings ni movimientos.
9. Confirmar mensaje de éxito al activar y desactivar privacidad.
10. Confirmar persistencia después de recargar.
11. Auditar texto, `aria-label` y `title` en Inicio, Movimientos, Ingresos, Tarjetas y Cierres.
12. Confirmar que el centinela aparece una sola vez en el contenedor responsivo visible, queda enmascarado y luego reaparece.
13. Guardar capturas de modo visible, modo oculto y estado posterior a reload.
14. Verificar que fechas, porcentajes, IDs, cantidades y últimos cuatro dígitos no se oculten.
15. Limpiar centinela y detener procesos; puertos libres.
16. Restaurar SQLite desde la copia inicial y comprobar SHA-256 final idéntico.

Evidencia: `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.3/`.

El agente no modifica archivos. Cualquier fallo, retry, skip, fuga monetaria o hash final diferente determina FAIL.