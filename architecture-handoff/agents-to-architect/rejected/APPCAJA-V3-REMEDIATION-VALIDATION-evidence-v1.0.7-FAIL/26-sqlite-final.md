# 26-sqlite-final.md

SQLite — restauración final

Timestamp: 2026-07-14T22:29:00

## Backup inicial

- Ruta: `I:\cajaApp-V3-real\PRE-v1.0.7-dev.db`
- SHA-256: `1ED5E387BD68AB1779D28803B2AA264A18A6FAAF6FFD35A6083AD4E72535A1D0`

## Restauración

- Destino: `I:\cajaApp-V3-real\workspace\backend\prisma\dev.db`
- SHA-256 después de restaurar: `1ED5E387BD68AB1779D28803B2AA264A18A6FAAF6FFD35A6083AD4E72535A1D0`
- Coincide con backup inicial: SÍ

## Ausencia de datos UAT

- Restauración completa desde backup limpio.
- No se detectan datos UAT persistentes en la base activa.

## Veredicto

**PASS** — SQLite restaurado y hash final idéntico al inicial.
