# Problemas conocidos detectados

## Bloqueantes (impiden PASS)

1. **Archivos fuente faltantes en backend**
   - `src/modules/movements/categories.service.ts` no existe; existe `src/modules/movements/categories (2).service.ts` con nombre incorrecto.
   - `src/modules/global-search/global-search.routes.ts` (y otros archivos del mdulo) no existen; el directorio `global-search` est vaco.
   - Impacto: el build del backend falla con TS2307; 12 suites de tests fallan; el ecosistema no puede arrancar.

2. **Componentes frontend faltantes**
   - `src/components/finance/search/global-search-dialog.tsx` no existe; el directorio `search` est vaco.
   - `src/components/finance/search/search-target-banner.tsx` no existe.
   - Impacto: `typecheck` frontend falla; el frontend no puede construirse.

3. **Migracin `20260711234500_add_category_rules` vaca**
   - El directorio de migracin existe pero no contiene `migration.sql`.
   - `prisma migrate status` falla con P3015.
   - Impacto: aunque `migrate deploy` no necesita aplicar nada, el estado de migraciones no puede verificarse.

4. **Mltiples archivos con BOM UTF-8**
   - Se detectaron 63 archivos con BOM, incluyendo:
     - `src/modules/dashboard/dashboard.service.ts` (confirmado por error de build)
     - `src/modules/ai-advisor/*.ts`
     - `src/modules/financial-health/*.ts`
     - `src/modules/future/*.ts`
     - `src/modules/goals/*.ts`
     - Varios archivos frontend (`src/components/finance/...`, `src/lib/finance/...`, `tests/...`)
     - Varios archivos de migracin (`migration.sql`)
     - `src/app.ts`, `src/config/env.ts`
   - El agente slo est autorizado a remover BOM de `schema.prisma`; no puede corregir el resto.
   - Impacto: riesgo de parseo incorrecto en herramientas sensibles a BOM (como ocurri con `schema.prisma` en campaas anteriores). `dashboard.service.ts` muestra el BOM en el error de build.

## No bloqueantes (documentados)

- Deprecaciones de paquetes npm en backend y frontend.
- 9 vulnerabilidades moderadas preexistentes en frontend.
- Puerto 3000 ocupado por Docker/WSL (el script reparado lo maneja correctamente).
- `start-cajaapp.ps1` existe en root pero no se ejecut segn instrucciones.

## Recomendacin tcnica al arquitecto

La remediacin autorizada en v1.0.4 fue insuficiente. Se requiere una nueva remedicin que:

1. Restaure o genere los archivos cannicos faltantes:
   - `src/modules/movements/categories.service.ts`
   - `src/modules/global-search/global-search.controller.ts`
   - `src/modules/global-search/global-search.routes.ts`
   - `src/modules/global-search/global-search.schemas.ts`
   - `src/modules/global-search/global-search.service.ts`
   - `src/components/finance/search/global-search-dialog.tsx`
   - `src/components/finance/search/search-target-banner.tsx`
   - `src/lib/finance/global-search-api.ts`
2. Renombre o elimine `src/modules/movements/categories (2).service.ts` para que las imports resuelvan al archivo cannico.
3. Restaure el archivo `prisma/migrations/20260711234500_add_category_rules/migration.sql` o elimine la migracin del historial si es seguro hacerlo.
4. Elimine el BOM de todos los archivos fuente, tests, migraciones y configuracin (no solo de `schema.prisma`).
5. Reconstruya `dist` y `.next` despus de corregir los archivos.
6. Revalidar `prisma generate`, `prisma migrate deploy`, `prisma migrate status`, backend build/tests, frontend typecheck/lint/build y el arranque headless antes de intentar Playwright o el proveedor IA.

Una vez corregidos estos puntos, puede emitirse una nueva campaa de validacin.
