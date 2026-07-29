# 23-responsive-accessibility.md

Responsive y accesibilidad — resumen

Timestamp: 2026-07-14T22:25:00

## Evaluación

La cobertura de responsive y accesibilidad se ejecutó a través de la suite core de Playwright, principalmente en `quality-audit.spec.ts` y `alert-center.spec.ts`.

### Tests aprobados relacionados

- `quality-audit.spec.ts:29:5` — todas las secciones funcionales navegan sin promesas ficticias (desktop) ✅
- `quality-audit.spec.ts:64:5` — las once secciones están disponibles en navegación móvil ✅
- `quality-audit.spec.ts:88:5` — header y navegación no exponen controles ficticios y aceptan teclado ✅

### Tests fallados relacionados

- `alert-center.spec.ts:18:5` — incluye flujo mobile (viewport 390x844); falla al abrir el panel de alertas (`alert-center-panel` no visible) ❌
- `global-search.spec.ts:14:5` — búsqueda global con teclado y navegación móvil; falla por strict mode violation ❌
- `movements.spec.ts:13:7` — movimientos manuales; falla por strict mode violation en vista responsive ❌
- `sidebar-data-quality.spec.ts:34:5` — sidebar/indicadores; falla por timeout ❌
- `dashboard.spec.ts:32:7` — dashboard real; falla por timeout ❌

## Veredicto

La suite core no aprueba en su totalidad. Los tests específicos de responsive y accesibilidad aprobaron (`quality-audit`), pero otros tests que deben validar interacciones reales en mobile y desktop fallaron. Por lo tanto, este gate se reporta como **FAIL** por dependencia del resultado global de la suite core.
