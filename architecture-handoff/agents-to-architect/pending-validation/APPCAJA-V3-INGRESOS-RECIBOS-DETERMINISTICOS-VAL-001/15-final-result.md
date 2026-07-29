# Resultado

## Veredicto
FAIL

## Revisión probada
- Rama: `main` (NO `feat/ingresos`)
- HEAD: `ed241aa412e49b57ab5e5432b1a161a3418b01bb`
- origin/feat/ingresos: NO EXISTE (rama fusionada a main via PR #2)
- Baseline e75d6466de9819f0d0e7a2e1a8eac8ec2a8f3090 presente como ancestro: sí
- Worktree inicial limpio: sí

## Entorno
- SO: Windows (PowerShell 5.1)
- Node: v24.18.0
- npm: 11.16.0
- Ruta de node.exe: I:\Tools\node-v24.18.0-win-x64\node.exe

## Gates
- B1 backend build: FAIL
- B2 parser contracts: FAIL
- B3 generic layout parser: PASS
- B4 deterministic import service: PASS
- B5 AI cutover guard: PASS
- B6 salary receipts integration: FAIL
- B7 backend combined: FAIL
- F1 frontend typecheck: PASS
- F2 frontend build: PASS
- Static inspection: PASS
- E2E: NOT RUN

## Primer fallo reproducible
- Gate: B1 (backend build) y B2 (parser contracts)
- Comando: `npm run build` y `npx vitest run --no-file-parallelism src/modules/salary-receipts/salary-receipt-parser.test.ts`
- Exit code: 1
- Archivo o módulo implicado:
  - B1: `salary-receipt-deterministic-cutover.test.ts` (líneas 11-12, error TS1470: import.meta en CommonJS)
  - B2: `salary-receipt-parser.test.ts` (línea 46, test `normalizes line endings`)
- Error textual:
  - B1: `error TS1470: The 'import.meta' meta-property is not allowed in files which will build into CommonJS output.`
  - B2: `expected 'HABER REMUNERATIVO\n\n DESCUENTO 100,…' to be ' HABER REMUNERATIVO\n\n DESCUENTO 100,…'` (falta espacio inicial)

## Otros fallos

### B6 - salary-receipts integration
- Comando: `npx vitest run --no-file-parallelism tests/salary-receipts/salary-receipts.test.ts`
- Error: `TypeError: (0 , normalizeSalaryReceiptModelResponse) is not a function`
- Causa: El test importa `normalizeSalaryReceiptModelResponse` que no existe o no se exporta correctamente

### Materialización
- Archivo `workspace/tests/salary-receipts/salary-receipts.test.ts` no existe
- El archivo real está en `workspace/backend/tests/salary-receipts/salary-receipts.test.ts`

### Revisión Git
- Rama actual es `main`, no `feat/ingresos` como requiere la instrucción
- `origin/feat/ingresos` no existe (rama fue fusionada)

## Cambios realizados por el agente
- Evidencia únicamente: sí (15 archivos en `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-INGRESOS-RECIBOS-DETERMINISTICOS-VAL-001/`)
- Código modificado: no
- Tests modificados: no
- Configuración modificada: no

## Limitación funcional pendiente
No se realizó aceptación funcional del usuario ni validación contra un recibo real anonimizado.
