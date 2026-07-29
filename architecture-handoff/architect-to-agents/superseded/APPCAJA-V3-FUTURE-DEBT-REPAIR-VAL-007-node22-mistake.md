# APPCAJA-V3-FUTURE-DEBT-REPAIR-VAL-007

## Tipo de tarea

**VALIDACIÓN ÚNICAMENTE — PROHIBIDO MODIFICAR CÓDIGO**

El código ya fue escrito por el arquitecto/asistente. El agente no debe corregir, refactorizar, regenerar, reescribir ni completar archivos aunque encuentre un fallo.

Si cualquier gate falla:

1. detener la validación funcional dependiente de ese gate;
2. conservar el estado exacto del repo;
3. recopilar evidencia mínima suficiente;
4. informar FAIL con causa observable;
5. no aplicar fixes.

## Fuente de verdad

Repositorio canónico:

`/Javier Corbella/cajaApp-V3`

SSOT obligatorio:

`docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`

No usar Google Drive.

## Entorno obligatorio

- Windows x64.
- Node.js 22.x. Bloquear si `node --version` no comienza con `v22.`.
- Usar dependencias existentes del workspace.
- No exigir Node 24.
- No crear wrappers, launchers, scripts auxiliares ni utilidades nuevas.
- Usar herramientas nativas existentes del repo.

## Objetivo

Validar exclusivamente la remediación de:

- E1: reparación de `missing_card_reference` histórico sin asignaciones ambiguas;
- E2/E3: integridad y legibilidad de `FutureDebtView.tsx`;
- E4: scopes independientes de selección;
- E5: lifecycle backend/frontend sin detach deliberado;
- E6: integridad `CardInstallmentProjection.rowId -> CardStatementRow.id`;
- E7: ejecución con Node.js 22.x.

No validar ni modificar el prompt de IA, extracción PDF ni otros verticales.

## Preflight

Registrar, sin modificar nada:

`node --version`

`python --version`

`git status --short`

Confirmar existencia de:

- `workspace/backend/src/modules/cards/legacy-projection-rowid-repair.ts`
- `workspace/backend/src/scripts/repair-legacy-projection-rowids.ts`
- `workspace/backend/tests/cards/legacy-projection-rowid-repair.test.ts`
- `workspace/backend/tests/cards/projection-rowid.test.ts`
- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`
- `workspace/frontend/tests/future-debt-selection.spec.ts`
- `start-app.py`
- `start_backend.py`
- `scripts/kill-port.bat`

## Gate 1 — backend build + tests focalizados

Desde el root canónico ejecutar en una sola línea:

`cd workspace\backend && npm run build && npx vitest run --no-file-parallelism tests/cards/legacy-projection-rowid-repair.test.ts tests/cards/projection-rowid.test.ts`

PASS únicamente si:

- TypeScript compila;
- ambos archivos de test terminan PASS;
- no existe error de Prisma/import/runtime;
- el test `projection-rowid` confirma que todas las proyecciones no manuales creadas por el flujo de aceptación apuntan a IDs de filas persistidas.

Si falla, registrar comando, exit code y fragmento de error suficiente. No corregir.

## Gate 2 — frontend typecheck + Playwright focalizado

Desde el root canónico ejecutar:

`cd workspace\frontend && npm run typecheck && npx playwright test tests/future-debt.spec.ts tests/future-debt-selection.spec.ts`

PASS únicamente si:

- typecheck termina exit 0;
- la suite previa `future-debt.spec.ts` sigue pasando;
- `future-debt-selection.spec.ts` demuestra que seleccionar Pendientes no selecciona una fila confirmada;
- seleccionar una card no selecciona filas Pendientes.

No ampliar a una suite completa salvo que sea indispensable para diagnosticar un fallo del propio gate.

## Gate 3 — puertos antes del arranque

Antes de levantar la app registrar listeners:

`netstat -ano | findstr ":11436 :11437"`

Si `11436` o `11437` ya tiene un proceso LISTENING, identificar PID. Si corresponde a una instancia vieja de CajaApp, utilizar exclusivamente la herramienta existente:

`scripts\kill-port.bat 11436`

`scripts\kill-port.bat 11437`

No matar procesos por nombre global ni usar scripts nuevos.

## Gate 4 — arranque canónico

Desde el root:

`python start-app.py`

Registrar en evidencia:

- versión Node aceptada;
- salida de `[legacy-projection-rowid-repair]` con estadísticas completas;
- PID backend;
- PID frontend;
- respuesta del health backend;
- disponibilidad del frontend.

Verificar:

`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:11436/health`

`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:11437`

No declarar PASS si el repair legacy termina con error aunque los servicios logren arrancar por otro mecanismo.

## Gate 5 — verificación E1 con base real

Con la app levantada consultar Deuda Futura usando el flujo/UI existente y registrar:

- cantidad de `missing_card_reference` antes/después del repair si existe evidencia previa comparable;
- estadísticas del repair: `groupsInspected`, `groupsRepaired`, `projectionsRepaired`, `groupsUnresolved`;
- confirmar que grupos reparables con match único ya no aparecen como falsos Pendientes;
- confirmar que `groupsUnresolved` no fueron asignados arbitrariamente a una tarjeta.

No editar SQLite manualmente para forzar PASS.

## Gate 6 — smoke funcional UI

Validar sólo estos comportamientos:

- Deuda Futura renderiza sin error;
- importes y textos financieros principales son legibles;
- `Seleccionar todo` selecciona todas las filas visibles;
- select-all de una tarjeta afecta sólo esa tarjeta;
- select-all de Pendientes afecta sólo Pendientes;
- selección individual sigue funcionando;
- eliminación de una selección válida persiste y refresca la vista.

No realizar rediseños visuales ni cambios CSS.

## Gate 7 — lifecycle Windows / zombie backend

### Cierre controlado

1. Con `python start-app.py` activo, registrar PID de backend/frontend.
2. Cerrar con Ctrl+C.
3. Ejecutar:

`netstat -ano | findstr ":11436 :11437"`

PASS si no queda ningún proceso LISTENING en esos puertos.

### Cierre de ventana/terminal

Repetir el arranque y cerrar la ventana/terminal utilizada para el launcher.

Después, desde otra terminal ejecutar:

`netstat -ano | findstr ":11436 :11437"`

Si queda listener:

- registrar PID;
- registrar `tasklist /FI "PID eq <PID>"`;
- registrar parent/árbol si la herramienta nativa disponible lo permite;
- marcar E5 FAIL;
- no aplicar cambios.

## Resultado final permitido

### PASS TÉCNICO

Sólo si todos los gates técnicos pasan.

Incluso con PASS técnico, informar explícitamente:

`PENDIENTE ACEPTACIÓN FUNCIONAL DEL USUARIO`.

### FAIL

Informar por gate:

- gate;
- comando exacto;
- exit code/resultado;
- síntoma;
- archivo o proceso implicado;
- clasificación tentativa: código / test / entorno / datos;
- evidencia.

No escribir una solución ni modificar código.

## Evidencia

Guardar dentro de:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-FUTURE-DEBT-REPAIR-VAL-007/`

Mínimo:

- `00-summary.md`
- `01-preflight.txt`
- `02-backend-build-tests.txt`
- `03-frontend-typecheck-playwright.txt`
- `04-start-app.txt`
- `05-repair-stats.txt`
- `06-port-lifecycle.txt`
- `07-functional-smoke.md`

No generar ZIP. No duplicar `node_modules`, `.next`, bases de datos ni binarios dentro de evidencia.
