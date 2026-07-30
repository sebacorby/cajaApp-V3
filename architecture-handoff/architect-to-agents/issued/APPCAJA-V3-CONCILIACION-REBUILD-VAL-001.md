# APPCAJA V3 — Validación técnica y funcional de Conciliación

**ID:** `APP-RECONCILIATION-REBUILD-VAL-001`  
**Fecha:** `2026-07-30`  
**Estado:** `ACTIVA`  
**Rama obligatoria:** `feat/conciliacion`  
**Baseline funcional obligatorio:** `42e61b71e1b4d9ba75a628303474319ecc6f6198`  
**E2E automatizado:** `NO EJECUTAR HASTA NUEVA ORDEN`

## 1. Objetivo

Validar que la pestaña Conciliación dejó de depender de la implementación legacy y que ahora:

1. reconstruye automáticamente la detección vigente al entrar;
2. elimina de la bandeja actual los casos cuyos registros ya no existen o ya no coinciden;
3. conserva esos casos únicamente como historia, sin mezclarlos con pendientes;
4. permite abrir cada participante con un destino que incluye sección, tipo e ID del registro;
5. permite decidir qué representación conservar sin borrar la fuente original;
6. actualiza inmediatamente la lista después de guardar una decisión;
7. presenta una interfaz única, más simple y sin el formulario de análisis manual como paso obligatorio.

El agente ejecuta validaciones y entrega evidencia. No modifica código, tests, configuración, dependencias ni datos fuera de los casos de prueba funcional explícitamente autorizados.

## 2. Preflight

Usar exclusivamente:

```text
I:\Tools\node-v24.18.0-win-x64
```

Desde `I:\cajaApp-V3`:

```powershell
$nodeHome = 'I:\Tools\node-v24.18.0-win-x64'
$env:PATH = "$nodeHome;$env:PATH"
node --version
npm --version
git branch --show-current
git rev-parse HEAD
git rev-parse origin/feat/conciliacion
git status --short
git merge-base --is-ancestor 42e61b71e1b4d9ba75a628303474319ecc6f6198 HEAD
$LASTEXITCODE
```

Condiciones:

- Node `v24.18.0`;
- rama `feat/conciliacion`;
- HEAD local igual a `origin/feat/conciliacion`;
- baseline funcional ancestro de HEAD, exit code `0`;
- worktree limpio antes de crear evidencia.

Si local y remoto difieren, se permite únicamente:

```powershell
git pull --ff-only origin feat/conciliacion
```

No hacer merge, rebase, reset ni checkout destructivo.

## 3. Gates backend

Desde `workspace/backend`:

```powershell
npm run build
npx vitest run --no-file-parallelism src/modules/reconciliation/reconciliation-current-detection.test.ts
```

Luego ejecutar las pruebas existentes de conciliación que estén versionadas:

```powershell
npx vitest run --no-file-parallelism tests/reconciliation
```

Si la carpeta no existe, registrar `NOT_PRESENT` y listar con:

```powershell
Get-ChildItem -Recurse -File | Where-Object { $_.Name -match 'reconciliation.*test|reconciliation.*spec' } | Select-Object FullName
```

### Criterios backend

- el servicio activo importa `reconciliation.service.base.ts`;
- un scan exitoso ocurre antes de invalidar casos no redetectados;
- la invalidación usa `lastDetectedAt < scanStartedAt` y no sólo el rango solicitado;
- un fallo del scan no vacía previamente la bandeja vigente;
- cada navegación incluye `recordId`, `recordType`, `module`, `title` y `context`;
- existen destinos para movimientos, resúmenes de tarjeta y fuentes de ingreso.

## 4. Gates frontend

Desde `workspace/frontend`:

```powershell
npm run typecheck
npx vitest run --no-file-parallelism src/components/finance/sections/conciliacion-section.redesign.test.ts
npm run build
```

### Criterios frontend

- `conciliacion-section.tsx` no importa ni renderiza `conciliacion-section.legacy.tsx`;
- al montar la sección se ejecuta `scanReconciliation`;
- el botón principal dice `Sincronizar ahora` y ejecuta scan, no sólo list;
- la vista principal muestra pendientes vigentes, alta confianza y hora de sincronización;
- existe separación entre `Pendientes` e `Historial`;
- cada participante tiene un botón `Abrir...`;
- la navegación usa `navigateToSearchResult` y envía el `recordId` recibido del backend;
- las decisiones disponibles son comprensibles para usuario final;
- después de resolver se recarga la bandeja.

## 5. Inspección estática obligatoria

Desde el root:

```powershell
Select-String -Path 'workspace/frontend/src/components/finance/sections/conciliacion-section.tsx' -Pattern 'conciliacion-section.legacy'
Select-String -Path 'workspace/frontend/src/components/finance/sections/conciliacion-section.tsx' -Pattern 'scanReconciliation\(scanRange\(\)\)'
Select-String -Path 'workspace/frontend/src/components/finance/sections/conciliacion-section.tsx' -Pattern 'navigateToSearchResult'
Select-String -Path 'workspace/backend/src/modules/reconciliation/reconciliation.service.ts' -Pattern 'lastDetectedAt: \{ lt: scanStartedAt \}'
Select-String -Path 'workspace/backend/src/modules/reconciliation/reconciliation.service.ts' -Pattern 'recordType: "movement"|recordType: "card_statement"|recordType: "income_source"'
```

Esperado:

- primera búsqueda: sin coincidencias;
- restantes búsquedas: con coincidencias.

## 6. Validación funcional manual no E2E

Usar únicamente datos locales de prueba o datos que el usuario autorice. No crear scripts Playwright/Cypress.

### F1 — Sincronización al entrar

1. iniciar CajaApp con el procedimiento habitual;
2. abrir Conciliación;
3. confirmar que aparece estado de actualización;
4. confirmar que la hora de última sincronización se completa;
5. confirmar que no es necesario configurar fechas ni presionar un segundo botón para obtener casos.

### F2 — Caso fantasma

1. identificar un caso pendiente cuyo registro de origen pueda eliminarse de forma segura;
2. anotar ID/título de ambos participantes;
3. eliminar uno de los registros desde su módulo real;
4. volver a Conciliación;
5. presionar `Sincronizar ahora` si la sección permaneció montada;
6. confirmar que el caso desaparece de `Pendientes`;
7. confirmar que no vuelve después de recargar la página.

No borrar datos reales importantes. Si no existe un registro seguro para esta prueba, marcar `BLOCKED_TEST_DATA` sin inventar ni alterar producción local.

### F3 — Navegación

Para un caso vigente:

1. abrir el participante A;
2. confirmar cambio a la sección correcta;
3. confirmar que aparece el banner global con título, tipo, contexto e identificador del destino;
4. volver a Conciliación;
5. repetir con participante B;
6. registrar sección e ID recibidos para ambos.

La prueba falla si sólo cambia la pestaña y no aparece ningún contexto del registro seleccionado.

### F4 — Resolución

1. elegir un caso seguro;
2. guardar una decisión acorde a su tipo;
3. confirmar que desaparece inmediatamente de pendientes;
4. confirmar que el movimiento excluido deja de contarse cuando corresponda;
5. confirmar que las fuentes originales continúan existiendo;
6. revisar que el caso quede trazable en historial o como decisión guardada.

## 7. Evidencia

Crear exclusivamente:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-CONCILIACION-REBUILD-VAL-001/
```

Archivos mínimos:

```text
00-summary.md
01-environment-and-revision.txt
02-backend-build.txt
03-current-detection-test.txt
04-existing-reconciliation-tests.txt
05-frontend-typecheck.txt
06-frontend-redesign-test.txt
07-frontend-build.txt
08-static-inspection.txt
09-functional-refresh.txt
10-functional-stale-case.txt
11-functional-navigation.txt
12-functional-resolution.txt
13-e2e-not-run.txt
14-final-result.md
```

Cada archivo debe incluir:

- fecha y hora;
- working directory;
- comando o pasos exactos;
- exit code cuando corresponda;
- stdout y stderr completos;
- resultado observado;
- capturas sólo si no contienen datos sensibles.

`13-e2e-not-run.txt` debe decir exactamente:

```text
NO SE EJECUTÓ PLAYWRIGHT, CYPRESS NI NINGUNA SUITE E2E.
```

## 8. Veredicto

- `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`: todos los gates técnicos pasan y F1–F4 están verificados o claramente documentados.
- `FAIL`: existe un fallo reproducible de código o comportamiento.
- `BLOCKED`: revisión, entorno o datos de prueba impiden continuar.

No hacer commit ni push de código. Se permite subir únicamente la evidencia solicitada a `feat/conciliacion`. La aceptación funcional final corresponde al usuario.
