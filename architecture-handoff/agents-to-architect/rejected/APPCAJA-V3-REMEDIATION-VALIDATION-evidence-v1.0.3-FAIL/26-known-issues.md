# Problemas conocidos detectados

## Bloqueantes (impiden PASS)

1. **BOM (Byte Order Mark) en `prisma/schema.prisma`**
   - El archivo comienza con bytes `EF BB BF`, lo cual impide que `prisma generate` valide el esquema.
   - Error: `P1012 Error validating: This line is invalid. It does not start with any known Prisma schema keyword.`
   - Impacto: no se genera Prisma Client, no se aplican migraciones, no se ejecutan tests backend, no arranca el ecosistema headless.

2. **Archivos duplicados con sufijo `(1)` en el cdigo fuente**
   - `workspace/backend/tests/movements/categories (1).rules.test.ts` (duplicado ejecutable)
   - `workspace/backend/tests/global-search/global-search (1).service.test.ts`
   - `workspace/backend/src/modules/...` con varios `(1)`
   - `workspace/frontend/tests/categories (1).spec.ts` (duplicado ejecutable)
   - `workspace/frontend/src/components/finance/search/global-search-dialog (1).tsx`
   - `workspace/frontend/src/components/finance/search/search-target-banner (1).tsx`
   - `workspace/frontend/src/lib/finance/global-search-api (1).ts`
   - Impacto: `typecheck` frontend falla porque los imports apuntan a archivos cannicos que no existen o que el compilador resuelve de forma ambigua.

3. **Puerto 3000 ocupado por procesos externos**
   - `com.docker.backend` (PID 28204) y `wslrelay` (PID 33160) escuchan en el puerto 3000.
   - Impacto: el script headless con puertos por defecto no puede arrancar ni detenerse; se requiere usar `-BackendPort/-FrontendPort` con puertos libres. El script ahora detecta correctamente esta situacin y no mata procesos externos.

## No bloqueantes (documentados)

- Deprecaciones de paquetes npm en backend y frontend (no afectan el veredicto).
- 9 vulnerabilidades moderadas preexistentes en frontend (documentadas, no remediadas).
- Residuos de build con `(1)` en `dist/` y `.next/` (sntoma de los duplicados de fuente).
- `start-cajaapp.ps1` existe en root pero no se ejecut segn instrucciones.

## Recomendacin tcnica al arquitecto

Antes de una nueva campaa de validacin, se recomienda:
1. Eliminar el BOM de `workspace/backend/prisma/schema.prisma` (guardar como UTF-8 sin BOM).
2. Eliminar todos los archivos duplicados con sufijo `(1)` en `src/` y `tests/` tanto de backend como frontend, y asegurar que los imports resuelvan a los archivos cannicos.
3. Reconstruir `dist` y `.next` despus de eliminar los duplicados para evitar artefactos residuales.
4. Validar que el script headless pueda arrancar y detenerse con los puertos por defecto (3000) o documentar que Docker/WSL debe liberar el puerto 3000 durante la validacin. Alternativamente, estandarizar el uso de puertos alternativos tanto para el arranque como para la detencin.
5. Revalidar `prisma generate`, `prisma migrate deploy`, `prisma migrate status`, backend tests, frontend typecheck/lint/build y el arranque headless antes de intentar Playwright o el proveedor IA.
