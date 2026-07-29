# R2.1 — TECHNICAL PATCH

## Backend

Portar sin cambios adicionales y verificar hashes:

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/src/shared/errors.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`

Revalidar focal 32/32, suite 175/175 y build.

## Corrección mobile

Archivos autorizados:

- `workspace/frontend/tests/ai-advisor.spec.ts`
- `workspace/frontend/tests/month-close.spec.ts`
- `workspace/frontend/tests/e2e/ai-stability-fixture.ts` opcional
- `workspace/frontend/src/components/finance/layout/app-shell.tsx`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- `workspace/frontend/src/components/finance/layout/header.tsx`
- `workspace/frontend/src/components/finance/sections/section-router.tsx`

Agregar identificadores estables equivalentes a:

- `finance-desktop-navigation`
- `finance-mobile-navigation`
- `finance-nav-item-<sectionId>`
- `data-section-id=<sectionId>`
- `aria-current=page` para el item activo.

Usar el ID real del modelo de navegación para Asesor IA y registrarlo en evidencia.

El item visible del drawer mobile debe actualizar la sección activa exactamente una vez, cerrar el drawer y conservar la sección seleccionada. Si el producto ya cumple, modificar sólo el test. Si no cumple, corregir el layout mínimo.

El test mobile debe:

1. fijar viewport 390x844;
2. navegar a `/` y esperar un elemento estable del shell;
3. abrir `Abrir menú`;
4. localizar `finance-mobile-navigation` visible;
5. localizar dentro de ese contenedor el item estable de Asesor IA;
6. hacer click;
7. verificar drawer oculto;
8. verificar `ai-advisor-section` visible;
9. ejecutar las aserciones funcionales.

Prohibido usar búsqueda global por texto `Asesor IA`, `.first()`, `.last()`, `nth()`, sleeps, retries o timeouts mayores.

## Cleanup

Usar `APIRequestContext` independiente. Limpiar únicamente IDs creados por el test. Un error de cleanup debe registrarse como secundario y no reemplazar el error UI principal.

## Python

No excluir tests PDF. Preparar venv físico en staging desde los requisitos existentes. Verificar ejecutable, versión, imports y fixtures. Entregar `PYTHON-RUNTIME-PREFLIGHT.json`.

## Runner

- frontend `http://127.0.0.1:11437`
- backend `http://127.0.0.1:11436`
- Ollama `http://127.0.0.1:11434`
- Chromium
- workers=1
- retries=0

Procesos desacoplados con PID, health checks, exit codes y liberación de puertos.

## Gates

- API real nueva 5/5.
- AI focal Run 1: 2/2.
- AI focal Run 2 consecutivo: 2/2.
- 422 visible, retry manual y una request por submit.
- month-close seguido de AI: 4/4.
- frontend typecheck, lint y build.
- baseline y candidate completos con DB y entorno equivalentes.
- `candidateNewFailures=0`.
- `baselinePassedCandidateFailed=0`.

Fallos comunes sólo pueden ir a `PREEXISTING-E2E-DEBT.json` si coinciden en test, aserción y causa y son ajenos al cambio.

## Promoción

Si la corrección es test-only, no promover layout. Si existe defecto real del drawer, promover únicamente los archivos layout mínimos.

Después de promoción ejecutar sobre canonical: backend build, focal 32/32, frontend typecheck/build, API 2/2, focal UI 2/2 y smoke mobile. Confirmar packages intactos, SQLite restaurada y puertos libres.