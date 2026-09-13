# Defectos Conocidos v1.0.5

## 1. Archivo canónico faltante: `src/lib/finance/global-search-api.ts`
- Severidad: Bloqueante
- Impacto: Frontend typecheck, lint y build fallan; headless no puede arrancar; smoke, IA, Playwright no se ejecutan.
- Evidencia: `12-frontend-typecheck.log`, `14-frontend-build.log`, `15-headless-start.json`.
- Detalle: `global-search-dialog.tsx` importa `@/lib/finance/global-search-api` (línea 31), pero el archivo no existe en el workspace ni en la carpeta de recuperación `APPCAJA-V3-v1.0.5-CANONICAL-RECOVERY`.
- Nota: No se reconstruyó código manualmente conforme al alcance.

## 2. Error de lint en `src/components/finance/charts/category-donut.tsx`
- Severidad: Bloqueante
- Impacto: `npm run lint` retorna exit code 1.
- Evidencia: `13-frontend-lint.log`.
- Detalle: Línea 104 - reasignación de `cumulativeShare` dentro de renderizado, regla `react-hooks/immutability`.

## 3. Parámetros implícitamente `any` en `global-search-dialog.tsx`
- Severidad: Bloqueante (derivado del defecto 1)
- Impacto: Contribuye a los errores de typecheck/build.
- Evidencia: `12-frontend-typecheck.log`.
- Detalle: Líneas 97 y 134 - parámetros `next` e `item` con tipo `any` implícito.

## 4. Suite de validación de extremo a extremo no ejecutada
- Severidad: Bloqueante (derivado de los defectos anteriores)
- Impacto: Smoke API, proveedor IA, asesor IA, Playwright y responsive/accesibilidad no pudieron correr.
- Evidencia: `17-smoke-api.md`, `18-ai-provider.md`, `19-ai-advisor.md`, `20-playwright.log`, `21-playwright-summary.md`, `22-responsive-accessibility.md`.

## Recomendaciones
- Asegurar que el archivo `src/lib/finance/global-search-api.ts` esté incluido en la fuente canónica y se materialice en el workspace.
- Corregir el error de mutación en `category-donut.tsx` (usar state o reducir el acumulado fuera del render).
- Reemitir campaña v1.0.6 con todos los archivos canónicos completos y revalidar.
