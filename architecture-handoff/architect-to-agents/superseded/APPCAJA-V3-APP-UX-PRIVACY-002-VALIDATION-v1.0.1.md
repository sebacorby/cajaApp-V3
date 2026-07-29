# APP-UX-PRIVACY-002 — Validación focal v1.0.1

Estado: INSTRUCCIÓN ACTIVA / SÓLO VALIDACIÓN.
Fecha: 18 de julio de 2026.
Root único: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.
Entorno obligatorio: Windows x64 y Node.js v24.18.0 exacto.

## Gobierno

La implementación fue realizada por el arquitecto directamente en Dropbox. El agente no modifica código, tests, Prisma, migraciones, dependencias, configuración ni documentación. Ante cualquier fallo entrega FAIL con evidencia y se detiene.

No ejecutar `npm audit fix`, wrappers temporales, copias con sufijos, retries ni skips.

## Alcance implementado

Backend:
- `workspace/backend/src/modules/settings/settings.schemas.ts`
- `workspace/backend/src/modules/settings/settings.service.ts`
- `workspace/backend/tests/settings/settings.test.ts`

Frontend:
- `workspace/frontend/src/lib/finance/settings-api.ts`
- `workspace/frontend/src/lib/finance/amount-privacy.ts`
- `workspace/frontend/src/components/finance/preferences/app-preferences-provider.tsx`
- `workspace/frontend/src/components/finance/sections/configuracion-section.tsx`
- `workspace/frontend/src/lib/finance/financial-amount.ts`
- `workspace/frontend/src/lib/finance/money.ts`
- `workspace/frontend/src/lib/finance/format.ts`
- `workspace/frontend/tests/privacy-mode.spec.ts`

`hideAmounts` ya existe en Prisma. No corresponde migración nueva.

## Contrato a validar

- GET `/api/settings` devuelve `hideAmounts` booleano.
- PUT `/api/settings` persiste booleanos y rechaza strings u otros tipos.
- Default backend: `false`.
- Configuración muestra `Ocultar importes sensibles`.
- Activar, guardar y recargar conserva la preferencia.
- Durante carga o error de Settings no se muestran importes reales.
- Con privacidad activa las máscaras son `$ ••••`, `US$ ••••` o `••••`.
- No quedan importes reales en texto, `aria-label` ni `title`.
- Fechas, porcentajes, cantidades, versiones, IDs y últimos cuatro dígitos siguen visibles.
- Al desactivar, los importes reaparecen inmediatamente.
- APIs financieras, exportaciones, backups y SQLite conservan los valores reales.

## Gates obligatorios

1. Preflight con versión y rutas reales de Node/npm, root y puertos.
2. Hash SHA-256 y copia binaria nueva de `workspace/backend/prisma/dev.db`.
3. Inventario y SHA-256 de los once archivos implementados.
4. Backend: `npm ci`, Prisma generate/status/deploy, build y test focal `tests/settings/settings.test.ts`.
5. Frontend: `npm ci`, typecheck, lint y build. Se admiten únicamente los tres warnings preexistentes ya documentados; cero errores.
6. Smoke API GET/PUT/GET, incluyendo rechazo HTTP 400 para `hideAmounts: "true"`.
7. Playwright focal exacto: `tests/privacy-mode.spec.ts`, Chromium, un worker, retries 0, sin skips.
8. Capturas del modo visible, modo oculto y persistencia tras reload.
9. Verificación explícita de ausencia de fugas en Inicio, Movimientos, Ingresos, Tarjetas y Cierres.
10. Cleanup de dato centinela y procesos; puertos libres.
11. Restauración de SQLite desde la copia inicial y hash final idéntico.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-PRIVACY-002-evidence-v1.0.1/`

Debe incluir preflight, hashes, backup inicial, logs completos, smoke API con request/response, Playwright, capturas, auditoría DOM, cleanup, hash final, inventario y `VERDICT.md`.

PASS exige todos los gates. Cualquier fuga, flash de importes, error de entorno, cambio de código, retry, skip, archivo faltante o hash SQLite diferente determina FAIL.
