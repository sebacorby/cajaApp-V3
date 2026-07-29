# Problemas conocidos detectados

## Bloqueantes (impiden PASS)

1. **Defecto estructural en `cajaapp-headless-up.ps1`**
   - El parmetro `StoppedPids` de `Stop-ProcessesOnPort` es `[System.Collections.Generic.List[int]]` obligatorio, pero `Stop-ExistingRun` lo invoca con una lista vaca.
   - Esto provoca el error: `No se puede enlazar el argumento con el parmetro 'StoppedPids' porque es una coleccin vaca.`
   - Afecta tanto `-Stop` como el arranque normal del script.
   - Impacto: no se puede arrancar ni detener el ecosistema de forma headless.

2. **BOM (Byte Order Mark) en `prisma/schema.prisma`**
   - El archivo comienza con bytes `EF BB BF`, lo cual impide que `prisma generate` valide el esquema.
   - Error: `P1012 Error validating: This line is invalid. It does not start with any known Prisma schema keyword.`
   - Impacto: no se genera Prisma Client, no se aplican migraciones, no se ejecutan tests backend.

3. **Archivos duplicados con sufijo `(1)` en el cdigo fuente**
   - `workspace/backend/tests/movements/categories (1).rules.test.ts` (duplicado ejecutable)
   - `workspace/backend/tests/global-search/global-search (1).service.test.ts`
   - `workspace/backend/src/modules/...` con varios `(1)`
   - `workspace/frontend/tests/categories (1).spec.ts` (duplicado ejecutable)
   - `workspace/frontend/src/components/finance/search/global-search-dialog (1).tsx`
   - `workspace/frontend/src/components/finance/search/search-target-banner (1).tsx`
   - `workspace/frontend/src/lib/finance/global-search-api (1).ts`
   - Impacto: `typecheck` frontend falla porque los imports apuntan a archivos cannicos que no existen o que el compilador resuelve de forma ambigua.

4. **Puerto 3000 ocupado por procesos externos**
   - `com.docker.backend` (PID 28204) y `wslrelay` (PID 33160) escuchan en el puerto 3000.
   - Impacto: incluso si se corrige el script headless, el frontend no puede usar el puerto por defecto sin reconfigurar o detener esos procesos.

## No bloqueantes (documentados)

- Deprecaciones de paquetes npm en backend y frontend (no afectan el veredicto).
- 9 vulnerabilidades moderadas preexistentes en frontend (documentadas, no remediadas).
- Residuos de build con `(1)` en `dist/` y `.next/` (sntoma de los duplicados de fuente).
- `start-cajaapp.ps1` existe en root pero no se ejecut segn instrucciones.

## Recomendacin tcnica al arquitecto

Antes de emitir una nueva campaa de validacin, se recomienda:
1. Corregir el script `cajaapp-headless-up.ps1` para que `Stop-ProcessesOnPort` acepte una coleccin vaca o se pase un valor vlido.
2. Eliminar el BOM de `prisma/schema.prisma` (guardar como UTF-8 sin BOM).
3. Eliminar todos los archivos duplicados con sufijo `(1)` y asegurar que los imports resuelvan a los archivos cannicos.
4. Decidir si el frontend debe usar un puerto diferente a 3000 o documentar que Docker/WSL no deben ocupar el puerto 3000 durante la validacin.
5. Reconstruir `dist` y `.next` despus de eliminar los duplicados para evitar artefactos residuales.
