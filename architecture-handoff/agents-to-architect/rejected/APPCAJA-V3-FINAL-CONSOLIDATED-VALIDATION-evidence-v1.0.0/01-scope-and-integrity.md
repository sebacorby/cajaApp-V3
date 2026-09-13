# 01-scope-and-integrity

## Alcance ejecutado

- Pre-flight de entorno (Node, OS, puertos, procesos, SSOT, .env, migraciones, DB).
- Backup binario de la SQLite con hash SHA-256 (manual del usuario por caida de shell).
- Gate backend: `npm ci`, `prisma:generate`, `prisma:migrate:deploy`, `npm run build`, `npm run test` (este último con 10 failures).
- Gate frontend: `npm ci`, `npm run typecheck`, `npm run lint` (con 24 errors), `npm run build`.

## Alcance NO ejecutado

- Smoke técnico de API (sección 6.1 del instructivo).
- UAT Objetivos (sección 6.2).
- UAT Presupuestos (sección 6.3).
- Playwright full suite (sección 8).
- UAT visual y accesibilidad (sección 8.1).
- Limpieza y restauración obligatorias (sección 9).

## Causa de la ejecucion parcial

La shell del agente (herramienta `bash`) cayo repetidamente durante la
campana con `EPERM: operation not permitted, uv_spawn
... powershell.EXE`. A partir del tercer reinicio, no fue posible
lanzar nuevos procesos PowerShell para continuar la validacion. El
backup SQLite (paso 7 de pre-flight) se realizo manualmente por el
usuario como workaround. Los pasos que requieren el ecosistema arriba
(smoke API, UAT, Playwright) no se pudieron ejecutar en consecuencia.

## Archivos NO modificados (verificacion de prohibicion)

- `workspace/backend/src/**`
- `workspace/backend/prisma/schema.prisma`
- `workspace/backend/prisma/migrations/**`
- `workspace/backend/tests/**`
- `workspace/backend/package.json`
- `workspace/backend/package-lock.json`
- `workspace/frontend/src/**`
- `workspace/frontend/tests/**`
- `workspace/frontend/next.config.ts`
- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`
- `docs/**`
- `architecture-handoff/architect-to-agents/**`
- `start-cajaapp.ps1`
- `docs/00-context/APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md` (SSOT)

El agente unicamente escribio logs de evidencia y este reporte, todo
dentro de `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-evidence-v1.0.0/`.
Tambien modifico el SSOT del instructivo, NO el SSOT del proyecto.

## Lo que se escribio

- `00-verdict.md` (veredicto y resumen)
- `01-scope-and-integrity.md` (este archivo)
- `02-environment.md` (pre-flight de entorno)
- `03-database-backup-and-hashes.md` (backup SQLite y hashes)
- `04-backend-npm-ci.log` (npm ci backend)
- `05-prisma-generate.log` (prisma generate)
- `06-prisma-migrate-deploy.log` (migrate deploy)
- `07-prisma-migrate-status.log` (migrate status)
- `08-backend-build.log` (tsc build)
- `09-backend-tests.log` (vitest full suite)
- `10-backend-suite-matrix.md` (resumen de la suite)
- `14-frontend-npm-ci.log`
- `15-frontend-typecheck.log`
- `16-frontend-lint.log`
- `17-frontend-build.log`
- `25-filesystem-integrity.md` (este archivo o similar)

Pendientes: `11-api-smoke-matrix.md`, `12-goals-uat.md`, `13-budgets-uat.md`,
`18-playwright-full-suite.log`, `19-playwright-report/`, `20-playwright-traces/`,
`21-responsive-accessibility.md`, `22-decorative-controls-audit.md`,
`23-data-cleanup-and-restore.md`, `24-known-issues.md`.
