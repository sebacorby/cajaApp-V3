# 27-known-issues.md

Defectos confirmados en la campaña v1.0.8

Timestamp: 2026-07-15T01:51:00

## 1. Asesor IA — FAIL

- El proveedor Ollama fue alcanzado y generó una respuesta.
- El backend rechazó la respuesta con HTTP 422 (`AI_ADVISOR_UNKNOWN_SOURCE`) porque la IA citó `summary.currencies.ARS`, una fuente que no existe en el contexto enviado.
- El guardrail numérico de fechas ISO parece corregido (no se disparó `AI_ADVISOR_UNGROUNDED_NUMBER`), pero la validación de fuentes sigue fallando.
- No se obtuvo HTTP 201 ni se verificaron request ID, fingerprint, claims, citas, historial ni cleanup.

## 2. Playwright — 8 fallos de 25 tests

### Categorías
- `categories.spec.ts` excede timeout de 90s. Posible lentitud o bloqueo en el flujo de recategorización.

### Gráficos / Dashboard
- `chart-parity.spec.ts` falla por strict mode violation: hay dos botones "Actualizar" (sidebar y dashboard).

### Importaciones
- `debit-csv-import.spec.ts` falla por strict mode violation: la descripción del movimiento aparece en fila y card.
- `card-statement-import.spec.ts` extrae 112 filas del PDF, pero el test espera >= 125.

### Deuda futura
- `future.spec.ts` falla por strict mode violation: dos elementos con texto "Confirmado" dentro del mismo panel.

### Búsqueda global
- `global-search.spec.ts` no encuentra el diálogo `Buscar en CajaApp` en viewport mobile.

### Sidebar
- `sidebar-data-quality.spec.ts` excede timeout de 90s.

## 3. Gates aprobados

- Backend install, Prisma, build, tests (129 tests passed) ✅
- Frontend install, typecheck, lint, build ✅
- Headless start/stop ✅
- Smoke API corregido (12 endpoints) ✅
- AI provider config (GET context) ✅
- Materialización Fase 8A (15 hashes coinciden) ✅
- Integridad y cleanup ✅
