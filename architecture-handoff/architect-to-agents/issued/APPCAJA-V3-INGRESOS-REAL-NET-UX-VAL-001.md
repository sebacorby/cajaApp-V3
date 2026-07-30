# APPCAJA V3 — Validación de ingresos reales y rediseño UI

**ID:** `APP-INCOME-REAL-NET-UX-VAL-001`  
**Revisión:** `1.0.1`  
**Fecha:** `2026-07-29`  
**Estado:** `ACTIVA — PREFLIGHT CORREGIDO`  
**Rama obligatoria:** `feat/ingresos`  
**Baseline funcional obligatorio:** `b519471e340529df3b6a6ca06e5acfa354a45d06`  
**E2E:** `PROHIBIDO HASTA NUEVA ORDEN`

## Corrección de la revisión 1.0.1

La revisión anterior exigía que `HEAD` coincidiera exactamente con el commit funcional `b519471...`. Esa condición era incorrecta porque la propia instrucción se versionó en un commit documental posterior.

La condición válida es:

1. `HEAD` local debe coincidir con `origin/feat/ingresos`;
2. el baseline funcional `b519471e340529df3b6a6ca06e5acfa354a45d06` debe ser ancestro de `HEAD`;
3. los commits posteriores al baseline pueden contener documentación, instrucciones o evidencia;
4. el worktree debe estar limpio antes de crear evidencia.

No bloquear la ejecución porque `HEAD` sea posterior al baseline si cumple esas cuatro condiciones.

## Objetivo

Validar tres cambios separados:

1. el neto real aceptado desde recibos FluxIT y NTT Data no vuelve a cero;
2. la presentación financiera prioriza valores reales, separa estimaciones y omite meses sin importes relevantes;
3. la pantalla de Ingresos conserva la paleta actual, presenta una jerarquía visual clara y deja la administración avanzada colapsada por defecto.

El agente no modifica código, tests, configuración ni dependencias. Sólo ejecuta gates y entrega evidencia.

## Preflight

Usar Node exclusivamente desde:

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
git rev-parse origin/feat/ingresos
git status --short
git merge-base --is-ancestor b519471e340529df3b6a6ca06e5acfa354a45d06 HEAD
$LASTEXITCODE
```

Esperado:

- Node `v24.18.0`;
- rama `feat/ingresos`;
- `git rev-parse HEAD` igual a `git rev-parse origin/feat/ingresos`;
- `git merge-base --is-ancestor ... HEAD` con exit code `0`;
- worktree limpio antes de crear evidencia.

Si local y remoto difieren, el agente puede ejecutar únicamente:

```powershell
git pull --ff-only origin feat/ingresos
```

Después debe repetir todo el preflight. No hacer merge, rebase, reset ni checkout destructivo.

## Gates backend

Desde `workspace/backend`:

```powershell
npm run build
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/real-salary-receipt-layouts.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-idempotent-import.test.ts
npx vitest run --no-file-parallelism tests/salary-receipts/salary-receipts.test.ts
```

Validaciones mínimas:

- un preview consolidado con conceptos `information` conserva `grossAmount`, `deductionsAmount` y `netAmount`;
- FluxIT conserva neto `4472530.00`;
- NTT Data conserva neto `5866997.00`;
- reimportar el mismo PDF no produce `409`;
- la aceptación sigue reemplazando por período y actualizando el ingreso.

## Gates frontend

Desde `workspace/frontend`:

```powershell
npm run typecheck
npx vitest run --no-file-parallelism src/lib/finance/income-presentation.test.ts
npm run build
```

Validaciones mínimas:

- la capa de presentación toma el último evento `monthly_override` real;
- ordena fuentes por último período real;
- elimina meses completamente en cero;
- la vista principal importa `income-presentation`;
- la administración previa permanece disponible mediante `ingresos-section.base.tsx`;
- la administración avanzada está dentro de un `<details>` colapsado por defecto;
- la pantalla principal muestra ingreso real del mes, próximo estimado y fuentes activas.

## Inspección estática

Desde el root:

```powershell
Select-String -Path 'workspace/frontend/src/components/finance/sections/ingresos-section.tsx' -Pattern 'incomes-redesigned-section'
Select-String -Path 'workspace/frontend/src/components/finance/sections/ingresos-section.tsx' -Pattern 'Administrar fuentes, importaciones y ajustes'
Select-String -Path 'workspace/frontend/src/components/finance/sections/ingresos-section.tsx' -Pattern 'ingresos-section.base'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts' -Pattern 'Neto en mano'
```

## Evidencia

Crear exclusivamente:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-INGRESOS-REAL-NET-UX-VAL-001/
```

Archivos mínimos:

```text
00-summary.md
01-environment-and-revision.txt
02-backend-build.txt
03-net-preservation.txt
04-real-layouts.txt
05-idempotent-import.txt
06-historical-integration.txt
07-frontend-typecheck.txt
08-income-presentation.txt
09-frontend-build.txt
10-static-inspection.txt
11-e2e-not-run.txt
12-final-result.md
```

Cada archivo debe incluir working directory, comando exacto, fecha/hora, exit code, stdout y stderr completos.

`11-e2e-not-run.txt` debe decir exactamente:

```text
NO SE EJECUTÓ PLAYWRIGHT, CYPRESS NI NINGUNA SUITE E2E.
```

## Veredicto

- `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`: todos los gates PASS.
- `FAIL`: al menos un gate falla de manera reproducible.
- `BLOCKED`: entorno, sincronización, baseline ausente o dependencias impiden ejecutar.

No hacer commit ni push de código. Se permite subir únicamente la evidencia solicitada a `feat/ingresos`. No declarar aceptación funcional final.
