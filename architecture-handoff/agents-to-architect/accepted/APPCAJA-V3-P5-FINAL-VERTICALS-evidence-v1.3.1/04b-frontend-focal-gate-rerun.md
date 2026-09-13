# 04b — Re-ejecución del gate frontend focal (corrige incidentes del 04 original)

El agente que produjo `04-frontend-focal-gate.md` dejó el gate en FAIL/BLOCKED por dos causas de proceso, no de
código. El arquitecto las diagnosticó y corrigió directamente, y volvió a correr el gate completo desde cero.

## Incidente 1 — `npm run build` con el servicio standalone corriendo (EBUSY)

Causa raíz confirmada: el servicio headless en el puerto 11437 se sirve desde `.next/standalone/server.js`. Correr
`npm run build` con ese proceso vivo intenta borrar y regenerar `.next/standalone`; Windows no permite `rmdir` de un
directorio con un archivo abierto por otro proceso → `EBUSY`. El intento dejó `.next/standalone` vacío en disco
(contenido borrado, directorio no eliminado) mientras el servicio seguía respondiendo sólo por handles ya abiertos.

Corrección aplicada: se detuvieron los servicios (`cajaapp-headless-up.ps1 -Stop`, confirmado con `netstat` que los
puertos 11436/11437 quedaron libres), se eliminó `.next` completo (artefacto regenerable, no fuente), se corrió
`npm run build` de nuevo sin ningún proceso vivo sobre ese directorio, y **completó sin errores**. Luego se
relanzaron los servicios (`cajaapp-headless-up.ps1 -SkipMigrate`) para que Playwright tuviera un build fresco real
que servir. Lección de proceso para futuras campañas: el gate de `build` de frontend debe ejecutarse con los
servicios detenidos, no en paralelo con el servicio headless en modo standalone.

## Incidente 2 — `npm run lint` contaminado por `playwright-report/`/`test-results/`

El `04` original corrió lint ANTES de generar los artefactos de Playwright, por eso reportó sólo 4 problemas (1
error real). En una re-ejecución posterior en este mismo directorio, `eslint .` recogió también
`playwright-report/trace/assets/*.js` (bundles minificados del visor de trazas), produciendo 183 errores y 2782
warnings espurios — ninguno de código fuente de la app. Corrección: se eliminaron `test-results/` y
`playwright-report/` (artefactos generados, de todos modos exigidos a limpiar en la sección 6 del addendum) antes de
correr lint.

## Corrección de código — único error real de lint

`src/components/finance/sections/conciliacion-section.tsx:212` tenía `useMemo(todayInTucuman, [])`
(`react-hooks/use-memo` exige una función inline). Este archivo **no forma parte del inventario gobernado de 23
archivos** de esta campaña. Se corrigió a `useMemo(() => todayInTucuman(), [])` — cambio de una línea, sin alterar
comportamiento (`todayInTucuman` no recibe argumentos y su valor de retorno es el mismo).

## Resultado de la re-ejecución completa (servicios detenidos para build, luego relanzados para Playwright)

| Paso | Resultado |
|---|---|
| `npm run lint` (tras limpiar playwright-report/test-results) | **PASS** — 0 errores, 3 warnings preexistentes fuera del inventario (`alert-center.tsx`, `sidebar-data-quality.tsx`, `salud-financiera-section.tsx`) |
| `npm run typecheck` | **PASS** — sin salida, exit 0 |
| `npm run build` (servicios detenidos, `.next` limpio) | **PASS** — build de producción + copia de assets a standalone, sin errores |
| Servicios relanzados (`cajaapp-headless-up.ps1 -SkipMigrate`) | backend 11436 `/health` → 200, frontend 11437 → 200 |
| `npx playwright test tests/reconciliation.spec.ts tests/month-close.spec.ts tests/backup-restore.spec.ts --workers=1 --retries=0` | **PASS** — 3 passed (3.3s), sin filtros/skips/retries |

**Gate frontend focal — veredicto final: PASS.**
