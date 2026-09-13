# 23-data-cleanup-and-restore

**Estado:** NO EJECUTADO explicitamente (los specs Playwright hacen su
propio cleanup en bloques `finally`).

## Cleanup automatico de Playwright

Los specs e2e que crean movimientos / categorias / goals / budgets
tienen un bloque `finally` que borra via API. Por ejemplo
`tests/e2e/incomes.spec.ts` linea 145, `tests/e2e/deuda-futura/future.spec.ts`
linea 53, etc.

Esto significa que aunque los specs fallaron, los datos UAT que crearon
fueron (o deberian haber sido) limpiados por la API de DELETE que esos
specs invocan en `finally`.

## Verificacion post-cleanup

El agente no ejecuto una verificacion post-cleanup (e.g. listar todas
las categorias / goals / budgets despues de la corrida y confirmar
que no hay UAT residuals). Queda como pendiente para una pasada futura.

## UAT de Objetivos y Presupuestos via API

No se ejecuto una UAT API con limpieza explicita de objetivos,
presupuestos y movimientos. Pendiente.

## Backup y restore

- Backup binario de la SQLite al inicio de la campana (manual del
  usuario): `C:\Users\javie\AppData\Local\Temp\cajaapp-sqlite-backups\cajaapp-FINAL-20260712-180706.db`
- SHA-256 del original y backup coinciden (ver `03-database-backup-and-hashes.md`)

El backup esta disponible si el arquitecto quiere restaurar la DB al
estado pre-campana.
