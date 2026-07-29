# APPCAJA V3 — Revalidación técnica de recibos determinísticos

**ID:** `APP-INCOME-SALARY-RECEIPT-DETERMINISTIC-VAL-002`  
**Fecha:** `2026-07-29`  
**Estado:** `ACTIVA`  
**Rama obligatoria:** `feat/ingresos`  
**Commit exacto a probar:** `09f85adfb7301402291f4849a5e284d31cb2e480`  
**PR asociado:** `#3`  
**E2E:** `PROHIBIDO`

## Objetivo

Reejecutar la validación no E2E después de corregir los tres fallos reportados en `VAL-001`:

1. build CommonJS bloqueado por `import.meta`;
2. expectativa incorrecta de whitespace en `salary-receipt-parser.test.ts`;
3. exportación histórica `normalizeSalaryReceiptModelResponse` ausente.

El agente sólo ejecuta comandos y entrega evidencia. No modifica código, tests, configuración, dependencias ni datos.

## Preflight obligatorio

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
git rev-parse origin/feat/ingresos
git status --short
```

Condiciones obligatorias:

- Node `v24.18.0`;
- rama `feat/ingresos`;
- HEAD local y remoto iguales a `09f85adfb7301402291f4849a5e284d31cb2e480`;
- worktree limpio antes de crear evidencia.

Ante incumplimiento, detener y reportar `BLOCKED` sin hacer pull, merge, rebase, reset ni checkout destructivo.

## Gates backend

Desde `workspace/backend`, ejecutar por separado y registrar stdout, stderr y exit code completos:

```powershell
npm run build
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts
npx vitest run --no-file-parallelism tests/salary-receipts/salary-receipts.test.ts
npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts src/modules/salary-receipts/generic-argentina.salary-receipt.parser.test.ts src/modules/salary-receipts/deterministic-salary-receipt-import.service.test.ts src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts tests/salary-receipts/salary-receipts.test.ts
```

La suite histórica debe confirmar también normalización compatible de importes como:

- `1.234,56`;
- `1,234.56`;
- `$ 1.234,56`.

## Gates frontend

Desde `workspace/frontend`:

```powershell
npm run typecheck
npm run build
```

No borrar `.next` ni aplicar workarounds si Dropbox produce un error de filesystem. Registrar el error exacto.

## Inspección estática

Desde el root:

```powershell
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts' -Pattern 'modules/ai|\.\./ai/'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts' -Pattern 'aiExtractionRun\.create'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts' -Pattern 'aiRunId:\s*null'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-deterministic-cutover.test.ts' -Pattern 'import\.meta'
Select-String -Path 'workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts' -Pattern 'normalizeSalaryReceiptModelResponse'
```

Esperado:

- sin imports IA;
- sin creación de `AiExtractionRun`;
- `aiRunId: null` presente;
- `import.meta` ausente;
- exportación de compatibilidad presente.

## Evidencia

Crear exclusivamente:

```text
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-VAL-002/
```

Archivos mínimos:

```text
00-summary.md
01-environment-and-revision.txt
02-backend-build.txt
03-parser-contracts.txt
04-generic-parser.txt
05-import-service.txt
06-cutover-guard.txt
07-historical-integration.txt
08-backend-combined.txt
09-frontend-typecheck.txt
10-frontend-build.txt
11-static-inspection.txt
12-e2e-not-run.txt
13-final-result.md
```

Cada archivo de comando debe incluir comando exacto, working directory, fecha/hora, exit code, stdout y stderr completos.

`12-e2e-not-run.txt` debe decir exactamente:

```text
NO SE EJECUTÓ PLAYWRIGHT, CYPRESS NI NINGUNA SUITE E2E.
```

## Veredicto permitido

- `PASS_TECNICO_PENDIENTE_ACEPTACION_USUARIO`: todos los gates PASS, inspección PASS y E2E no ejecutado.
- `FAIL`: al menos un gate falla de manera reproducible.
- `BLOCKED`: entorno, revisión o dependencias impiden ejecutar.

No hacer commit ni push. No declarar aceptación funcional. Informar la ruta de evidencia y esperar nuevas instrucciones.
