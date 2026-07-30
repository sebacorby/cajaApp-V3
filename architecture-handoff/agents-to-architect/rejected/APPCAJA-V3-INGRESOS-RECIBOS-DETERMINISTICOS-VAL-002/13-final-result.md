# Resultado VAL-002

## Veredicto
FAIL

## Revisión probada
- Rama: feat/ingresos
- HEAD: 3b379b5a3f63d2916ec014ec0c4f3214abc4719b
- origin/feat/ingresos: 3b379b5a3f63d2916ec014ec0c4f3214abc4719b (sincronizado)
- Baseline 09f85adf ancestro: sí
- Worktree inicial limpio: sí

## Entorno
- SO: Windows
- Node: v24.18.0
- npm: 11.16.0

## Gates
- B1 backend build: PASS
- B2 parser contracts: PASS
- B3 generic parser: PASS
- B4 import service: PASS
- B5 cutover guard: PASS
- B6 historical integration: FAIL
- B7 combined: FAIL
- F1 typecheck: PASS
- F2 build: PASS
- Static inspection: PASS
- E2E: NOT RUN

## Primer fallo reproducible
- Gate: B6 / B7
- Comando: `npx vitest run --no-file-parallelism tests/salary-receipts/salary-receipts.test.ts`
- Exit code: 1
- Archivo: tests/salary-receipts/salary-receipts.test.ts
- Línea: 31
- Test: "normalizes Argentine and international decimal amounts"
- Error: `expected '0.00' to be '1234.56'`
- Causa: `normalizeSalaryAmount("1,234.56")` retorna `"0.00"` en lugar de `"1234.56"`

## Análisis del fallo

El test espera que `normalizeSalaryAmount("1,234.56")` (formato internacional: coma como separador de miles) retorne `"1234.56"`. La función actual retorna `"0.00"`.

Posibles causas:
1. La función no reconoce la coma como separador de miles en formato internacional
2. Conflicto entre formato argentino (`1.234,56`) e internacional (`1,234.56`)

## Cambios realizados por el agente
- Evidencia únicamente: sí (13 archivos en pending-validation/)
- Código modificado: no
- Tests modificados: no
- Configuración modificada: no

## Limitación funcional pendiente
No se realizó aceptación funcional del usuario ni validación contra un recibo real anonimizado.
