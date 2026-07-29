# Checklist vinculante — APP-UX-PRIVACY-002 v1.0.2

1. Preflight: root exacto, Node v24.18.0, npm y puertos.
2. Backup binario nuevo de `workspace/backend/prisma/dev.db` y SHA-256 inicial.
3. Hashes de provider, Configuración, `amount-privacy.ts` y `privacy-mode.spec.ts`.
4. Frontend: `npm ci`, typecheck, lint y build. Cero errores.
5. Levantar backend/frontend en puertos aislados y registrar PIDs/logs.
6. Ejecutar sólo `tests/privacy-mode.spec.ts` en Chromium, un worker y sin retries.
7. Verificar checkbox inicialmente desmarcado después del reset API.
8. Verificar mensaje de éxito al activar privacidad.
9. Recargar y demostrar persistencia.
10. Auditar Inicio, Movimientos, Ingresos, Tarjetas y Cierres sin importes reales en texto, `aria-label` ni `title`.
11. Confirmar centinela enmascarado.
12. Desactivar privacidad y verificar nuevamente el mensaje de éxito.
13. Volver a Movimientos y confirmar que el importe real reaparece.
14. Capturar los cuatro estados requeridos.
15. Restaurar preferencias originales, eliminar centinela, detener procesos y liberar puertos.
16. Restaurar SQLite y demostrar SHA-256 final idéntico.

No se modifica código. Cualquier gate incompleto determina FAIL.
