# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0

## 1. Objetivo único

Validar exclusivamente las remediaciones técnicas aplicadas por el arquitecto después del rechazo de `APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.0`.

Esta tarea no agrega funcionalidades, no reabre el backlog y no autoriza al agente a modificar código. El resultado permitido es `PASS`, `FAIL` o `BLOCKED`.

## 2. Fuente de verdad y entorno

Leer en modo sólo lectura:

```text
I:\cajaApp-V3\docs\00-context\APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md
```

Entorno obligatorio:

- Windows x64.
- Root: `I:\cajaApp-V3`.
- Backend: `I:\cajaApp-V3\workspace\backend`.
- Frontend: `I:\cajaApp-V3\workspace\frontend`.
- Node.js exacto: `v24.18.0`.
- Ejecutable de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`.
- SQLite real: `I:\cajaApp-V3\workspace\backend\prisma\dev.db`.

Si `node --version` no devuelve exactamente `v24.18.0`, declarar `BLOCKED`.

## 3. Prohibiciones

El agente no puede:

- modificar código, tests, configuración, dependencias, lockfiles, Prisma, migraciones o SQLite para hacer pasar la validación;
- editar el SSOT;
- crear wrappers, runners, `.bat`, `.cmd`, `.ps1` o scripts auxiliares;
- usar `launch-up.bat`, `smoke.ps1`, `playwright-run.ps1` ni archivos equivalentes;
- omitir, filtrar, reescribir o deshabilitar tests;
- ejecutar `npm audit fix`, `npm audit fix --force` o actualizar dependencias;
- iniciar backend o frontend mediante comandos manuales;
- reutilizar evidencia de la campaña rechazada;
- declarar `PASS` con pruebas omitidas, skipped o evidencia parcial.

Ante un defecto, registrar evidencia y declarar `FAIL`. No corregirlo.

## 4. Resguardo y restauración de SQLite

Antes de cualquier ejecución:

1. Detener CajaApp únicamente con:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop
```

2. Verificar que existe el backup pre-campaña:

```text
C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db
```

3. Registrar tamaño y SHA-256 del backup.
4. Registrar tamaño y SHA-256 de `prisma\dev.db`.
5. Restaurar el backup sobre `prisma\dev.db`.
6. Confirmar que el hash restaurado coincide con el backup.
7. Crear una copia de resguardo de ese estado limpio para restaurarla nuevamente al final.

No continuar si no puede garantizarse la restauración.

## 5. Arranque autorizado

Para pruebas runtime usar exclusivamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -JsonOnly
```

Esperar entre 30 y 60 segundos y verificar:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Status
```

Usar únicamente las URLs, puertos y PIDs informados por el script.

## 6. Validación backend

Desde `I:\cajaApp-V3\workspace\backend`, ejecutar sin wrappers:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:migrate:status
npm run build
npm run test
```

Criterios obligatorios:

- todos los comandos con exit code `0`;
- suite completa `PASS`;
- ningún test omitido o filtrado;
- existe y pasa `tests/imports/ai-job-timeout.test.ts`;
- no existe ni se ejecuta el test obsoleto `watchdog-timeout.test.ts`;
- el helper `getAiJobTimeoutMs` es usado por el runtime real del worker;
- no aparece `getWorkerHardTimeoutMs is not a function`;
- no hay regresión en importación PDF, polling, estados terminales ni persistencia.

## 7. Validación frontend

Desde `I:\cajaApp-V3\workspace\frontend`, ejecutar sin wrappers:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

Criterios obligatorios:

- typecheck, lint y build con exit code `0`;
- cero errores de `react-hooks/set-state-in-effect`;
- cero errores de `react-hooks/preserve-manual-memoization`;
- no existe la copia duplicada `category-management-sheet (1).tsx`;
- no existen specs duplicados con `(1)` dentro del conjunto ejecutado;
- las 9 vulnerabilidades moderadas del lockfile se registran como deuda no bloqueante y no se modifican dependencias.

## 8. Smoke API con rutas canónicas

Usar el backend iniciado por `cajaapp-headless-up.ps1`. Las fechas deben usar los formatos indicados.

Validar al menos:

```text
GET /api/settings
GET /api/settings/system
GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/movements?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/movements/categories?includeInactive=true
GET /api/movements/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/future-commitments?from=YYYY-MM&months=6
GET /api/card-statements/statements?limit=100&includeArchived=true
GET /api/card-statements/exchange-rate
GET /api/goals
GET /api/budgets
```

Para movimientos manuales, usar `occurredOn` en formato `YYYY-MM-DD`.

No declarar bugs por llamadas construidas con rutas o formatos distintos de los contratos anteriores.

## 9. Playwright completo

Desde el frontend ejecutar exactamente, sin wrappers ni filtros:

```powershell
npx playwright test --project=chromium --workers=1 --retries=0 --trace=on
```

Criterios obligatorios:

- exit code `0`;
- cero failed;
- cero skipped;
- los specs de `tests/` raíz y `tests/e2e/` son descubiertos;
- se ejecutan, como mínimo:
  - movimientos;
  - categorías;
  - importación CSV;
  - Objetivos;
  - Presupuestos;
  - auditoría de calidad;
  - ingresos;
  - Tarjetas/importación PDF;
  - historial de Tarjetas;
  - Dashboard/alertas;
  - Deuda futura;
  - exportación de Movimientos;
  - Reportes;
  - Configuración;
- el happy path de Tarjetas usa el PDF único generado por el spec y llega a `preview_ready`;
- el camino `failed` detiene polling y presenta `Reintentar`;
- no se ejecuta el spec redundante eliminado `card-statement-failed.spec.ts`;
- no hay violaciones de strict mode por duplicación desktop/mobile;
- no hay timeouts manualmente terminados.

## 10. Responsive, accesibilidad y controles honestos

Confirmar mediante `quality-audit.spec.ts` y evidencia Playwright:

- navegación de las nueve secciones en desktop y viewport móvil;
- `aria-current="page"` en navegación desktop;
- menú móvil funcional;
- foco de teclado no queda en `BODY` al comenzar la navegación;
- ausencia de botones o textos de login, sesión, contraseña, cuentas bancarias o notificaciones inexistentes;
- ausencia de `prototipo demo`, `datos simulados`, `fase posterior`, `fuera del MVP`, `Hello, world!`, `Próximamente`, `En desarrollo` y `Coming soon`;
- Objetivos y Presupuestos son secciones reales;
- tema oscuro persiste según `settings.spec.ts`.

## 11. Cleanup y restauración final

Al finalizar, incluso ante `FAIL`:

1. Verificar que los specs limpiaron los datos identificados con `UAT`, `E2E` y el período `2099-12`.
2. Registrar cualquier residual antes de restaurar.
3. Detener el ecosistema únicamente con:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop
```

4. Restaurar la copia limpia creada en la sección 4.
5. Confirmar hash final de `prisma\dev.db`.
6. Confirmar que no quedan procesos ni puertos administrados por el script.
7. Eliminar únicamente temporales creados por esta campaña.

## 12. Evidencia requerida

Crear una única carpeta:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.0
```

Debe contener:

- `00-verdict.md`;
- entorno y versión exacta de Node/npm;
- hashes y restauración inicial/final de SQLite;
- logs completos de backend;
- matriz de suites backend;
- logs completos de frontend;
- listado Playwright de tests descubiertos;
- log completo y reporte Playwright;
- trazas/capturas de los escenarios relevantes;
- smoke API con método, URL, status y resultado;
- auditoría responsive/accesibilidad;
- auditoría de controles ficticios;
- cleanup y restauración;
- integridad de archivos;
- lista honesta de pendientes.

## 13. Regla de aceptación

`PASS` exige que todas las secciones anteriores se completen sin omisiones.

Un `PASS` de esta tarea autoriza al arquitecto a emitir después el gate final consolidado `v1.0.1`. No equivale por sí solo al cierre final de CajaApp V3.
