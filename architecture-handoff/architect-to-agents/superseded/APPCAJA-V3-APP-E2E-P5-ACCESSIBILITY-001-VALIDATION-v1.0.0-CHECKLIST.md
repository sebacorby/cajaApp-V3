# APP-E2E-P5-ACCESSIBILITY-001 v1.0.0 — Checklist vinculante

1. Confirmar root canónico, Windows x64 y Node.js v24.18.0 exacto.
2. Confirmar puertos 11436 y 11437 libres antes de iniciar; registrar PIDs al levantar servicios.
3. Crear backup binario de `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Registrar tamaño y SHA-256 de los cinco archivos implementados. Valores esperados:
   - `cierres-section.tsx`: 20874 bytes; SHA-256 `ba9e51067d325b40fc662ffaef0b3a10b2516c3417b2b608fdd80f4de4431186`.
   - `respaldo-section.tsx`: 21129 bytes; SHA-256 `d52a26dbc01c22ab2afb50de48c55cf22bee820e2afb623741ee2a0c3858f922`.
   - `month-close.spec.ts`: 8151 bytes; SHA-256 `22a854a749a77c932c6b33749a1e115c1061fa640c24b9058ebf04f35acf2d67`.
   - `backup-restore.spec.ts`: 10577 bytes; SHA-256 `8d5bb24a329855f143466dcceec8e276301557230576b7267024b0122a5a1c88`.
   - `quality-audit.spec.ts`: 3527 bytes; SHA-256 `a5e9301efc87cfaaacf4479aa356615ac0583e89b15486f4e4206258e4447735`.
5. Demostrar mediante inventario/hash que ningún otro archivo cambió durante la validación.
6. Desde frontend ejecutar `npm ci`, `npm run typecheck`, `npm run lint` y `npm run build`. Cero errores; warnings preexistentes documentados.
7. Levantar backend y frontend reales con el mecanismo autoritativo. Confirmar health y navegación inicial.
8. Ejecutar exactamente el Playwright focal indicado en la instrucción, con Chromium, un worker, cero retries y cero skips.
9. Cierres desktop: empty, creación, ARS/USD, detalle, confirmación y reapertura.
10. Cierres mobile: error 503 reproducible, retry por teclado, tarjeta responsive, detalle y reapertura por teclado.
11. Respaldo desktop: empty, creación, validación, selección de archivo, confirmación y restauración con respaldo previo.
12. Respaldo mobile: error 503, retry por teclado, acciones accesibles, archivo anunciado, cancelación y aceptación de confirmación.
13. Quality audit: quince secciones en desktop/mobile; `aria-current`; sin copy ficticio; labels y tablas de Cierres/Respaldo accesibles.
14. Guardar capturas desktop/mobile de Cierres y Respaldo, incluyendo al menos un estado error/retry y un estado con datos.
15. Cero strict-mode violations, timeouts, retries, skips, fallos ocultos o cambios de test.
16. Detener procesos y demostrar puertos libres.
17. Restaurar SQLite desde el backup inicial y demostrar SHA-256 final idéntico.

Entregar logs, JSON reporter, screenshots, trace/video focal, inventario, hashes, PIDs, cleanup y `00-verdict.md` en la carpeta de evidencia indicada.

Veredicto permitido: PASS o FAIL. El agente no corrige archivos.