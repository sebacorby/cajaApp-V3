# Rechazo arquitectónico — APP-UX-PRIVACY-002 v1.0.3

Estado: FAIL focal.
Fecha: 18 de julio de 2026.

La implementación productiva y los arreglos anteriores permanecen válidos. El fallo fue exclusivo del E2E: la respuesta API expone un ID unificado `manual:<uuid>`, mientras `TransactionsList` usa `sourceId` sin prefijo en `movement-row-*` y `movement-card-*`.

El arquitecto corrigió únicamente `workspace/frontend/tests/privacy-mode.spec.ts` para derivar y usar `sourceId` en selectores y cleanup.

Se requiere revalidación v1.0.4. No se modifica código productivo.