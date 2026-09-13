# 02-integrity-preflight.md

Preflight de integridad — `I:\cajaApp-V3-real`

Timestamp: 2026-07-14T19:10:37

## 1. Archivos de Fase 6A (remediación v1.0.6)

| Archivo | Existe | Hash actual | Hash esperado | Coincide | BOM |
|---------|--------|-------------|---------------|----------|-----|
| global-search-api.ts | SÍ | BEAD4CFEEEC4B3733BAF2F6EC01749CAAA6D47B8F4456FBE72F043C0332D30DA | 233FEA4649A6D876C1504E5A13757B4077AC6EFA4AC97DDEE867342DC46EE8D5 | NO | NO |
| category-donut.tsx | SÍ | 50F785CC0214F98CD2E6E1DD2A4F0D9DD588187AD8036F01B5BCEF7C5BAEF9DD | 39074CA6A2E14C7D9BA0AB3E884C3B36F56B833034C36F7CE758FF5E01FF7BDA | NO | NO |

Resultado: **FAIL** — los hashes de los archivos canónicos no coinciden con los esperados del documento.

## 2. Archivos recuperados en v1.0.5 (deben continuar presentes)

| Archivo | Existe | Hash actual | Hash esperado (v1.0.5) | Coincide |
|---------|--------|-------------|------------------------|----------|
| backend\src\modules\movements\categories.service.ts | SÍ | 00E3ED2DB1ACED3315FBBF0A5A964FE103B3DEEBE14C47AFA4D372BA6362EC29 | 00E3ED2DB1ACED3315FBBF0A5A964FE103B3DEEBE14C47AFA4D372BA6362EC29 | SÍ |
| backend\src\modules\global-search\global-search.service.ts | SÍ | 71A99FD5A191F66D102BEF039B792F69E30EA940214EF789AF04C8B3D1025B94 | 71A99FD5A191F66D102BEF039B792F69E30EA940214EF789AF04C8B3D1025B94 | SÍ |
| backend\src\modules\global-search\global-search.routes.ts | SÍ | B15C1DFDFEEE7E87079A23C219FC0ED50A63BC103F0B1603A82AC9D51B632EA3 | B15C1DFDFEEE7E87079A23C219FC0ED50A63BC103F0B1603A82AC9D51B632EA3 | SÍ |
| backend\src\modules\global-search\global-search.controller.ts | SÍ | DDF5C7441C7B6E5E0EEE17E6C0CFD2A77DE758588BD98B4B45FE91612A07B24A | DDF5C7441C7B6E5E0EEE17E6C0CFD2A77DE758588BD98B4B45FE91612A07B24A | SÍ |
| backend\src\modules\global-search\global-search.schemas.ts | SÍ | C06449249B364194B7EAA031DF35A25AA8F3B970E8A96CAC061A00433214941F | C06449249B364194B7EAA031DF35A25AA8F3B970E8A96CAC061A00433214941F | SÍ |
| frontend\src\components\finance\search\global-search-dialog.tsx | SÍ | 4C7BD8E4E664F4DF2CF3DDB74EABB8097FD292C3C1D6EC177E4E52FFB0BF8BE1 | 4C7BD8E4E664F4DF2CF3DDB74EABB8097FD292C3C1D6EC177E4E52FFB0BF8BE1 | SÍ |
| frontend\src\components\finance\search\search-target-banner.tsx | SÍ | 85C7528636F2F835FFEE36A6722D9E7A3BE17EEB3A0FEB1885C0F9513EF97E1D | 85C7528636F2F835FFEE36A6722D9E7A3BE17EEB3A0FEB1885C0F9513EF97E1D | SÍ |
| backend\prisma\migrations\20260711234500_add_category_rules\migration.sql | SÍ | 3368E20A3CBFFE8CC36E18FC563C459E6939EE121C653D9AEC7722BE831E28B4 | 3368E20A3CBFFE8CC36E18FC563C459E6939EE121C653D9AEC7722BE831E28B4 | SÍ |

Resultado: **PASS** — 8 archivos presentes con hash exacto.

## 3. migration.sql

- Ruta: `I:\cajaApp-V3-real\workspace\backend\prisma\migrations\20260711234500_add_category_rules\migration.sql`
- Existe: SÍ
- Tamaño: 880 bytes
- No vacío: SÍ

Resultado: **PASS**

## 4. schema.prisma

- Ruta: `I:\cajaApp-V3-real\workspace\backend\prisma\schema.prisma`
- Comienza con `generator client`: SÍ
- Tiene BOM: NO

Resultado: **PASS**

## 5. Archivos con sufijos ambiguos en fuentes/tests/migraciones activas

Criterio: cero archivos con sufijos `(1)`, `(2)`, `copy`, `copia`, `TEMP-` o `~`.

Se encontraron 2 archivos en fuentes activas:

1. `I:\cajaApp-V3-real\workspace\backend\src\modules\reports\TEMP-CajaAppV3_reports_service_currency_fix_v1.ts`
2. `I:\cajaApp-V3-real\workspace\frontend\src\lib\finance\global-search-api (1).ts`

(Nota: `I:\cajaApp-V3-real\workspace\backend\.venv\...\COPYING` está dentro de `.venv` y no se considera fuente activa.)

Resultado: **FAIL**

## 6. Archivos con BOM en alcance autorizado

Criterio: cero archivos con BOM dentro del alcance técnico autorizado de v1.0.5.

Archivos con BOM encontrados: 0

Resultado: **PASS**

## 7. Directorios de artefactos de build/reporte

Criterio: `dist`, `.next`, `coverage`, `playwright-report` y `test-results` deben estar limpios.

Se encontraron directorios no vacíos:

- `I:\cajaApp-V3-real\workspace\backend\dist` — 388 archivos
- `I:\cajaApp-V3-real\workspace\frontend\.next` — 1287 archivos
- `I:\cajaApp-V3-real\workspace\frontend\test-results` — 2437 archivos

Resultado: **FAIL**

## 8. Lockfiles

| Archivo | Hash actual |
|---------|-------------|
| backend\package.json | 5411DBA21C46E756E9A3274FF9A81FC1A0D214B7BAE175AFC698070F50B55A64 |
| backend\package-lock.json | 825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87 |
| frontend\package.json | 7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B |
| frontend\package-lock.json | DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED |

Estado al inicio del preflight: registrados. Se verificarán de nuevo al final.

## Resumen de preflight

- v1.0.6 hash match: **FAIL**
- v1.0.5 files present: **PASS**
- migration.sql: **PASS**
- schema.prisma: **PASS**
- suffixed files: **FAIL**
- BOM scan: **PASS**
- build artifacts cleaned: **FAIL**
- lockfiles: registrados

**Preflight global: FAIL**
