# APPCAJA V3 — Instrucción al agente: validación técnica de recibos determinísticos

**ID:** `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-VAL-001`  
**Versión:** `1.0.0`  
**Fecha de emisión:** `2026-07-29`  
**Estado:** `ACTIVA — ÚNICA INSTRUCCIÓN VIGENTE EN issued`  
**Repositorio:** `sebacorby/cajaApp-V3`  
**Rama obligatoria:** `feat/ingresos`  
**Root canónico local:** `I:\cajaApp-V3`  
**Implementación mínima que debe estar contenida en HEAD:** `e75d6466de9819f0d0e7a2e1a8eac8ec2a8f3090`  
**Responsable de implementación y correcciones:** ChatGPT  
**Responsable de ejecución de gates y recolección de evidencia:** agente externo  
**Aceptación funcional final:** usuario

---

## 1. Objetivo exacto

Validar técnicamente el reemplazo del flujo de interpretación IA de recibos de sueldo por extracción PDF local y parsing determinístico.

Esta ejecución debe comprobar, sin modificar código, que:

1. el backend compila;
2. los contratos y utilidades del parser funcionan;
3. el primer layout argentino soportado produce resultados determinísticos;
4. sueldo regular, aguinaldo y vacaciones concilian exactamente en centavos;
5. el orquestador usa el extractor PDF local y falla de forma cerrada;
6. el flujo activo no crea nuevas ejecuciones IA;
7. los nuevos borradores usan `aiRunId = null`;
8. la edición y el recálculo continúan usando importes exactos;
9. los tests existentes de recibos no presentan regresiones;
10. el frontend sigue compilando con `aiRun: null`;
11. no se ejecutó ninguna prueba E2E durante esta validación.

No declarar aceptación funcional. El máximo resultado permitido en esta etapa es `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`.

---

## 2. Fuentes de verdad obligatorias

Leer antes de ejecutar comandos:

- `docs/00-context/APPCAJA-V3-SSOT-CONTINUACION-2026-07-27.md`
- `docs/11-new features/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-PLAN-v1.0.0.md`
- `docs/11-new features/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-VALIDACION-v1.0.0.md`
- esta instrucción.

Orden de precedencia:

1. código actual de `workspace/`;
2. plan del vertical;
3. SSOT vigente;
4. esta orden de validación para la mecánica de ejecución.

Los archivos archivados bajo `architecture-handoff/architect-to-agents/superseded/` son históricos y no gobiernan esta ejecución.

---

## 3. Alcance y autorización limitada

El agente está autorizado únicamente a:

- inspeccionar el repositorio;
- ejecutar los comandos indicados;
- capturar stdout, stderr, exit codes y datos del entorno;
- crear evidencia textual dentro de la carpeta indicada en la sección 11;
- informar fallos reproducibles.

El agente NO está autorizado a:

- modificar código fuente;
- modificar tests;
- modificar schemas Prisma o generar migraciones;
- cambiar `package.json`, lockfiles, configuración o variables de entorno versionadas;
- instalar, actualizar o remover dependencias;
- ejecutar `npm install`, `npm ci`, `npm update` o equivalentes;
- crear wrappers, launchers, scripts auxiliares o archivos temporales dentro de `workspace/`;
- restaurar los archivos `.base.ts` sobre los archivos activos;
- alterar datos reales, borrar la base, resetear Prisma o limpiar documentos cargados;
- hacer commit, push, merge, rebase o reset;
- ejecutar Playwright, Cypress ni ninguna suite E2E;
- usar un proveedor IA, Ollama o APIs compatibles con OpenAI para validar recibos;
- declarar `DONE`, `ACEPTADO` o aceptación funcional.

Si falta una dependencia local o un comando no puede ejecutarse sin instalar paquetes, informar `BLOCKED_ENVIRONMENT` y no instalar nada.

---

## 4. Entorno obligatorio

La única instalación válida de Node para esta ejecución es:

```text
I:\Tools\node-v24.18.0-win-x64
```

Abrir una única sesión PowerShell y ejecutar:

```powershell
$repo = 'I:\cajaApp-V3'
$nodeHome = 'I:\Tools\node-v24.18.0-win-x64'
$env:PATH = "$nodeHome;$env:PATH"
Set-Location $repo
node --version
npm --version
where.exe node
where.exe npm
```

Resultado obligatorio:

```text
node --version = v24.18.0
```

Si la versión no coincide exactamente, detener todos los gates y reportar `BLOCKED_NODE_VERSION`.

No agregar checks de versión al proyecto.

---

## 5. Preflight Git obligatorio

Ejecutar y guardar la salida completa:

```powershell
git branch --show-current
git rev-parse HEAD
git rev-parse origin/feat/ingresos
git status --short
git merge-base --is-ancestor e75d6466de9819f0d0e7a2e1a8eac8ec2a8f3090 HEAD
$LASTEXITCODE
```

Criterios:

- rama actual: `feat/ingresos`;
- HEAD local igual a `origin/feat/ingresos`;
- `e75d6466de9819f0d0e7a2e1a8eac8ec2a8f3090` debe ser ancestro de HEAD; el comando debe devolver exit code `0`;
- worktree limpio antes de crear evidencia.

Si la rama, HEAD o worktree no cumplen:

- no hacer checkout destructivo;
- no ejecutar `reset --hard`;
- no hacer pull/rebase/merge;
- reportar `BLOCKED_REVISION_OR_WORKTREE` con la salida exacta.

---

## 6. Inspección de materialización

Confirmar con `Test-Path` la existencia de todos estos archivos:

```text
workspace/backend/src/modules/salary-receipts/salary-receipt-parser.types.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-parser.errors.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-parser.utils.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-parser.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-parsers.ts
workspace/backend/src/modules/salary-receipts/generic-argentina.salary-receipt.parser.ts
workspace/backend/src/modules/salary-receipts/deterministic-salary-receipt-import.service.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.base.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.service.base.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-parser.test.ts
workspace/backend/src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts
workspace/backend/src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts
workspace/backend/tests/salary-receipts/salary-receipts.test.ts
```

Ejemplo de comando por archivo:

```powershell
Test-Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-parser.types.ts'
```

Si falta cualquiera, reportar `BLOCKED_MATERIALIZATION` y enumerar todos los faltantes. No reconstruir archivos.

---

## 7. Reglas de ejecución de gates

- Ejecutar cada gate como comando independiente.
- Registrar hora de inicio y fin, comando exacto, exit code, stdout y stderr.
- No ocultar warnings.
- No truncar stack traces.
- No corregir el primer fallo encontrado.
- Siempre que el entorno lo permita, continuar con los demás gates no E2E para obtener un diagnóstico completo.
- Si un comando deja procesos activos, registrarlos; no crear scripts para administrarlos.
- No iniciar backend, frontend, Ollama ni servicios externos para estos gates.
- No usar un PDF real con datos personales en esta etapa.

---

## 8. Gates backend obligatorios

### Gate B1 — build TypeScript

```powershell
Set-Location 'I:\cajaApp-V3\workspace\backend'
npm run build
```

PASS sólo con exit code `0`.

### Gate B2 — contratos, registro y utilidades

```powershell
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts
```

Debe cubrir como mínimo:

- importes argentinos a centavos;
- formato desde centavos;
- normalización de texto;
- layout desconocido;
- layout ambiguo.

### Gate B3 — primer layout determinístico

```powershell
npx vitest run --no-file-parallelism src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts
```

Debe demostrar:

- mismo input, mismo preview;
- sueldo regular;
- aguinaldo;
- vacaciones;
- rechazo por campo obligatorio ausente;
- rechazo por diferencia exacta de totales.

### Gate B4 — orquestador de importación

```powershell
npx vitest run --no-file-parallelism src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts
```

Debe cubrir:

- extracción local;
- normalización previa al parser;
- PDF sin texto utilizable;
- líneas monetarias no explicadas;
- preview inválido frente al schema canónico.

### Gate B5 — guarda del corte IA

```powershell
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts
```

Debe confirmar:

- el servicio activo de extracción no importa módulos IA;
- el servicio activo no crea `AiExtractionRun`;
- los nuevos borradores usan `aiRunId: null`;
- el recálculo conserva exactitud monetaria.

### Gate B6 — integración existente de recibos

```powershell
npx vitest run --no-file-parallelism tests/salary-receipts/salary-receipts.test.ts
```

Registrar todos los casos y cualquier dependencia de base de datos o fixture.

### Gate B7 — ejecución combinada focalizada

Ejecutar sólo después de registrar B2 a B6 individualmente:

```powershell
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts tests/salary-receipts/salary-receipts.test.ts
```

Este gate detecta interferencias entre archivos de prueba. No reemplaza la evidencia individual.

---

## 9. Gates frontend obligatorios

No hay rediseño frontend en este corte. La validación comprueba compatibilidad con el contrato actual, especialmente `aiRun: null`.

### Gate F1 — typecheck

```powershell
Set-Location 'I:\cajaApp-V3\workspace\frontend'
npm run typecheck
```

PASS sólo con exit code `0`.

### Gate F2 — build de producción

```powershell
npm run build
```

PASS sólo con exit code `0`.

Si aparece un error de filesystem/Dropbox dentro de `.next`, registrar el error exacto como posible problema de entorno. No borrar `.next`, no pausar Dropbox y no aplicar workarounds sin nueva instrucción.

---

## 10. Inspecciones estáticas obligatorias

Desde el root ejecutar:

```powershell
Set-Location 'I:\cajaApp-V3'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts' -Pattern 'modules/ai|\.\./ai/'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts' -Pattern 'aiExtractionRun\.create'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts' -Pattern 'aiRunId:\s*null'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts' -Pattern 'deterministic://salary-receipts'
git status --short
```

Resultados esperados:

- las dos primeras búsquedas no encuentran coincidencias;
- `aiRunId: null` aparece en el servicio activo;
- `deterministic://salary-receipts` aparece en el servicio activo;
- no existen cambios en código, tests, configuración ni lockfiles.

La evidencia creada por el agente dentro de la carpeta autorizada sí aparecerá en `git status`; enumerarla separadamente.

---

## 11. Evidencia obligatoria

Crear exclusivamente esta carpeta:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-VAL-001/
```

Crear los siguientes archivos, sin secretos ni datos personales:

```text
00-summary.md
01-environment.txt
02-revision-and-worktree.txt
03-required-files.txt
04-backend-build.txt
05-parser-contracts.txt
06-generic-layout-parser.txt
07-deterministic-import-service.txt
08-ai-cutover-guard.txt
09-salary-receipts-integration.txt
10-backend-combined.txt
11-frontend-typecheck.txt
12-frontend-build.txt
13-static-inspection.txt
14-e2e-not-run.txt
15-final-result.md
```

Cada archivo de comando debe contener:

- fecha y hora local;
- working directory;
- comando exacto;
- exit code;
- stdout completo;
- stderr completo;
- duración aproximada;
- observaciones, sin diagnóstico inventado.

`14-e2e-not-run.txt` debe contener una confirmación explícita:

```text
NO SE EJECUTÓ PLAYWRIGHT, CYPRESS NI NINGUNA SUITE E2E.
```

No incluir:

- PDFs reales;
- texto bruto completo de recibos reales;
- nombres, CUIL/CUIT, legajos o domicilios reales;
- `.env`;
- tokens, claves o credenciales;
- bases SQLite;
- `node_modules`;
- `.next`;
- binarios o ZIP.

---

## 12. Formato del resultado final

`15-final-result.md` debe seguir exactamente esta estructura:

```markdown
# Resultado

## Veredicto
PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO | FAIL | BLOCKED

## Revisión probada
- Rama:
- HEAD:
- origin/feat/ingresos:
- Baseline e75d6466 presente como ancestro: sí/no
- Worktree inicial limpio: sí/no

## Entorno
- SO:
- Node:
- npm:
- Ruta de node.exe:

## Gates
- B1 backend build: PASS/FAIL/BLOCKED
- B2 parser contracts: PASS/FAIL/BLOCKED
- B3 generic layout parser: PASS/FAIL/BLOCKED
- B4 deterministic import service: PASS/FAIL/BLOCKED
- B5 AI cutover guard: PASS/FAIL/BLOCKED
- B6 salary receipts integration: PASS/FAIL/BLOCKED
- B7 backend combined: PASS/FAIL/BLOCKED
- F1 frontend typecheck: PASS/FAIL/BLOCKED
- F2 frontend build: PASS/FAIL/BLOCKED
- Static inspection: PASS/FAIL/BLOCKED
- E2E: NOT RUN

## Primer fallo reproducible
- Gate:
- Comando:
- Exit code:
- Archivo o módulo implicado:
- Error textual:

## Otros fallos

## Cambios realizados por el agente
- Evidencia únicamente: sí/no
- Código modificado: debe ser no
- Tests modificados: debe ser no
- Configuración modificada: debe ser no

## Limitación funcional pendiente
No se realizó aceptación funcional del usuario ni validación contra un recibo real anonimizado.
```

---

## 13. Criterios de veredicto

### `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`

Permitido únicamente cuando:

- preflight válido;
- todos los archivos requeridos existen;
- B1 a B7 PASS;
- F1 y F2 PASS;
- inspección estática PASS;
- no se modificó código ni configuración;
- E2E figura `NOT RUN`;
- la evidencia está completa.

### `FAIL`

Usar cuando un gate ejecutado devuelve fallo reproducible del código o tests. Informar el primer fallo y continuar con gates independientes cuando sea posible.

### `BLOCKED`

Usar cuando no se puede ejecutar por entorno, revisión incorrecta, worktree sucio, dependencia ausente o materialización incompleta. No convertir un bloqueo en PASS.

---

## 14. Regla de cierre

Al terminar:

1. no corregir nada;
2. no ejecutar E2E;
3. no hacer commit ni push;
4. entregar la ruta de evidencia;
5. informar el veredicto exacto;
6. ante FAIL, esperar a que ChatGPT escriba la corrección;
7. ante PASS técnico, mantener explícitamente pendiente la aceptación funcional del usuario y la validación con un RAW real anonimizado.
