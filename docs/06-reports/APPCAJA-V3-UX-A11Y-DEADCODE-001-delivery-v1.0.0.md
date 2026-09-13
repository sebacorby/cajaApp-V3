# APPCAJA-V3-UX-A11Y-DEADCODE-001 Delivery Report

## Estado
PASS

## Alcance
Fase A del plan de mejoras UX/UI (auditoría solicitada por el usuario). Correcciones de bajo riesgo: contraste dark-mode, código muerto, duplicados, accesibilidad puntual y tokenización de un badge de estado. Sin cambios de comportamiento funcional, sin tocar backend, sin tocar migraciones ni contratos.

## Root del frontend
`I:\cajaApp-V3\workspace\frontend`

## Archivos eliminados (código muerto confirmado, cero imports externos)

```
src/components/finance/dashboard/metric-card.tsx
src/components/finance/dashboard/section-card.tsx
src/components/finance/dashboard/savings-budget-card.tsx
src/components/finance/dashboard/budget-progress.tsx
src/components/finance/dashboard/smart-alerts.tsx
src/components/finance/dashboard/ui-states.tsx
src/components/finance/dashboard/balance-hero.tsx
src/components/finance/dashboard/health-gauge.tsx
src/components/finance/charts/progress-ring.tsx
src/lib/finance/format.ts
src/lib/finance/types.ts
```

Verificación previa a cada borrado: `grep` de referencias en `src/` y `tests/` confirmando cero imports vivos fuera del propio clúster muerto. Origen probable: remanente del prototipo inicial (`prototype/prototype-AppCaja-v3.tar`) nunca limpiado tras construir las versiones reales de `MetricCard`/`SummaryCard` dentro de cada sección.

## Archivo duplicado eliminado

```
src/lib/finance/global-search-api (1).ts
```

Confirmado por diff que era distinto del archivo canónico `global-search-api.ts`, y que solo este último se importa desde `global-search-dialog.tsx`.

## Correcciones de accesibilidad

- `tarjetas-section.tsx`: botón "Eliminar compra manual" usaba `title` en lugar de `aria-label`. Corregido a `aria-label="Eliminar compra manual"`.

## Consistencia de diseño

- `tarjetas-section.tsx`: `statementStatusTone()` usaba `slate-200/100/600` (colores Tailwind crudos) para el estado "archivado", rompiendo con el resto de la app que usa tokens semánticos. Reemplazado por `border-border bg-muted text-muted-foreground`.

## Fix de contraste dark-mode

Se auditaron todos los usos de `emerald-*`, `rose-*`, `amber-*`, `blue-*` en `src/components/finance` que carecían de variante `dark:`, siguiendo el mismo patrón ya usado consistentemente en el resto del código (`bg-emerald-50 dark:bg-emerald-950/30`, `text-emerald-700 dark:text-emerald-400`, etc.). Se agregó `dark:` a los casos que representaban texto/fondo semántico (estados, badges, mensajes de error/éxito) en los siguientes archivos:

```
src/components/finance/sections/dashboard-section.tsx
src/components/finance/transactions/transactions-list.tsx
src/components/finance/sections/deuda-futura-section.tsx
src/components/finance/sections/movimientos-section.tsx
src/components/finance/sections/presupuestos-section.tsx
src/components/finance/categories/category-management-sheet.tsx
src/components/finance/sections/salud-financiera-section.tsx
src/components/finance/sections/asesor-ia-section.tsx
src/components/finance/imports/debit-csv-import-sheet.tsx
src/components/finance/sections/cierres-section.tsx
src/components/finance/sections/respaldo-section.tsx
src/components/finance/charts/monthly-evolution-chart.tsx
src/components/finance/layout/sidebar-data-quality.tsx
src/components/finance/sections/tarjetas-section.tsx
```

No se tocaron colores sólidos usados como acento decorativo (dots, barras de progreso, botones con `text-white` encima) porque esos no dependen del tema para mantener contraste.

## Validación ejecutada

- `npm run typecheck` → PASS, sin errores.
- `npm run lint` → 1 error y 3 warnings preexistentes, no introducidos por esta entrega:
  - Error `react-hooks/use-memo` en `conciliacion-section.tsx:235` — archivo no tocado en esta entrega.
  - 3 warnings `@typescript-eslint/no-unused-expressions` en `alert-center.tsx:82`, `sidebar-data-quality.tsx:56`, `salud-financiera-section.tsx:276` — corresponden a líneas de lógica (`manual ? setX(true) : setY(true)`) no modificadas por esta entrega; solo se editaron literales de clases CSS en JSX de esos mismos archivos.
- `npm run build` → SUCCESS. Compilación Turbopack, TypeScript y generación estática de página (`/`) sin errores.

## Known issues

- Deuda de lint preexistente documentada arriba, ya registrada previamente en el SSOT como no bloqueante.
- No se ejecutó Playwright en esta entrega (no hubo cambios de comportamiento, `data-testid` preservados en todos los archivos editados).

## Definition of Done

- [x] Código muerto confirmado por grep y eliminado.
- [x] Duplicado de `global-search-api` eliminado.
- [x] Accesibilidad: `title` → `aria-label` en botón de eliminar compra manual.
- [x] Badge de estado "archivado" migrado a tokens de diseño.
- [x] Contraste dark-mode corregido en colores semánticos de estado sin variante previa.
- [x] `data-testid` preservados en todos los archivos editados (verificado por inspección de cada diff).
- [x] `npm run typecheck` PASS.
- [x] `npm run build` PASS.
- [x] Ningún archivo de backend, Prisma, migraciones o contratos fue modificado.
