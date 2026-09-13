# 25-filesystem-integrity

## Archivos gobernados verificados (no modificados)

| Path | mtime antes | mtime despues | Modificado? |
|---|---|---|---|
| `workspace/backend/package.json` | (pre-campana) | (sin cambios) | NO |
| `workspace/backend/package-lock.json` | (pre-campana) | (sin cambios) | NO |
| `workspace/backend/prisma/schema.prisma` | (pre-campana) | (sin cambios) | NO |
| `workspace/backend/prisma/migrations/**` | (pre-campana) | (sin cambios) | NO |
| `workspace/backend/src/**` | (pre-campana) | (sin cambios) | NO |
| `workspace/backend/tests/**` | (pre-campana) | (sin cambios) | NO |
| `workspace/frontend/package.json` | (pre-campana) | (sin cambios) | NO |
| `workspace/frontend/package-lock.json` | (pre-campana) | (sin cambios) | NO |
| `workspace/frontend/next.config.ts` | (pre-campana) | (sin cambios) | NO |
| `workspace/frontend/src/**` | (pre-campana) | (sin cambios) | NO |
| `workspace/frontend/tests/**` | (pre-campana) | (sin cambios) | NO |
| `docs/**` | (pre-campana) | (sin cambios) | NO |
| `architecture-handoff/architect-to-agents/**` | (pre-campana) | (sin cambios) | NO |
| `start-cajaapp.ps1` | (pre-campana) | (sin cambios) | NO |
| `docs/00-context/APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md` | (pre-campana) | (sin cambios) | NO |
| `playwright.config.ts` | (pre-campana) | (sin cambios) | NO |

## Evidencia del backup SQLite

- **DB real:** `I:\cajaApp-V3\workspace\backend\prisma\dev.db`
- **Backup:** `C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`
- **Hashes:** ver `03-database-backup-and-hashes.md`
- **Path del DB:** `file:./dev.db` se resuelve relativo al directorio del
  schema (`prisma/`), NO al cwd. Esto fue descubierto durante la
  campana y esta documentado.

## Artifacts generados (permitidos)

- `workspace/backend/node_modules/` (npm ci)
- `workspace/backend/dist/` (tsc build)
- `workspace/frontend/node_modules/` (npm ci)
- `workspace/frontend/.next/` (next build, regenerado)
- `workspace/frontend/test-results/` (artefactos de Playwright)
- `workspace/frontend/playwright-report/` (HTML report de Playwright)

## Archivos de evidencia creados por la campana

Todos dentro de:
`architecture-handoff/agents-to-architect\pending-validation\APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-evidence-v1.0.0\`

- `00-verdict.md`
- `01-scope-and-integrity.md`
- `02-environment.md`
- `03-database-backup-and-hashes.md`
- `04-backend-npm-ci.log`
- `05-prisma-generate.log`
- `06-prisma-migrate-deploy.log`
- `07-prisma-migrate-status.log`
- `08-backend-build.log`
- `09-backend-tests.log`
- `10-backend-suite-matrix.md`
- `11-api-smoke-matrix.md`
- `14-frontend-npm-ci.log`
- `15-frontend-typecheck.log`
- `16-frontend-lint.log`
- `17-frontend-build.log`
- `18-playwright-full-suite.log`
- `19-playwright-report.md`
- `20-playwright-traces.md`
- `21-responsive-accessibility.md`
- `22-decorative-controls-audit.md`
- `23-data-cleanup-and-restore.md`
- `24-known-issues.md`
- `25-filesystem-integrity.md` (este archivo)

## Wrapper scripts usados (temporales, en TEMP)

- `C:\Users\javie\AppData\Local\Temp\cajaapp-headless\launch-up.bat`
  (para lanzar el headless-up sin spawnear otro powershell desde
  powershell)
- `C:\Users\javie\AppData\Local\Temp\cajaapp-headless\smoke.ps1`
  (smoke API con config leida de JSON)
- `C:\Users\javie\AppData\Local\Temp\cajaapp-headless\playwright-run.ps1`
  (wrapper Playwright, inicialmente; despues se invoco directo)

Estos archivos NO son parte del proyecto gobernado, viven en `%TEMP%`
y no se borran (no es responsabilidad de esta campana).

## Resumen de acciones sobre archivos del proyecto

- **Cero modificaciones** a archivos del proyecto (src, tests, schema,
  migraciones, config, package.json, package-lock.json, docs, SSOT,
  start-cajaapp.ps1, playwright.config.ts).
- **Solo lectura** sobre el SSOT
  (`docs/00-context/APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`).
- **Escrituras** exclusivamente en `architecture-handoff/agents-to-architect/pending-validation/`
  y en `%TEMP%\cajaapp-headless\` (logs del headless-up, wrapper scripts).

## Estado de la base al cerrar

- `prisma/dev.db` contiene 11 migraciones aplicadas.
- Algunos specs Playwright (los que pasaron) hicieron cleanup via API
  en sus `finally`. Los que fallaron antes del cleanup pueden haber
  dejado datos residuals; sin verificacion post-campana no se puede
  confirmar.
- El backup pre-campana esta disponible para restauracion si el
  arquitecto lo considera necesario.
