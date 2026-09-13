# 06 — Verificación SHA-256 del inventario de 23 archivos

Hashes de referencia tomados literalmente de `APPCAJA-V3-P5-FINAL-VERTICALS-SOURCE-AND-MATERIALIZATION-v1.3.0.md`
§11 (21 archivos) y de `APPCAJA-V3-P5-FOCAL-VALIDATION-v1.3.1.md` §1 (2 archivos corregidos: los specs de
month-close y backup-restore, sustituyendo sus filas del manifiesto v1.3.0 tal como exige el addendum). Cálculo
real con `hashlib.sha256` (Python 3.14.6) sobre los archivos en disco, sin modificarlos.

**Nota sobre un chequeo previo de formato**: durante este trabajo se sospechó que algunos hashes citados en el
documento fuente podrían tener 65 caracteres hex en vez de 64 (posible error de transcripción). Se verificó
programáticamente la longitud de las 23 cadenas hex citadas en el documento fuente: **las 23 tienen exactamente 64
caracteres**. Esa sospecha inicial fue un error de lectura propio, no un defecto del documento. Queda descartada.

## Tabla de verificación

| # | Archivo | Bytes esperado/actual | SHA-256 esperado/actual | Resultado |
|---|---|---|---|---|
| 01 | `workspace/backend/prisma/migrations/20260716233000_add_month_close/migration.sql` | 1296 / 1296 | `d916d8c7...b57326` / igual | **OK** |
| 02 | `workspace/backend/prisma/migrations/20260717001000_add_backup_restore/migration.sql` | 1302 / 1302 | `3cde5605...f639b` / igual | **OK** |
| 03 | `workspace/backend/prisma/schema.prisma` | 21697 / **22678** | `95245695...273e8` / **10258292b5858af6af6be50ab78dfe081cc821144d9fc9c9e8c2316c044b96ba** | **MISMATCH** |
| 04 | `workspace/backend/src/app.ts` | 3934 / 3934 | `3e702e89...df4ad` / igual | **OK** |
| 05 | `workspace/backend/src/modules/backup-restore/backup-restore.controller.ts` | 2140 / 2140 | `c3154e65...e1ceb` / igual | **OK** |
| 06 | `workspace/backend/src/modules/backup-restore/backup-restore.routes.ts` | 288 / 288 | `95cdc149...e2458` / igual | **OK** |
| 07 | `workspace/backend/src/modules/backup-restore/backup-restore.schemas.ts` | 266 / 266 | `33c65fa5...d4426` / igual | **OK** |
| 08 | `workspace/backend/src/modules/backup-restore/backup-restore.service.ts` | 23700 / **23697** | `8a096a55...b7f4db` / **526b47c130e912e162f9172b2464cab6a3bee42ab719305f9bb3c445c54a303b** | **MISMATCH** |
| 09 | `workspace/backend/src/modules/month-close/month-close.controller.ts` | 1394 / 1394 | `18c1f758...cfeaec` / igual | **OK** |
| 10 | `workspace/backend/src/modules/month-close/month-close.routes.ts` | 273 / 273 | `161be9e9...5d6de5` / igual | **OK** |
| 11 | `workspace/backend/src/modules/month-close/month-close.schemas.ts` | 747 / 747 | `b37866a3...674a3f0` / igual | **OK** |
| 12 | `workspace/backend/src/modules/month-close/month-close.service.ts` | 13784 / 13784 | `43c73d4b...9419f9` / igual | **OK** |
| 13 | `workspace/backend/tests/backup-restore/backup-restore.test.ts` | 1547 / 1547 | `77e384ce...9c0d6` / igual | **OK** |
| 14 | `workspace/backend/tests/month-close/month-close.test.ts` | 2201 / 2201 | `60d83d4e...82ac2` / igual | **OK** |
| 15 | `workspace/frontend/src/components/finance/sections/cierres-section.tsx` | 11577 / **11834** | `5e600c23...95ebf` / **bb2d33eced05ad9781799aacef3fcdd17b1de5a113c96ae7ac848b4587656210** | **MISMATCH** |
| 16 | `workspace/frontend/src/components/finance/sections/respaldo-section.tsx` | 12245 / **12485** | `2c1d5ff8...e0036` / **2574b181430b76a329a72bff040468932eb26279835b941629a29cfc26117da9** | **MISMATCH** |
| 17 | `workspace/frontend/src/components/finance/sections/section-router.tsx` | 2426 / 2426 | `30da5653...5ea497` / igual | **OK** |
| 18 | `workspace/frontend/src/lib/finance/backup-restore-api.ts` | 3241 / 3241 | `670f63b6...93aa7` / igual | **OK** |
| 19 | `workspace/frontend/src/lib/finance/month-close-api.ts` | 3281 / 3281 | `61210e37...45ae` / igual | **OK** |
| 20 | `workspace/frontend/src/lib/finance/nav.ts` | 2585 / **2589** | `81d991fb...72a5376` / **416012c53617ec9f885005491d3d4b8e2242c9e4a37f8bc58cb362012ba55a68** | **MISMATCH** |
| 21 | `workspace/frontend/src/lib/finance/ui-store.ts` | 4935 / 4935 | `e1ddb199...ca568f` / igual | **OK** |
| 22 | `workspace/frontend/tests/backup-restore.spec.ts` (corregido v1.3.1) | 4505 / 4505 | `f549d848...11d06953` / igual | **OK** |
| 23 | `workspace/frontend/tests/month-close.spec.ts` (corregido v1.3.1) | 4378 / 4378 | `6201bb17...c36387` / igual | **OK** |

**18/23 OK. 5/23 MISMATCH: #03 schema.prisma, #08 backup-restore.service.ts, #15 cierres-section.tsx,
#16 respaldo-section.tsx, #20 nav.ts.**

## Datos adicionales sobre los 5 archivos con mismatch (hechos observados, sin interpretación de causa)

Se registran las fechas de última modificación (`mtime`) en disco de los 5 archivos, por ser un dato objetivo
relevante para que el arquitecto determine el origen del desvío:

| Archivo | mtime en disco |
|---|---|
| `schema.prisma` | 2026-07-17 16:51:41 |
| `backup-restore.service.ts` | 2026-07-17 16:36:53 |
| `nav.ts` | 2026-07-17 16:39:16 |
| `cierres-section.tsx` | 2026-09-08 23:46:28 |
| `respaldo-section.tsx` | 2026-09-08 23:47:02 |

Los tres primeros no han sido modificados desde el 17 de julio de 2026 según su `mtime` — es decir, ninguna
escritura les ha ocurrido desde esa fecha, muy anterior a la fecha de esta campaña (09/09/2026) y a la fecha en
que el addendum v1.3.1 §0 afirma que "los 21 archivos restantes... ya están materializados... (confirmado hash por
hash sobre disco el 09/09/2026)". Los otros dos tienen `mtime` del 8 de septiembre de 2026, un día antes de esta
evidencia. En ningún caso este agente escribió, editó o tocó estos archivos — se limitó a leerlos con `Read`/hash.
No se investigó más allá de estos hechos objetivos (mtime, bytes, hash) por estar fuera del alcance de este agente
(sólo evidencia, no diagnóstico ni remediación).

**Verdict global de este archivo de evidencia: FAIL** (5 de 23 hashes no coinciden con el manifiesto vigente).
