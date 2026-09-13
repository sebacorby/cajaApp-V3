# 04 — Gate Frontend Focal (reemplaza v1.3.0 §8 según addendum v1.3.1 §5)

Ejecutado desde `I:\cajaApp-V3\workspace\frontend`. El backend (11436) y el frontend (11437) permanecieron en
ejecución durante todo el gate, sin detenerlos, tal como exige la tarea. Logs completos en
`C:\Users\javie\AppData\Local\Temp\uat-evidence\fe-01-npm-ci.log` … `fe-05-playwright.log`.

## Preflight — verificación de bytes/hash de los specs corregidos (obligatorio antes de correr el gate)

```
tests/month-close.spec.ts:      4378 bytes, sha256 6201bb17981bad47ec742fdc9948f15ad8ad6a6662c7c0883c792779a7c36387
tests/backup-restore.spec.ts:   4505 bytes, sha256 f549d848a2dba846bdcda950bb959704c11ee0c229dff5278f22dbcd11d06953
```

Ambos coinciden exactamente con los valores declarados en el addendum v1.3.1 §1. **Preflight: PASS** — se procedió
a ejecutar el gate.

## Paso 1 — `npm ci`

Resultado: **PASS**. 825 paquetes instalados, `audited 826 packages`, sin errores de instalación (17
vulnerabilidades reportadas por `npm audit`, no bloqueantes para este gate, no se ejecutó `npm audit fix`).
Servicios verificados con vida tras el `npm ci`: `GET http://127.0.0.1:11437` → 200; `GET
http://127.0.0.1:11436/health` → 200.

## Paso 2 — `npm run typecheck`

```
> tsc --noEmit
```
Exit code: 0, sin output de errores. **Verdict: PASS**.

## Paso 3 — `npm run lint`

```
> eslint .

.../alert-center.tsx           82:5  warning  @typescript-eslint/no-unused-expressions
.../sidebar-data-quality.tsx    56:5  warning  @typescript-eslint/no-unused-expressions
.../conciliacion-section.tsx   212:29 error    Expected the first argument to be an inline function expression
                                                (react-hooks/use-memo)
.../salud-financiera-section.tsx 276:5 warning @typescript-eslint/no-unused-expressions

✖ 4 problems (1 error, 3 warnings)
```
Exit code real del proceso `eslint .` (verificado sin interferencia de pipes): **1**.

**Verdict: FAIL (gate rojo)**. El error está en `src/components/finance/sections/conciliacion-section.tsx:212`
(`useMemo(todayInTucuman, [])` — ESLint exige una función inline, no una referencia). Ese archivo **no forma parte
del inventario gobernado de 23 archivos** de esta campaña (Conciliación es integración focal preexistente, no
materializada por v1.3.0/v1.3.1). No se filtró ni se excluyó nada del comando tal como exige la instrucción ("No
usar filtros adicionales, skips, retries..."); se reporta el resultado real y completo del comando ejecutado sin
modificaciones.

## Paso 4 — `npm run build`

**Verdict: FAIL / BLOCKED, con incidente colateral que se documenta a continuación.**

```
> npm run typecheck && next build && node -e "...copy .next/static → .next/standalone/.next/static..."
> tsc --noEmit   (OK, sin errores)

> Build error occurred
Error: EBUSY: resource busy or locked, rmdir 'I:\cajaApp-V3\workspace\frontend\.next\standalone'
```

Se repitió una segunda vez para confirmar reproducibilidad: **mismo error, idéntico, ambas veces**.

Causa raíz identificada: el servicio frontend en el puerto 11437, que la tarea exige mantener corriendo durante
toda la campaña, se está sirviendo desde `.next/standalone/server.js` (confirmado por los encabezados HTTP de
producción reales: `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1`, `x-nextjs-stale-time: 300`, típicos de `next
start`/standalone, no de `next dev`). El comando `next build` intenta borrar y regenerar `.next/standalone` antes
de reescribirlo; como el proceso vivo mantiene abierto el archivo `server.js` de ese mismo directorio, Windows
devuelve `EBUSY` al intentar eliminar el directorio.

**Incidente colateral (se documenta con total transparencia, sin fabricar ni ocultar):** aunque el `rmdir` del
directorio falló con `EBUSY`, el proceso de build sí llegó a **borrar el contenido interno** de
`.next/standalone` antes de fallar en el `rmdir` del directorio contenedor. Verificado físicamente después de
ambos intentos:

```
ls I:/cajaApp-V3/workspace/frontend/.next/standalone/
→ (directorio vacío, sin server.js ni subcarpetas)
```

El servicio en el puerto 11437 **sigue respondiendo 200 OK** en este momento porque el proceso Node vivo mantiene
abiertos los descriptores de archivo ya desvinculados (semántica de Windows: un archivo abierto puede seguir
siendo usado por el proceso aunque su entrada de directorio haya sido eliminada, mientras el handle permanezca
abierto). **No se intentó un tercer `npm run build` ni ninguna otra acción correctiva** para no arriesgar romper el
servicio en ejecución (prohibido detenerlo) ni empeorar el estado. Se recomienda al arquitecto: si el proceso del
puerto 11437 se reinicia o recarga por cualquier motivo antes de una reconstrucción completa de
`.next/standalone`, el servicio dejará de poder arrancar. Esto es una consecuencia directa de la combinación
"mantener el servicio corriendo" + "ejecutar el gate de build tal cual está especificado" contra un servicio que
en este entorno resultó estar corriendo en modo standalone/producción sobre el mismo directorio que el build
necesita regenerar; no es un defecto de código de los verticales P5.

## Paso 5 — Playwright (`tests/reconciliation.spec.ts tests/month-close.spec.ts tests/backup-restore.spec.ts --workers=1 --retries=0`)

**Verdict: FAIL**, consistente con el bloqueo del paso 4.

```
Running 3 tests using 1 worker

1) backup-restore.spec.ts:35:5 — Error: expect(locator).toBeVisible() failed
   Locator: getByTestId('backup-restore-section')  — element(s) not found (timeout 30000ms)
   at tests/backup-restore.spec.ts:73:25 (tras click en botón "Respaldo")

2) month-close.spec.ts:61:5 — Error: expect(locator).toBeVisible() failed
   Locator: getByTestId('month-close-section')  — element(s) not found (timeout 30000ms)
   at tests/month-close.spec.ts:93:25 (tras click en botón "Cierres")

3) reconciliation.spec.ts:101:5 — Error: expect(locator).toBeVisible() failed
   Locator: getByTestId('reconciliation-section')  — element(s) not found (timeout 30000ms)
   at tests/reconciliation.spec.ts:178:60 (tras click en botón "Conciliación")

3 failed.
```

Los 3 specs fallan exactamente en el mismo punto: el click de navegación se ejecuta correctamente (Playwright no
reporta timeout en el `click`, sólo en la visibilidad posterior de la sección), pero la sección destino nunca
aparece. Esto es consistente con que el servicio de 11437 está sirviendo el bundle de producción compilado en un
momento anterior a la materialización completa de las secciones de Cierre Mensual/Backup-Restore/Conciliación en
la UI — es decir, el build servido actualmente está desactualizado respecto al código fuente en disco, y no fue
posible refrescarlo sin detener el servicio (ver paso 4). No hay evidencia de que el código fuente en
`cierres-section.tsx` / `respaldo-section.tsx` / `section-router.tsx` esté mal escrito; el fallo se explica por la
imposibilidad de desplegar un build fresco bajo las restricciones de esta tarea (servicio no puede detenerse,
build no puede completarse mientras el servicio está activo).

Playwright generó `test-results/` (3 carpetas con screenshot, video y trace por test) y `playwright-report/`,
ninguno de los cuales fue borrado, conforme a la prohibición explícita de esta tarea.

## Resumen del gate frontend

| Paso | Resultado |
|---|---|
| Preflight hash de los 2 specs corregidos | PASS |
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | **FAIL** (1 error preexistente fuera del inventario de 23 archivos, en conciliacion-section.tsx) |
| `npm run build` | **FAIL/BLOCKED** (EBUSY por servicio standalone en ejecución; con incidente colateral: `.next/standalone` quedó vacío en disco, servicio sigue arriba sólo por handles abiertos) |
| Playwright (3 specs) | **FAIL** (3/3, sección destino nunca visible, atribuible al build desactualizado del paso anterior) |

**Gate global: FAIL.** 2/5 pasos PASS, 3/5 pasos FAIL (uno de ellos con incidente colateral de alta severidad que
debe revisar el arquitecto con prioridad).
