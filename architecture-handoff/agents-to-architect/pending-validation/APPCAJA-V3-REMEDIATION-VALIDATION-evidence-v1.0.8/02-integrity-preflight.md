# 02-integrity-preflight.md

Preflight de integridad — `I:\cajaApp-V3-real`

Timestamp: 2026-07-15T00:05:00

## Roots

- Root operativo: `I:\cajaApp-V3-real` — validado ✅
- Repo canónico: `I:\cajaApp-V3` — existe ✅

## Materialización Fase 8A

- 15 archivos copiados desde `APPCAJA-V3-v1.0.8-CANONICAL-RECOVERY`.
- Todos los hashes coinciden con `MANIFEST-v1.0.8.md`.
- Detalle en `00-remediation.md`.

## Configuración Playwright

- `playwright.config.ts` contiene `CAJAAPP_FRONTEND_BASE_URL`: SÍ ✅
- `baseURL: FRONTEND_BASE_URL`: SÍ ✅
- Sin BOM: SÍ ✅

## Archivos con BOM

- Archivos activos con BOM: 0 ✅

## Archivos con sufijos ambiguos

- Criterio: cero archivos con `(1)`, `(2)`, `copy`, `copia`, `TEMP-` o `~`.
- Encontrados: 0 ✅

## Migración y schema

- `migration.sql` de `20260711234500_add_category_rules` existe y no está vacío: SÍ ✅
- `schema.prisma` comienza con `generator client`: SÍ ✅
- `schema.prisma` sin BOM: SÍ ✅

## Artefactos generados

- Directorios limpios: backend/dist, backend/coverage, frontend/.next, frontend/coverage, frontend/playwright-report, frontend/test-results ✅

## Lockfiles

| Archivo | Hash |
|---------|------|
| backend package.json | 5411DBA21C46E756E9A3274FF9A81FC1A0D214B7BAE175AFC698070F50B55A64 |
| backend package-lock.json | 825D44D6C4E1E59D8F489B33D08F52EE56EE434C8F70003B5CFED2261B458A87 |
| frontend package.json | 7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B |
| frontend package-lock.json | DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED |

Resultado global: **PASS**
