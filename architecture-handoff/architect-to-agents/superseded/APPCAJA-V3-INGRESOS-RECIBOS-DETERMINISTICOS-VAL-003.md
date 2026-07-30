# APPCAJA V3 — Revalidación focalizada de importes en recibos determinísticos

**ID:** `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-VAL-003`  
**Fecha:** `2026-07-29`  
**Estado:** `ACTIVA`  
**Rama obligatoria:** `feat/ingresos`  
**Commit exacto a probar:** se debe usar el HEAD remoto publicado junto con esta instrucción  
**PR asociado:** `#3`  
**E2E:** `PROHIBIDO`

## Objetivo

Revalidar el único fallo residual de `VAL-002`: compatibilidad exacta con importes en formato internacional, sin romper formatos argentinos ni el corte determinístico.

La corrección modifica únicamente la utilidad monetaria compartida y sus pruebas. El agente no debe modificar código, tests, configuración, dependencias ni datos.

## Preflight

Usar exclusivamente Node:

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
```

Condiciones:

- Node `v24.18.0`;
- rama `feat/ingresos`;
- HEAD local igual a `origin/feat/ingresos`;
- worktree limpio antes de crear evidencia.

Ante incumplimiento, reportar `BLOCKED` sin hacer merge, rebase, reset ni checkout destructivo.

## Gates obligatorios

Desde `workspace/backend`, ejecutar por separado:

```powershell
npm run build
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts
npx vitest run --no-file-parallelism tests/salary-receipts/salary-receipts.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts tests/salary-receipts/salary-receipts.test.ts
```

Casos monetarios que deben pasar explícitamente:

```text
1.234,56   -> 123456 centavos
$ 1.234,50 -> 123450 centavos
1234.56    -> 123456 centavos
1,234.56   -> 123456 centavos
USD 1,234.56 -> 123456 centavos
-250,10    -> -25010 centavos
-1,234.56  -> -123456 centavos
```

También deben rechazarse separadores malformados como:

```text
1.23.4,56
1,23,4.56
```

## Confirmación de no regresión

Ejecutar además:

```powershell
Set-Location 'I:\cajaApp-V3\workspace\frontend'
npm run typecheck
npm run build
```

No ejecutar Playwright, Cypress ni ninguna suite E2E.

## Inspección estática

Desde el root:

```powershell
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts' -Pattern 'modules/ai|\.\./ai/'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts' -Pattern 'aiExtractionRun\.create'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts' -Pattern 'aiRunId:\s*null'
```

Esperado:

- sin imports IA;
- sin creación de `AiExtractionRun`;
- `aiRunId: null` presente.

## Evidencia

Crear exclusivamente:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-VAL-003/
```

Archivos mínimos:

```text
00-summary.md
01-environment-and-revision.txt
02-backend-build.txt
03-parser-amounts.txt
04-historical-integration.txt
05-backend-combined.txt
06-frontend-typecheck.txt
07-frontend-build.txt
08-static-inspection.txt
09-e2e-not-run.txt
10-final-result.md
```

Cada archivo debe incluir working directory, comando exacto, fecha/hora, exit code, stdout y stderr completos.

`09-e2e-not-run.txt` debe decir exactamente:

```text
NO SE EJECUTÓ PLAYWRIGHT, CYPRESS NI NINGUNA SUITE E2E.
```

## Veredicto

- `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`: todos los gates PASS.
- `FAIL`: al menos un gate falla de forma reproducible.
- `BLOCKED`: el entorno o la revisión impiden ejecutar.

No hacer commit ni push de código. Se permite subir únicamente la evidencia solicitada a `feat/ingresos`. No declarar aceptación funcional final.
