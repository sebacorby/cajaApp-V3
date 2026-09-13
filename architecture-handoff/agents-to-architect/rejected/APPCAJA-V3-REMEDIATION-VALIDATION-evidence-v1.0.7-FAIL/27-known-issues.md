# 27-known-issues.md

Defectos confirmados en la campaña v1.0.7

Timestamp: 2026-07-14T22:25:00

## 1. Suite core de Playwright — FAIL (13/24 tests fallaron)

### Alertas
- `alert-center.spec.ts` falla porque `alert-center-panel` no es visible después de clickear `header-alert-center` en viewport mobile.

### Categorías
- `categories.spec.ts` falla porque un movimiento recién recategorizado no vuelve a mostrar "Sin clasificar" como espera el test; el flujo parece persistir la categoría asignada.

### Gráficos / Dashboard
- `chart-parity.spec.ts` excede el timeout de 120s.
- `dashboard.spec.ts` excede el timeout de 720s (archivo lento: 12.3m).
- `sidebar-data-quality.spec.ts` excede el timeout de 90s.

### Importaciones
- `debit-csv-import.spec.ts` no encuentra la descripción del movimiento en la previsualización; muestra "Ref. CSV-..." en lugar de "Compra débito E2E ...".
- `card-statement-import.spec.ts` no alcanza el estado final de extracción del PDF.

### Deuda futura
- `card-history.spec.ts` no encuentra `card-statement-history`.
- `dashboard-alerts.spec.ts` excede timeout.
- `future.spec.ts` encuentra el compromiso creado pero está hidden.

### Salud financiera
- `financial-health.spec.ts` espera `USD.status === "insufficient_data"` pero recibe `"calculated"`.

### Búsqueda y movimientos
- `global-search.spec.ts` y `movements.spec.ts` fallan por strict mode violation: el mismo texto aparece en dos elementos (row y card) con selectores distintos.

## 2. Asesor IA — FAIL (gate 12)

- El proveedor Ollama fue alcanzado y generó una respuesta.
- El backend rechazó la respuesta con HTTP 422 (`AI_ADVISOR_UNGROUNDED_NUMBER`) porque la síntesis contenía valores no presentes en las fuentes citadas.
- No se obtuvo HTTP 201. No se pudo verificar request ID, contexto, claims, citas, historial ni cleanup.

## 3. Otros gates

- Backend install, Prisma, build, tests: PASS.
- Frontend install, typecheck, lint, build: PASS.
- Headless start/stop: a verificar en cleanup.
- Smoke API corregido: PASS (12 endpoints HTTP 200).
- SQLite: backup inicial verificado; restauración final pendiente.
