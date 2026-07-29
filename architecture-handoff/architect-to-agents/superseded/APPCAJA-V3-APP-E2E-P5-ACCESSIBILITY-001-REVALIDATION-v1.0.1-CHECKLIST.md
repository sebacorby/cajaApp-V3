# APP-E2E-P5-ACCESSIBILITY-001 v1.0.1 — Checklist

1. Confirmar root canónico y Node.js v24.18.0.
2. Confirmar puertos 11436/11437 libres; registrar PIDs al iniciar.
3. Respaldar `workspace/backend/prisma/dev.db` y registrar SHA-256 inicial.
4. Verificar tamaños y SHA-256:
   - `cierres-section.tsx`: 20874 bytes / `BA9E51067D325B40FC662FFAEF0B3A10B2516C3417B2B608FDD80F4DE4431186`.
   - `respaldo-section.tsx`: 21129 bytes / `D52A26DBC01C22AB2AFB50DE48C55CF22BEE820E2AFB623741EE2A0C3858F922`.
   - `month-close.spec.ts`: 8151 bytes / `22A854A749A77C932C6B33749A1E115C1061FA640C24B9058EBF04F35ACF2D67`.
   - `backup-restore.spec.ts`: 10577 bytes / `E796BDA92DCFA581F35EEB9573FD8A8D2B53953E1E3E1C23ADAA8F2DD631427F`.
   - `quality-audit.spec.ts`: 3527 bytes / `A5E9301EFC87CFAAACF4479AA356615AC0583E89B15486F4E4206258E4447735`.
5. Verificar que `backup-restore.spec.ts` y `architecture-handoff/architect-to-agents/superseded/APP-E2E-P5-ACCESSIBILITY-001-inspection/backup-restore.spec.implemented.ts.txt` tengan el mismo tamaño y SHA-256 correcto.
6. Ejecutar frontend: `npm ci`, typecheck, lint y build.
7. Levantar backend/frontend reales y comprobar health.
8. Ejecutar el Playwright exacto de la instrucción: Chromium, 1 worker, 0 retries, 0 skips.
9. Validar Cierres desktop/mobile: empty, datos, error 503, retry por teclado, detalle, ARS/USD y reapertura confirmada.
10. Validar Respaldo desktop/mobile: empty, datos, error 503, retry por teclado, validación, archivo anunciado, cancelación y aceptación de restauración.
11. Validar quality-audit sobre quince secciones, labels, tablas, `aria-current` y ausencia de controles ficticios.
12. Guardar JSON reporter, logs, screenshots desktop/mobile, trace y video.
13. No modificar ningún archivo ni usar filtros, skips o retries.
14. Detener procesos, demostrar puertos libres y restaurar SQLite al SHA inicial.

Entregar `00-verdict.md` y evidencia completa en la carpeta v1.0.1. Veredicto permitido: PASS o FAIL.