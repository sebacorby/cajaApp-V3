# APPCAJA-V3 — Veredicto Final Consolidado v1.0.0

## Resultado global

**FAIL**

## Resumen ejecutivo

La campaña se ejecutó contra el ecosistema real con el script canónico
`cajaapp-headless-up.ps1` (kill-all-node + prisma + build + start + health).
Se corrieron los gates backend y frontend, smoke API, y la suite Playwright
específica por específica. Hubo dos tipos de problemas:

1. **Bloqueantes para PASS** (defectos preexistentes del código):
   - 10 tests backend fallidos en `watchdog-timeout.test.ts` (función `getWorkerHardTimeoutMs` no existe en el source).
   - 24 errores de ESLint en frontend (`react-hooks/preserve-manual-memoization` + `react-hooks/set-state-in-effect`).
   - 4 tests Playwright fallidos (future, movements-export, reports, card-statement-failed, card-statement-import x 1) por bugs preexistentes (strict mode violations, timeouts de polling, etc.).

2. **Bloqueantes de cobertura** (gates no completados):
   - `dashboard-alerts` se colgó tras 5 min y fue matado.
   - `card-history` fue skipped (probable `test.skip` condicional).
   - 5 specs de la raíz de `tests/` (`movements`, `categories`, `debit-csv-import`, `goals`, `budgets`, `quality-audit`) NO fueron ejecutados porque la config Playwright tiene `testDir: ./tests/e2e` y esos specs están fuera. Sin modificar la config (prohibido) no son discoverables.

3. **Tests que pasaron** (sin defectos):
   - `dashboard`, `incomes`, `settings`, 1/2 de `card-statement-import`.

## Resultado de cada gate

| Gate | Resultado | Evidencia |
|---|---|---|
| **2.1 PowerShell/Node** | PASS — `powershell.exe` v5.1.22621, `node` v24.18.0 en `I:\Tools\node-v24.18.0-win-x64` | inline |
| 4. Pre-flight (env) | PASS — Win 11 Pro, build 26200, Node v24.18.0, .env keys listadas, 11 migrations detectadas | `02-environment.md` |
| 4. Backup SQLite (manual) | PASS — orig y backup coinciden en SHA-256 | `03-database-backup-and-hashes.md` |
| 6. `npm ci` backend | PASS exit 0 | `04-backend-npm-ci.log` |
| 6. `prisma:generate` | PASS exit 0 — Prisma Client v6.19.3 | `05-prisma-generate.log` |
| 6. `prisma:migrate:deploy` | PASS — 5 migraciones nuevas aplicadas (`20260712141000..20260712183000`) | `06-prisma-migrate-deploy.log` |
| 6. `prisma migrate status` | PASS — "Database schema is up to date" | `07-prisma-migrate-status.log` |
| 6. `npm run build` backend | PASS exit 0 | `08-backend-build.log` |
| 6. `npm run test` backend | **FAIL** — 23 archivos OK, 1 FAIL. 114 tests OK, 10 FAIL en `watchdog-timeout.test.ts` | `09-backend-tests.log`, `10-backend-suite-matrix.md` |
| 6.1 Smoke API | PARCIAL — 7/14 OK, 7/14 con 400/404 (algunos endpoints requieren query params que no se probaron, otros tienen path distinto) | `11-api-smoke-matrix.md` |
| 6.2 UAT Objetivos | NO EJECUTADO (tiempo) | — |
| 6.3 UAT Presupuestos | NO EJECUTADO (tiempo) | — |
| 7. `npm ci` frontend | PASS exit 0 | `14-frontend-npm-ci.log` |
| 7. `npm run typecheck` | PASS exit 0 | `15-frontend-typecheck.log` |
| 7. `npm run lint` | **FAIL** — 24 errores (23 `react-hooks/set-state-in-effect`, 1 `react-hooks/preserve-manual-memoization`) | `16-frontend-lint.log` |
| 7. `npm run build` frontend | PASS exit 0 | `17-frontend-build.log` |
| 8. Playwright suite | **FAIL** — 4 PASS, 4 FAIL, 1 SKIP, 1 TIMEOUT, 5 root specs fuera de testDir | `18-playwright-full-suite.log` |
| 8.1 UAT visual | NO EJECUTADO | — |
| 9. Cleanup UAT | NO EJECUTADO explícitamente; los specs Playwright hacen su propio cleanup en `finally` | — |
| Archivos gobernados sin modificar | PASS | `25-filesystem-integrity.md` |

## Detalle de Playwright

| Spec | Resultado | Tiempo |
|---|---|---|
| `tests/e2e/dashboard.spec.ts` | PASS | 1.4s |
| `tests/e2e/incomes.spec.ts` | PASS | 6.7s |
| `tests/e2e/deuda-futura/future.spec.ts` | **FAIL** — getByText hidden, espera 30s | 31.9s |
| `tests/e2e/deuda-futura/card-history.spec.ts` | SKIP | — |
| `tests/e2e/deuda-futura/movements-export.spec.ts` | **FAIL** — strict mode (2 elements match) | 1.1s |
| `tests/e2e/deuda-futura/reports.spec.ts` | **FAIL** — strict mode (2 elements match) | 2.1s |
| `tests/e2e/deuda-futura/settings.spec.ts` | PASS | 1.7s |
| `tests/e2e/deuda-futura/dashboard-alerts.spec.ts` | TIMEOUT (300s) — kill manual | 300s+ |
| `tests/e2e/card-statement-import.spec.ts` | 1 PASS / 1 **FAIL** | 39.9s total |
| `tests/e2e/card-statement-failed.spec.ts` | **FAIL** — element not found | 31.4s |

## Veredicto

```
Node v24.18.0:                              PASS
Backend npm ci:                             PASS
Backend prisma generate:                    PASS
Backend prisma migrate deploy:              PASS
Backend build:                             PASS
Backend tests:                             FAIL  (10 failures en watchdog-timeout.test.ts)
Backend smoke API:                         PARCIAL (7/14)
Frontend npm ci:                           PASS
Frontend typecheck:                        PASS
Frontend lint:                             FAIL  (24 errores react-hooks/*)
Frontend build:                            PASS
Playwright suite:                          FAIL  (4 FAIL, 1 SKIP, 1 TIMEOUT)
Integridad de archivos gobernados:         PASS
```

**Resultado global: FAIL** (regla: "un error de typecheck, lint o build
implica FAIL" + "suite completa PASS, sin tests omitidos o filtrados" +
"smoke, Playwright, UAT o integridad").

## Recomendaciones al arquitecto

1. **Resolver los dos defectos preexistentes que bloquean PASS**:
   - Crear/renombrar la función `getWorkerHardTimeoutMs` en el source del
     backend para que el test la encuentre.
   - Refactorizar `tarjetas-section.tsx`, `carousel.tsx`, `use-mobile.ts`
     para cumplir `react-hooks/preserve-manual-memoization` y
     `react-hooks/set-state-in-effect`.

2. **Después de eso**, retomar la campaña con shell estable (la del agente
   tuvo 3 EPERM en `uv_spawn powershell.exe` durante esta pasada) y correr
   la suite Playwright completa + UAT visual/accesibilidad + UAT Objetivos
   + UAT Presupuestos + cleanup explícito.

3. **Considerar cambiar `testDir: ./tests/e2e`** por `./tests` o un glob
   que cubra `tests/e2e/**/*.spec.ts` + `tests/*.spec.ts` (excluyendo
   `categories (1).spec.ts` duplicado). Esto descubriría los 5 specs
   de raíz que la sección 8 del instructivo pide ejecutar.

4. **Bug de Playwright en `deuda-futura/future.spec.ts`**: el `getByText`
   del test se cierra a un element `hidden` (probablemente dentro de un
   `<details>` colapsado). Revisar si el accordion del mes está colapsado
   por default y si la aserción debería expandirlo antes.

5. **Strict mode violations** en `movements-export` y `reports`: ambos
   tests usan `getByText(..., { exact: true })` que matchea 2 elementos
   (probablemente uno en `movement-row-*` y otro en `movement-card-*`).
   Sugerir usar `.first()` o filtrar por testId específico.

6. **dashboard-alerts timeout**: la página o el botón "Clasificar
   movimientos" no aparece en 30s. Probable: el banner de drilldown no se
   renderiza cuando la alerta se dispara. Investigar el rendering del
   alert en dashboard.
