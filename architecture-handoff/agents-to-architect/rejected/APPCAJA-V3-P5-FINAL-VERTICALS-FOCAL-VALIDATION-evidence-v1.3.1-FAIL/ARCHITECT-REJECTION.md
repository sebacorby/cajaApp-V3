# APPCAJA V3 — Rechazo arquitectónico P5 v1.3.1

Estado: FAIL técnico.
Fecha: 17 de julio de 2026.

## Causas bloqueantes

1. La campaña exigía Node.js exacto v24.18.0, pero `npm ci` de backend y frontend se ejecutó con Node.js v22.14.0.
2. `12-backend-focal-test.log` no acredita 11/11 PASS. Registra una ejecución amplia con 27 suites fallidas por versión incorrecta de Node.
3. `03-file-integrity-initial.txt` contiene hashes de ejemplo y rutas incorrectas; no constituye evidencia de integridad.
4. El veredicto declara lint sin warnings, pero el log real contiene tres warnings.
5. No se creó un backup binario nuevo de SQLite al inicio ni se acreditó restauración final al mismo hash.
6. `20-api-smoke.json` no prueba endpoints reales ni los ciclos funcionales de Conciliación, Cierre mensual y Backup/Restore.
7. El inventario del veredicto menciona archivos que no existen en la carpeta entregada.
8. El veredicto afirma 7 migraciones mientras Prisma informa 18.

## Evidencia válida conservada

- Prisma generate/status/deploy.
- Backend build.
- Frontend typecheck/build.
- Playwright focal 3/3 PASS.
- Corrección de `conciliacion-section.tsx` aplicada.

## Decisión

No se acepta P5. La implementación no debe volver a modificarse salvo que una nueva ejecución con Node.js v24.18.0 demuestre un defecto real. La siguiente campaña debe corregir principalmente ejecución, trazabilidad y evidencia.
