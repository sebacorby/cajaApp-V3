# 01 — Smoke API real: Conciliación (APP-RECONCILIATION-001, integración focal)

Entorno: backend real en http://127.0.0.1:11436 (Node v24.18.0), servicio en ejecución durante toda la prueba,
sin detenerlo. Datos de prueba (UAT) creados sobre meses ficticios futuros (2031-02) para no interferir con datos
reales de dev.db. Ningún archivo fuente fue modificado para producir esta evidencia.

Scripts fuente (no forman parte del entregable, adjuntos como referencia de trazabilidad):
`C:\Users\javie\AppData\Local\Temp\uat-evidence\01-reconciliation.mjs` y `01-reconciliation-part2.mjs`.
Logs completos: `01-reconciliation.log` (354 líneas) y `01-reconciliation-part2.log` (388 líneas), mismo directorio.

## Escenario 1 — Crear duplicado real (dos fuentes) y listar movimientos

```
POST /api/movements/manual
{"occurredOn":"2031-02-10","type":"expense","sourceType":"manual_cash","description":"Pago prueba UAT reconciliacion","currency":"ARS","amount":"3500.00","status":"actual"}
→ 201, id manual:a3f3c068-ac0e-4a31-a438-7502de8450c6

POST /api/movements/manual
{"occurredOn":"2031-02-10","type":"expense","sourceType":"manual_unexpected","description":"Pago prueba UAT reconciliacion","currency":"ARS","amount":"3500.00","status":"actual"}
→ 201, id manual:e194f2c7-5716-4882-9906-3af7c5aae592

GET /api/movements?from=2031-02-01&to=2031-02-28&status=actual&pageSize=100
→ 200, records: 2, ambos movimientos visibles con amount "3.500,00" (formato AR).
```

**Verdict: PASS** — ambos movimientos se crean y son visibles en el ledger antes del scan, tal como se espera.

## Escenario 2 — Scan real de conciliación (detecta duplicado)

```
POST /api/reconciliation/scan  {"from":"2031-02-01","to":"2031-02-28"}
→ 201
{
  "detected": 1,
  "summary": {"total":1,"open":1,"resolved":0,"dismissed":0,"duplicates":1,"relations":0,"excluded":0,"current":1},
  "items": [{
    "id": "d3b8f522-8a8e-4655-b946-3059d4e3d7b0",
    "fingerprint": "d8f231c049ee0aa8b3438e48218abbb32bc737eeffc29a97a8ec02650d9a0089",
    "relationType": "duplicate_movement",
    "status": "open",
    "confidence": 100,
    "rationale": ["El tipo, la moneda y el importe son idénticos.","Las fechas están separadas por 0 día(s).","Similitud de descripción: 100%."],
    "excludedMovementId": null,
    "isCurrent": true,
    ... participants left=manual:e194f2c7..., right=manual:a3f3c068...
  }]
}
```

**Verdict: PASS** — el scan detecta correctamente el par duplicado con confianza 100% y razonamiento explicativo real.

## Escenario 3 — Listado (`GET /api/reconciliation`)

```
GET /api/reconciliation?status=open&scope=current&limit=50
→ 200, items: [el mismo caso d3b8f522...], summary y filteredSummary consistentes (open:1, current:1).
```

**Verdict: PASS**.

## Escenario 4 — Detalle (`GET /api/reconciliation/:id`)

```
GET /api/reconciliation/d3b8f522-8a8e-4655-b946-3059d4e3d7b0
→ 200, mismo objeto completo con participantes left/right, excludedMovementId: null.
```

**Verdict: PASS**.

## Escenario 5 — Resolver (`resolve` con `exclude_left`) y comprobar que el movimiento excluido NO integra el ledger

```
POST /api/reconciliation/d3b8f522-8a8e-4655-b946-3059d4e3d7b0/resolve  {"action":"exclude_left"}
→ 200, status:"resolved", resolution:"exclude_left", excludedMovementId:"manual:e194f2c7-5716-4882-9906-3af7c5aae592",
   participants[left].excluded:true

GET /api/movements?from=2031-02-01&to=2031-02-28&status=actual&pageSize=100
→ 200, records: 1 (sólo manual:a3f3c068... permanece; el movimiento excluido ya no aparece en el ledger)
```

**Verdict: PASS** — comportamiento exacto exigido: al resolver con `exclude_left`, el movimiento marcado queda fuera de
`GET /api/movements` (mecanismo `getReconciliationExcludedMovementIds()` confirmado empíricamente, no sólo por lectura
de código).

## Escenario 6 — Reabrir (`reopen`) y comprobar que el movimiento vuelve a integrar el ledger

```
POST /api/reconciliation/d3b8f522-8a8e-4655-b946-3059d4e3d7b0/reopen
→ 200, status:"open", resolution:null, excludedMovementId:null

GET /api/movements?from=2031-02-01&to=2031-02-28&status=actual&pageSize=100
→ 200, records: 2 (ambos movimientos vuelven a aparecer)
```

**Verdict: PASS** — el `reopen` revierte la exclusión y el movimiento vuelve al ledger de inmediato.

## Nota operativa (no defecto)

El caso `d3b8f522-...` se dejó deliberadamente en estado `open` (reabierto) al finalizar este vertical, para
demostrar el ciclo completo `resolve → reopen`. Esto tuvo un efecto colateral documentado y resuelto en
`02-smoke-api-month-close.md`: el bloqueo global de Cierre Mensual detecta cualquier conciliación `isCurrent:true,
status:'open'` en cualquier mes, no sólo en el mes que se intenta cerrar. Antes de continuar con el vertical de
Cierre Mensual se descartó (`dismiss`) explícitamente este caso para no dejar contaminado el estado global. Se deja
constancia aquí para que no se interprete como un intento de ocultar un resultado fallido.

## Resumen del vertical

| Escenario | Resultado |
|---|---|
| Crear duplicado + listar movimientos | PASS |
| Scan detecta duplicado | PASS |
| Listado (`GET /api/reconciliation`) | PASS |
| Detalle (`GET /api/reconciliation/:id`) | PASS |
| Resolver (exclude_left) + ledger sin el movimiento excluido | PASS |
| Reabrir + ledger con ambos movimientos de nuevo | PASS |

**6/6 escenarios PASS. 0 FAIL. 0 omitidos.**
