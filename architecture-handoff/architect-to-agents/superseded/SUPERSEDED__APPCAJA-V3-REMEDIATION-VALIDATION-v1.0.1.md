# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.1

## 1. Objetivo único

Validar desde cero las correcciones aplicadas por el arquitecto en `APP-MVP-REMEDIATION-002` después del rechazo de `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.0`.

Esta tarea es **exclusivamente de validación**. No agrega funcionalidades, no reabre el backlog y no autoriza al agente a modificar código, scripts, tests, configuración, dependencias, lockfiles, Prisma, migraciones ni SQLite para hacer pasar el gate.

El resultado permitido es `PASS`, `FAIL` o `BLOCKED`.

## 2. Repositorio y entorno obligatorio

- Proyecto: CajaApp V3.
- Root absoluto: `I:\cajaApp-V3`.
- Backend: `I:\cajaApp-V3\workspace\backend`.
- Frontend: `I:\cajaApp-V3\workspace\frontend`.
- Script headless autoritativo: `I:\cajaApp-V3\cajaapp-headless-up.ps1`.
- SQLite real: `I:\cajaApp-V3\workspace\backend\prisma\dev.db`.
- Windows x64.
- Node.js exacto: `v24.18.0`.
- Node de referencia: `I:\Tools\node-v24.18.0-win-x64\node.exe`.
- npm de referencia: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`.

Si Node no devuelve exactamente `v24.18.0`, declarar `BLOCKED` y no continuar.

## 3. Fuente de verdad

Leer en modo sólo lectura:

```text
I:\cajaApp-V3\docs\00-context\APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md
```

El documento nativo vigente en Drive continúa siendo la autoridad arquitectónica. El agente no puede editarlo.

## 4. Prohibiciones absolutas

El agente no puede:

- modificar ningún archivo del proyecto;
- crear wrappers, runners, `.bat`, `.cmd`, `.ps1`, `.sh`, scripts Python o JavaScript auxiliares;
- sustituir un script PowerShell por Bash o viceversa;
- usar `start-cajaapp.ps1`, `start-cajaapp.bat`, `smoke.ps1`, `playwright-run.ps1` ni equivalentes;
- iniciar backend o frontend con comandos manuales;
- omitir, filtrar, reescribir, renombrar o deshabilitar tests;
- usar `npm audit fix`, `npm audit fix --force` ni actualizar dependencias;
- reutilizar archivos, logs, capturas o resultados de la evidencia rechazada;
- declarar `PASS` con secciones omitidas, tests skipped o evidencia parcial.

Ante un defecto reproducido, registrar evidencia y declarar `FAIL`. No corregirlo.

## 5. Carpeta única de evidencia

Crear únicamente:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.1
```

No escribir evidencia fuera de esa carpeta, salvo logs y `state.json` generados naturalmente por el script headless dentro de `%TEMP%\cajaapp-headless`.

## 6. Preflight de integridad — obligatorio y bloqueante

Antes de instalar dependencias o arrancar servicios, registrar:

### 6.1 Root

Confirmar que existe:

```text
I:\cajaApp-V3\cajaapp-headless-up.ps1
```

Confirmar que:

- comienza con `[CmdletBinding()]`;
- no comienza con `#!/bin/bash`;
- no contiene un script Bash disfrazado de `.ps1`;
- acepta `-Status`, `-Stop`, `-Restart`, `-Rebuild`, `-SkipMigrate` y `-JsonOnly`;
- contiene resolución explícita de `node.exe`, `npm.cmd`, `cmd.exe` y `taskkill.exe`;
- captura stdout/stderr de procesos externos sin llamar `.Trim()` sobre `$null`.

Confirmar que **no existen en el root**:

```text
cajaapp-headless-up.sh
start-cajaapp-temp.ps1
diag-node.ps1
diag-env.ps1
plan.md
```

`detect-env.sh` es un archivo histórico preexistente y no forma parte de este defecto.

### 6.2 Backend

Confirmar en `workspace\backend\package.json`:

```json
"prisma:migrate:status": "prisma migrate status"
```

Confirmar que bajo `workspace\backend\tests`:

- no existe ningún archivo cuyo nombre contenga `(1)`;
- existe una sola prueba canónica `tests\movements\categories.rules.test.ts`.

### 6.3 Frontend

Confirmar que bajo `workspace\frontend\tests` y `workspace\frontend\tests\e2e`:

- no existe ningún archivo cuyo nombre contenga `(1)`;
- existe una sola prueba canónica `tests\categories.spec.ts`.

Si aparece `tests\categories (1).spec.ts` o cualquier otra copia `(1)`, declarar `FAIL` inmediatamente. No eliminarla.

Guardar el listado recursivo de archivos relevantes y el resultado de cada control.

## 7. Resguardo inicial de SQLite

Antes de cualquier ejecución:

1. Ejecutar únicamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

2. Verificar el backup limpio preexistente:

```text
C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db
```

3. Registrar tamaño y SHA-256 del backup.
4. Registrar tamaño y SHA-256 de `prisma\dev.db`.
5. Restaurar el backup sobre `prisma\dev.db` sólo como parte del procedimiento de validación autorizado.
6. Confirmar igualdad de hash.
7. Crear una copia de resguardo de ese estado limpio para restauración final.

No continuar si la restauración no puede garantizarse.

## 8. Gate backend

Desde `I:\cajaApp-V3\workspace\backend`, ejecutar directamente, sin wrappers:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" ci
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run prisma:generate
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run prisma:migrate:deploy
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run prisma:migrate:status
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run build
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run test
```

Criterios obligatorios:

- todos los comandos con exit code `0`;
- `prisma:migrate:status` existe y reporta esquema actualizado;
- suite completa `PASS`;
- ningún test skipped, filtrado o todo;
- no se ejecutan archivos con `(1)`;
- existe y pasa `tests/imports/ai-job-timeout.test.ts`;
- no existe `tests/imports/watchdog-timeout.test.ts`;
- no aparece `getWorkerHardTimeoutMs is not a function`;
- sin regresiones en importación PDF, polling, estados terminales, persistencia, Dashboard, Reportes, Presupuestos, Objetivos, Movimientos ni Configuración.

## 9. Gate frontend

Desde `I:\cajaApp-V3\workspace\frontend`, ejecutar directamente:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" ci
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run typecheck
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run lint
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" run build
```

Criterios obligatorios:

- todos con exit code `0`;
- cero errores y cero warnings de lint;
- cero errores de `react-hooks/set-state-in-effect`;
- cero errores de `react-hooks/preserve-manual-memoization`;
- no existe `category-management-sheet (1).tsx`;
- no existe ningún spec con `(1)`;
- las 9 vulnerabilidades moderadas se registran como deuda no bloqueante y no se modifica ninguna dependencia.

## 10. Arranque headless autoritativo

Usar exclusivamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -JsonOnly
```

No usar Bash, scripts auxiliares ni comandos manuales para levantar servicios.

Validar:

- exit code `0`;
- stdout contiene JSON válido y limpio;
- `ok` es `true`;
- `node.version` es `v24.18.0`;
- `node.path` apunta al ejecutable requerido;
- backend y frontend informan PID, puerto, URL y logs;
- `state.json` existe y coincide con el JSON emitido;
- `-Status -JsonOnly` devuelve el mismo estado;
- backend health responde `200`;
- frontend responde `200`.

Registrar explícitamente que ya no aparecen:

- error por `.Trim()` sobre `$null`;
- error al resolver o ejecutar `taskkill.exe`;
- error por `npm` no encontrado;
- salida Bash dentro del `.ps1`.

## 11. Smoke API con rutas canónicas

Usar únicamente la URL informada por el script. Registrar método, URL, status y resultado para:

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

Para movimientos manuales usar `occurredOn` con `YYYY-MM-DD`.

## 12. Playwright completo

Desde frontend ejecutar exactamente:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npm.cmd" exec -- playwright test --project=chromium --workers=1 --retries=0 --trace=on
```

No agregar filtros.

Criterios obligatorios:

- exit code `0`;
- cero failed;
- cero skipped;
- discovery incluye specs raíz y `tests/e2e`;
- ningún archivo `(1)` aparece en discovery;
- se cubren Movimientos, Categorías, CSV, Objetivos, Presupuestos, calidad, Ingresos, Tarjetas/PDF, historial, Dashboard/alertas, Deuda futura, exports, Reportes y Configuración;
- importación real usa un PDF byte-distinto y alcanza `preview_ready`;
- camino `failed` detiene polling y muestra `Reintentar`;
- no se ejecuta `card-statement-failed.spec.ts`;
- no hay strict-mode violations ni timeouts terminados manualmente.

## 13. Responsive, accesibilidad y honestidad funcional

Mediante `quality-audit.spec.ts` demostrar:

- nueve secciones navegables en desktop y mobile;
- `aria-current="page"` en desktop;
- menú móvil funcional;
- foco inicial no queda en `BODY`;
- ausencia de login, sesión, contraseña, cuentas bancarias y notificaciones inexistentes;
- ausencia de textos `prototipo demo`, `datos simulados`, `fase posterior`, `fuera del MVP`, `Hello, world!`, `Próximamente`, `En desarrollo` y `Coming soon`;
- Objetivos y Presupuestos son reales;
- tema oscuro persiste.

## 14. Cleanup y restauración final

Al finalizar, incluso ante `FAIL`:

1. Registrar residuales UAT/E2E y período `2099-12`.
2. Detener únicamente con:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

3. Restaurar la copia limpia de SQLite.
4. Confirmar hash final igual al inicial limpio.
5. Ejecutar `-Status -JsonOnly` y demostrar que no queda estado activo.
6. Confirmar que los puertos gestionados están libres y los PIDs informados ya no existen.
7. Eliminar sólo temporales creados por esta campaña.

## 15. Evidencia mínima obligatoria

La carpeta debe contener como mínimo:

- `00-verdict.md` final, no preliminar;
- versión exacta de Node y npm;
- preflight de integridad del root, backend y frontend;
- hashes/restauración inicial y final de SQLite;
- log completo y matriz backend;
- log completo frontend;
- JSON de arranque y status;
- smoke API;
- listado de discovery Playwright;
- log y reporte completos Playwright;
- trazas/capturas relevantes;
- responsive/accesibilidad/honestidad funcional;
- cleanup y procesos/puertos finales;
- lista honesta de pendientes;
- inventario final de archivos de evidencia.

`00-verdict.md` debe usar la fecha real de ejecución en 2026 y declarar exactamente uno de: `PASS`, `FAIL` o `BLOCKED`.

## 16. Regla de aceptación

`PASS` exige todas las secciones completas, sin omisiones, skipped, wrappers, archivos `(1)`, evidencia reutilizada ni modificaciones del agente.

Un `PASS` autoriza al arquitecto a emitir posteriormente `APPCAJA-V3-FINAL-CONSOLIDATED-VALIDATION-v1.0.1`. No activa `APP-UX-PRIVACY-001` y no equivale por sí solo al cierre final.
