# 02 — Smoke API real: Cierre Mensual (APP-MONTH-CLOSE-001)

Entorno: mismo backend real, mismos meses ficticios (2031-03/04/05) para no interferir con datos reales.
Scripts fuente: `C:\Users\javie\AppData\Local\Temp\uat-evidence\02-month-close.mjs` (corrida inicial, interrumpida
por interferencia cruzada con el caso de conciliación dejado abierto en el vertical anterior — ver nota abajo) y
`02-month-close-part2.mjs` (corrida completa y exitosa). Logs: `02-month-close.log` (528 líneas) y
`02-month-close-part2.log` (1772 líneas).

## Nota sobre la primera corrida (`02-month-close.mjs` / `02-month-close.log`)

La primera corrida creó movimientos y detectó correctamente 2 duplicados nuevos (uno propio del mes 2031-04, y el
caso `d3b8f522-...` reabierto deliberadamente al final del vertical de Conciliación, que seguía `isCurrent:true,
status:'open'`). Al intentar `POST /api/month-close {"monthKey":"2031-04"}` el backend respondió 400 con
`"No se puede cerrar 2031-04: existen 2 conciliaciones actuales abiertas."` — correcto. Se resolvió el caso propio
de 2031-04, pero el caso heredado `d3b8f522-...` (de otro mes) seguía bloqueando el cierre porque **el bloqueo de
Cierre Mensual es global, no está acotado por mes** (confirmado como diseño intencional, coincide con el texto de
la especificación fuente: "Bloqueo si existe cualquier conciliación actual abierta"). Esto no es un defecto: es el
comportamiento correcto y documentado. La corrida se detuvo ahí para no seguir generando ruido, y se retomó
limpiamente en `02-month-close-part2.mjs` descartando primero ese caso heredado.

## Escenario 1 — Caso de conciliación abierto bloquea el cierre (HTTP 400) y se resuelve

```
POST /api/reconciliation/d3b8f522-8a8e-4655-b946-3059d4e3d7b0/resolve  {"action":"dismiss"}
→ 200

POST /api/month-close  {"monthKey":"2031-04"}
→ 201  (una vez descartado el último caso global abierto)
```

(La demostración explícita del 400 con el mensaje real de "conciliaciones actuales abiertas" está documentada en
`02-month-close.log` líneas 234-240 y 423-429: `"No se puede cerrar 2031-04: existen 2 conciliaciones actuales
abiertas."` y `"... existen 1 conciliaciones actuales abiertas."`)

**Verdict: PASS**.

## Escenario 2 — Crear cierre para el mes UAT (2031-04, v1)

```
POST /api/month-close  {"monthKey":"2031-04"}
→ 201
CLOSE_A_ID (v1): 76d9b4f3-a10a-4a45-8f28-4fddda51eb80
```

**Verdict: PASS**.

## Escenario 3 — Listado sin snapshot / Detalle con snapshot

```
GET /api/month-close?monthKey=2031-04
→ 200, items sin campo "snapshot" expandido → hasSnapshotInList: false

GET /api/month-close/76d9b4f3-a10a-4a45-8f28-4fddda51eb80
→ 200, incluye snapshot completo → hasSnapshotInDetail: true
```

**Verdict: PASS** — el listado omite el snapshot pesado; el detalle lo incluye.

## Escenario 4 — ARS/USD × actual/pending/projected (summary real)

Movimientos de soporte creados antes del cierre: gasto actual ARS 120.000 (dos duplicados ARS 1.200 resueltos con
`exclude_left`, más un ajuste manual y un gasto pendiente ARS 2.000, y un gasto actual USD 80), ingreso actual ARS
50.000, e ingreso **proyectado** USD 150 vía `POST /api/incomes/events {"kind":"extra","status":"projected"}`
(los movimientos manuales no admiten `status:"projected"`, por eso se usó el endpoint de eventos de ingresos).

Respuesta real del detalle (`GET /api/month-close/76d9b4f3-.../`, campo `summary`):

```json
{
  "monthKey": "2031-04",
  "movements": 5,
  "income": {
    "all": {"ARS":"5000000","USD":"15000"},
    "actual": {"ARS":"5000000","USD":"0"},
    "pending": {"ARS":"0","USD":"0"},
    "projected": {"ARS":"0","USD":"15000"}
  },
  "expense": {
    "all": {"ARS":"320000","USD":"8000"},
    "actual": {"ARS":"120000","USD":"8000"},
    "pending": {"ARS":"200000","USD":"0"},
    "projected": {"ARS":"0","USD":"0"}
  },
  "balance": {
    "all": {"ARS":"4680000","USD":"7000"},
    "actual": {"ARS":"4880000","USD":"-8000"},
    "pending": {"ARS":"-200000","USD":"0"},
    "projected": {"ARS":"0","USD":"15000"}
  },
  "sources": {"income_one_off":1,"manual_adjustment":1,"manual_cash":2,"manual_income":1},
  "openReconciliations": 0
}
```

(Nota: los montos vienen expresados en centavos/unidad mínima entera en este objeto interno — p.ej. "5000000" =
ARS 50.000,00 — consistente con los movimientos creados.)

**Verdict: PASS** — la matriz ARS/USD × actual/pending/projected refleja exactamente los movimientos creados,
incluyendo el ingreso proyectado en USD que sólo aparece en la columna `projected`.

## Escenario 5 — Rechazo de segundo cierre activo del mismo mes (HTTP 400)

```
POST /api/month-close  {"monthKey":"2031-04"}
→ 400
{"code":"VALIDATION_ERROR","message":"El mes 2031-04 ya tiene un cierre activo."}
```

**Verdict: PASS**.

## Escenario 6 — Crear cierre de mes posterior (2031-05, v1)

```
POST /api/month-close  {"monthKey":"2031-05"}
→ 201
CLOSE_B_ID (v1): 3664f65c-d2e7-4c0e-acf6-a0ec31edfc3e
```

**Verdict: PASS**.

## Escenario 7 — Rechazo de cierre hacia atrás con mes posterior activo (HTTP 400)

```
POST /api/month-close  {"monthKey":"2031-03"}
→ 400
{"code":"VALIDATION_ERROR","message":"No se puede cerrar 2031-03 mientras 2031-04 continúe cerrado. Reabra primero los meses posteriores."}
```

**Verdict: PASS** — el mensaje real cita exactamente el mes bloqueante (2031-04), consistente con la regla de orden
cronológico.

## Escenario 8 — Reabrir sólo el último activo

```
POST /api/month-close/76d9b4f3-a10a-4a45-8f28-4fddda51eb80/reopen   (2031-04, NO es el más reciente activo)
→ 400
{"code":"VALIDATION_ERROR","message":"Sólo se puede reabrir el cierre activo más reciente."}

POST /api/month-close/3664f65c-d2e7-4c0e-acf6-a0ec31edfc3e/reopen   (2031-05, sí es el más reciente activo)
→ 200
```

**Verdict: PASS** — el backend rechaza reabrir un cierre que no es el más reciente y permite reabrir el que sí lo es.

## Escenario 9 — Crear versión siguiente del mismo mes (2031-05, v2)

```
POST /api/month-close  {"monthKey":"2031-05"}
→ 201
CLOSE_B_ID (v2): 9f953110-8edd-469e-9bce-d5fdbd905227
```

**Verdict: PASS**.

## Escenario 10 — Fingerprint estable pese a `generatedAt` distinto

Se reabrió v2 y se creó inmediatamente v3 del mismo mes sin cambios de contenido intermedios:

```
POST /api/month-close/9f953110-8edd-469e-9bce-d5fdbd905227/reopen → 200
POST /api/month-close  {"monthKey":"2031-05"}  → 201
CLOSE_B_ID (v3): 5e8fab25-2634-4135-8e15-a7ee9861124b

FINGERPRINT v2: 145eee793ed03448862320b47025663dabacb5edbc118a0e5bddf1bb6874619e
FINGERPRINT v3: 145eee793ed03448862320b47025663dabacb5edbc118a0e5bddf1bb6874619e
GENERATED_AT v2: 2026-09-09T13:40:50.820Z
GENERATED_AT v3: 2026-09-09T13:40:51.010Z
FINGERPRINTS EQUAL (mismo contenido, generatedAt distinto): true
```

**Verdict: PASS** — `sourceFingerprint` idéntico entre v2 y v3 pese a `generatedAt` distinto en ~190ms, confirmando
empíricamente que `canonicalValue()` excluye correctamente `generatedAt` del cálculo del hash canónico.

## Resumen del vertical

| Escenario | Resultado |
|---|---|
| Bloqueo por conciliación abierta (400) + resolución | PASS |
| Crear cierre mes UAT | PASS |
| Listado sin snapshot / detalle con snapshot | PASS |
| Summary ARS/USD × actual/pending/projected | PASS |
| Rechazo segundo activo mismo mes (400) | PASS |
| Crear cierre mes posterior | PASS |
| Rechazo cierre hacia atrás (400) | PASS |
| Reabrir sólo el último activo | PASS |
| Crear versión siguiente del mismo mes | PASS |
| Fingerprint estable pese a generatedAt distinto | PASS |

**10/10 escenarios PASS. 0 FAIL. 0 omitidos.**
