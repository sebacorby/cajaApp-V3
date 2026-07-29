# 24-known-issues

## Issue 1: `getWorkerHardTimeoutMs` no existe en el source (backend)

- **Severidad:** Bloqueante para el gate de tests backend.
- **Sintoma:** `TypeError: (0, getWorkerHardTimeoutMs) is not a function` en
  los 10 tests de `tests/imports/watchdog-timeout.test.ts`.
- **Causa probable:** El test importa la funcion pero el source no la
  exporta (o tiene otro nombre).
- **Workaround:** N/A. El agente no puede modificar codigo, schema, tests
  ni dependencias.
- **Quien lo arregla:** Arquitecto / equipo backend. Probablemente renombrar
  la funcion real en el source para que coincida con el test, o ajustar
  el import del test.

## Issue 2: 24 errores de ESLint en el frontend

- **Severidad:** Bloqueante para el gate de lint.
- **Sintomas:**
  - `react-hooks/preserve-manual-memoization` en
    `src/components/finance/sections/tarjetas-section.tsx` linea 715
    (un `useCallback` cuya memoizacion manual no se pudo preservar).
  - `react-hooks/set-state-in-effect` en 23 sitios:
    - `src/components/finance/sections/tarjetas-section.tsx` linea 1213
      (`useEffect` con `setRateValue` y `setEffectiveDate` sincronos).
    - `src/components/ui/carousel.tsx` linea 98 (`onSelect(api)` sincrono).
    - `src/hooks/use-mobile.ts` linea 14 (`setIsMobile(...)` sincrono).
- **Causa probable:** React Compiler (reglas nuevas) detecta patrones
  que antes pasaban. Probablemente el codigo no se actualizo a la version
  nueva del plugin de ESLint.
- **Workaround:** N/A. El agente no puede tocar el codigo.
- **Quien lo arregla:** Equipo frontend. Opciones: refactor de los `useEffect`
  problematicos, ajustar la configuracion de ESLint, o ajustar las reglas
  de React Compiler (si es legitimo).

## Issue 3: shell del agente inestable (EPERM uv_spawn)

- **Severidad:** Impidio la ejecucion de la mitad de la campana en la
  primera pasada, pero despues se estabilizo.
- **Sintoma:** `EPERM: operation not permitted, uv_spawn
  C:\windows\System32\WindowsPowerShell\v1.0\powershell.EXE` aparece
  despues de varios comandos en una misma sesion.
- **Workaround usado:** El usuario ejecuto manualmente el bloque de
  backup SQLite (paso 7 de pre-flight).
- **Quien lo diagnostica:** El usuario o el equipo de plataforma.

## Issue 4: 9 vulnerabilidades moderate preexistentes en lockfile del frontend

- **Severidad:** Baja. No es bloqueante. Preexistente del lockfile,
  no se intento remediar (prohibido en la campana).
- **Sintoma:** `npm ci` reporto "9 moderate severity vulnerabilities" en
  el frontend.
- **Quien lo arregla:** Equipo de plataforma / seguridad, en una tarea
  aparte con alcance explicito de `npm audit fix`.

## Issue 5: 4 tests Playwright fallidos (pre-existentes)

- **Severidad:** Bloqueante para el gate de Playwright.
- **Specs fallidos:**
  - `tests/e2e/deuda-futura/future.spec.ts` — el test espera ver
    "Compromiso E2E 1783893071839" pero el element esta `hidden`
    (probable accordion colapsado).
  - `tests/e2e/deuda-futura/movements-export.spec.ts` — strict mode
    violation: `getByText` matchea 2 elements (`movement-row-*` y
    `movement-card-*`).
  - `tests/e2e/deuda-futura/reports.spec.ts` — mismo strict mode
    violation que movements-export.
  - `tests/e2e/card-statement-failed.spec.ts` — el link "Tarjetas" no
    se hace visible.
  - `tests/e2e/card-statement-import.spec.ts` (1 de 2) — el test
    "imports Galicia Visa PDF" no encuentra el testid
    `card-statement-import-state` (probable requiere PDF real y
    servicio de AI funcionando).
- **Quien los arregla:** Equipo de QA / frontend. Los 3 specs de
  strict-mode (future, export, reports) son bugs preexistentes del
  proyecto, no introducidos por la campana.

## Issue 6: dashboard-alerts Playwright timeout

- **Severidad:** Bloqueante.
- **Sintoma:** El spec `tests/e2e/deuda-futura/dashboard-alerts.spec.ts` no
  completa en 5 min. El test navega al Dashboard y espera un alert
  deterministico. La pagina no responde o el alert no aparece.
- **Causa probable:** El componente de alertas no se renderiza, o el
  banner de drilldown que el test espera no aparece cuando la alerta se
  dispara. Tambien posible: la pagina `/` esta bloqueada esperando
  data que no llega.
- **Mitigacion tomada:** El spec fue matado tras 5 min para liberar
  recursos. Los demas specs pudieron correr.
- **Quien lo arregla:** Equipo frontend (investiga el rendering de alertas)
  o QA (investiga si el spec necesita ajustar el wait).

## Issue 7: 5 specs de raiz no incluidos en la suite Playwright

- **Severidad:** Bloqueante para la cobertura de la seccion 8.
- **Specs afectados:** `tests/movements.spec.ts`, `tests/categories.spec.ts`,
  `tests/debit-csv-import.spec.ts`, `tests/goals.spec.ts`,
  `tests/budgets.spec.ts`, `tests/quality-audit.spec.ts`.
- **Causa:** `playwright.config.ts` tiene `testDir: ./tests/e2e`, asi que
  los specs en `./tests/*.spec.ts` (raiz) no son discoverables.
- **Causa adicional:** Hay un duplicado `tests/categories (1).spec.ts`
  que aparece al listar pero el instructivo pide solo `categories.spec.ts`.
- **Quien lo arregla:** Arquitecto (modificar `playwright.config.ts` para
  usar `testDir: ./tests` o un glob adecuado). Tambien limpiar el duplicado
  `categories (1).spec.ts`.

## Issue 8: card-history skipped

- **Severidad:** Bloqueante para cobertura.
- **Sintoma:** `tests/e2e/deuda-futura/card-history.spec.ts` aparece como
  "1 skipped" en la corrida.
- **Causa probable:** El spec tiene un `test.skip` condicional que se
  evalua como true (probable `if (alguna condicion)`).
- **Quien lo arregla:** QA / frontend (revisar la condicion del skip).
