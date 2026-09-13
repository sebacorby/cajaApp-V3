# 10-backend-suite-matrix

## Resumen de la suite Vitest

Run capturado en `09-backend-tests.log`.

- **Comando:** `npm run test` (vitest run)
- **Inicio:** 2026-07-12 18:07:46 -03:00
- **Fin:** 2026-07-12 18:07:49 -03:00
- **Duracion:** 2.85s
- **Exit code:** **1** (FAIL)

## Totales

| Metrica | Valor |
|---|---|
| Test files total | 24 |
| Test files passed | 23 |
| Test files failed | **1** |
| Tests total | 124 |
| Tests passed | 114 |
| Tests failed | **10** |

## Archivo fallido

`tests/imports/watchdog-timeout.test.ts` — describe `getWorkerHardTimeoutMs`.

### 10 fallos (todos en el mismo archivo, misma causa)

```
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > returns providerTimeoutMs + 30000 by default
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > returns correct value for 420000ms provider timeout
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > returns correct value for 30000ms provider timeout
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > throws for zero provider timeout
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > throws for negative provider timeout
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > throws for non-finite provider timeout
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > throws for negative shutdown grace
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > throws for non-finite shutdown grace
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > accepts zero shutdown grace
FAIL tests/imports/watchdog-timeout.test.ts > getWorkerHardTimeoutMs > accepts custom shutdown grace
```

### Causa raiz (misma en los 10)

```
TypeError: (0, getWorkerHardTimeoutMs) is not a function
```

El test importa `getWorkerHardTimeoutMs` desde el modulo de imports, pero
la funcion no existe (o no se exporta) en el source. Es un bug preexistente
del proyecto, no introducido por esta campana.

## Archivos que SI pasaron (23)

Los 23 archivos de test restantes pasaron limpios, incluyendo las
suites criticas mencionadas en la seccion 6 del instructivo:

- categories (`tests/movements/categories.rules.test.ts` y su duplicado)
- cards (statements, installments, projections, golden fixtures)
- movements
- imports (display-order, pdf-contract, watchdog-timeout **FALLA**)
- incomes
- debit-imports
- smoke (api-smoke)

## Veredicto del gate

**FAIL** — 10 tests fallidos en un archivo, todos por la misma causa
preexistente. Section 6 del instructivo exige "suite completa PASS, sin
tests omitidos o filtrados". No se cumple.
