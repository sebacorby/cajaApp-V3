# Plan de ejecución — APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0

## Contexto
- Documento de validación: `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0.md`
- SSOT: `docs/00-context/SUPERSEDED__APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`
- Resultado permitido: `PASS`, `FAIL` o `BLOCKED`
- Sin permiso para modificar código, tests, configuración, dependencias ni SQLite

## Stage 0 — Setup y resguardo SQLite (Orquestador)
- Verificar Node.js exacto v24.18.0
- Verificar backup `cajaapp-FINAL-20260712-180706.db`
- Registrar hash SHA-256 del backup
- Registrar hash SHA-256 de `prisma/dev.db` actual
- Restaurar backup sobre `prisma/dev.db`
- Confirmar hash restaurado coincide con backup
- Crear copia de resguardo limpia para restauración final
- Detener ecosistema si está corriendo

## Stage 1 — Validación backend (Subagente)
Desde `workspace/backend`:
- `npm ci`
- `npm run prisma:generate`
- `npm run prisma:migrate:deploy`
- `npm run prisma:migrate:status`
- `npm run build`
- `npm run test`
- Verificar criterios obligatorios (exit codes, tests descubiertos, ausencia de `watchdog-timeout.test.ts`, etc.)
- Capturar logs completos y matriz de suites

## Stage 2 — Validación frontend (Subagente)
Desde `workspace/frontend`:
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Verificar criterios obligatorios (exit codes, errores específicos, ausencia de archivos duplicados)
- Capturar logs completos

## Stage 3 — Arranque autorizado y Smoke API (Subagente)
- Ejecutar `cajaapp-headless-up.ps1 -JsonOnly`
- Esperar 30-60s y verificar status
- Ejecutar smoke API con rutas canónicas
- Capturar respuestas (método, URL, status, resultado)

## Stage 4 — Playwright completo (Subagente)
Desde `workspace/frontend`:
- Ejecutar `npx playwright test --project=chromium --workers=1 --retries=0 --trace=on`
- Verificar criterios obligatorios (exit code 0, cero failed/skipped, specs descubiertos)
- Capturar log completo, reporte, trazas y capturas

## Stage 5 — Auditoría responsive/accesibilidad/controles (Subagente)
- Revisar `quality-audit.spec.ts` y evidencia Playwright
- Verificar navegación desktop/mobile, aria-current, menú móvil, foco
- Verificar ausencia de controles ficticios
- Verificar que Objetivos y Presupuestos son secciones reales
- Verificar tema oscuro

## Stage 6 — Cleanup, restauración y evidencia (Orquestador)
- Verificar limpieza de datos UAT
- Detener ecosistema
- Restaurar copia limpia
- Confirmar hash final
- Verificar no quedan procesos ni puertos
- Crear carpeta de evidencia
- Compilar `00-verdict.md` con veredicto final

## Dependencias
- Stage 0 → Stage 1, Stage 2 (paralelo posible)
- Stage 1, Stage 2 → Stage 3
- Stage 3 → Stage 4
- Stage 4 → Stage 5
- Stage 5 → Stage 6
