# Matriz de tests backend

## Estado del gate backend

| Comando | Exit code | Resultado |
|---------|-----------|-----------|
| `npm ci` | 0 | PASS |
| `npm run prisma:generate` | 0 | PASS |
| `npm run prisma:migrate:deploy` | 0 | PASS (14 migraciones, ninguna pendiente) |
| `npm run prisma:migrate:status` | 1 | FAIL |
| `npm run build` | 2 | FAIL |
| `npm run test` | 1 | FAIL |

## Detalles

### prisma:generate
Gener Prisma Client correctamente. Schema validado sin errores (BOM removido).

### prisma:migrate:deploy
14 migraciones encontradas. No hay migraciones pendientes por aplicar.

### prisma:migrate:status
Fall con error P3015:

```
Could not find the migration file at migration.sql. Please delete the directory or restore the migration file.
```

La migracin `20260711234500_add_category_rules` qued con el directorio vaco despus de la remedicin de residuos. El archivo cannico `migration.sql` no existe y el archivo duplicado `migration (1).sql` fue eliminado segn instrucciones.

### build
Fall con errores TS2307:

```
src/app.ts(19,36): error TS2307: Cannot find module './modules/global-search/global-search.routes.js' or its corresponding type declarations.
src/modules/dashboard/dashboard.service.ts(2,43): error TS2307: Cannot find module '../movements/categories.service.js' or its corresponding type declarations.
src/modules/debit-imports/debit-imports.service.ts(12,43): error TS2307: Cannot find module '../movements/categories.service.js' or its corresponding type declarations.
src/modules/movements/movements.controller.ts(24,43): error TS2307: Cannot find module './categories.service.js' or its corresponding type declarations.
src/modules/movements/movements.service.ts(4,43): error TS2307: Cannot find module './categories.service.js' or its corresponding type declarations.
```

Causa: los archivos cannicos no existen.
- `src/modules/movements/categories.service.ts` no existe; existe `src/modules/movements/categories (2).service.ts`.
- `src/modules/global-search/global-search.routes.ts` no existe; el directorio `global-search` est vaco (solo `desktop.ini`).

### test
Vitest ejecut 25 suites: 13 passed, 12 failed. Los 12 failed suites fallan por el mismo motivo: no encuentran `categories.service.js` o `global-search.routes.js`. 82 tests individuales pasaron dentro de las suites que no dependen de esos mdulos.

## Cobertura requerida no verificada

A causa de los fallos de build y migrate:status, no se pudo verificar completamente:
- Timeout vigente de IA (`tests/imports/ai-job-timeout.test.ts` pas, pero no toda la suite)
- Reglas deterministas de Dashboard y Alert Center
- Resmenes agregados de Presupuestos y Objetivos
- Precursor de calidad del dato
- Frmula `fh-v1.0.0`, confianza, bloqueos, huella y snapshots
- Asesor IA: simulacin aislada, fuente inexistente, nmero no fundamentado, simulacin no solicitada y lenguaje prescriptivo

Total de tests backend ejecutados: 82 passed, 12 suites failed (test exit 1).

Resultado del gate backend: FAIL.
