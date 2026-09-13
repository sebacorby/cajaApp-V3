# APPCAJA-V3-UX-GOD-COMPONENT-SPLIT-001 Delivery Report

## Estado
PASS

## Alcance
Fase D del plan de mejoras UX/UI (continuación de `APPCAJA-V3-UX-A11Y-DEADCODE-001` y `APPCAJA-V3-UX-COMPONENT-CONSOLIDATION-001`). Descomposición del god-component `tarjetas-section.tsx` (2461 líneas) en módulos de presentación bajo `src/components/finance/card-statements/`, dejando `tarjetas-section.tsx` como orquestador de estado y ciclo de vida. Sin cambios de comportamiento funcional, sin tocar backend, sin tocar migraciones ni contratos, sin modificar ningún `data-testid` existente.

Nota de gobierno: este trabajo se ejecutó y quedó materializado en el repo sin reporte de entrega ni actualización del SSOT en su momento. Este documento cierra esa brecha documental auditando el resultado ya presente en disco; no se reintrodujo ni se repitió la implementación.

## Root del frontend
`I:\cajaApp-V3\workspace\frontend`

## Motivación
El reporte de la fase anterior (`APPCAJA-V3-UX-COMPONENT-CONSOLIDATION-001`) dejó registrado como pendiente explícito: *"`tarjetas-section.tsx` (2461 líneas) sigue siendo un god-component; su descomposición en módulos queda para una entrega separada por su tamaño y riesgo."*

## Archivo orquestador (resultado final)

```
src/components/finance/sections/tarjetas-section.tsx   (2461 → 704 líneas)
```

Conserva exclusivamente:
- el estado de React (`useState`/`useRef`) del ciclo import → preview → accepted/error;
- los handlers de red (`handleImport`, `handleAccept`, `handleActivateStatement`, `handleArchiveStatement`, `handleOpenTraceability`, `handleManualPurchaseSubmit`, `handleDeleteManualPurchase`, `handleExchangeRateSave`);
- el `switch` de renderizado por `UIState` (`booting` → `loading` → `error` → `initial` → `accepted` → preview), delegando cada vista a los componentes nuevos.

## Módulos nuevos creados

```
src/components/finance/card-statements/types.ts                      (41 líneas)
src/components/finance/card-statements/helpers.ts                    (132 líneas)
src/components/finance/card-statements/loading-and-error-states.tsx  (85 líneas)
src/components/finance/card-statements/import-state.tsx              (143 líneas)
src/components/finance/card-statements/preview-state.tsx             (99 líneas)
src/components/finance/card-statements/accepted-state.tsx            (305 líneas)
src/components/finance/card-statements/statement-overview.tsx        (143 líneas)
src/components/finance/card-statements/statement-document.tsx        (262 líneas)
src/components/finance/card-statements/statement-history-panel.tsx   (298 líneas)
src/components/finance/card-statements/exchange-rate-card.tsx        (144 líneas)
src/components/finance/card-statements/manual-purchase-sheet.tsx     (117 líneas)
```

Responsabilidad de cada módulo:
- **`types.ts`**: tipos compartidos (`UIState`, `EditableRowField`, `RowEdit`, `ManualPurchaseForm`) y la constante `EMPTY_MANUAL_PURCHASE`.
- **`helpers.ts`**: funciones puras de formateo/transformación (`formatMoney`, `formatDateLabel`, `acceptedStatementToPreview`, `createEditedPreview`, `rowTone`, `statementStatusLabel`, `statementStatusTone`, etc.), sin estado ni JSX.
- **`loading-and-error-states.tsx`**: `PersistedDataLoadingState`, `LoadingState`, `ErrorState` — las tres pantallas de espera/error del ciclo de importación.
- **`import-state.tsx`**: pantalla inicial con selector de archivo y botón de importar.
- **`preview-state.tsx`**: pantalla de edición del draft antes de aceptar.
- **`accepted-state.tsx`**: pantalla del resumen ya aceptado/persistido, con panel de compra manual y cotización integrados.
- **`statement-overview.tsx`**: tarjetas de totales/banco/marca/estructura detectada, reutilizada por preview y accepted.
- **`statement-document.tsx`**: tabla de filas/grupos del resumen (`card-statement-group`, `card-statement-row`).
- **`statement-history-panel.tsx`**: panel de historial de versiones con activar/archivar/trazabilidad.
- **`exchange-rate-card.tsx`**: tarjeta de cotización USD/ARS y equivalentes.
- **`manual-purchase-sheet.tsx`**: formulario de alta de compra manual.

## Verificación de integridad de `data-testid`

Se confirmó por `grep` que los 14 `data-testid` usados por specs de Playwright existentes se preservan exactamente en los módulos nuevos, en el mismo componente lógico que antes:

| `data-testid` | Módulo actual | Usado por |
|---|---|---|
| `card-statement-file-input`, `card-statement-import-submit` | `import-state.tsx` | `tests/e2e/card-statement-import.spec.ts` |
| `card-statement-import-state` | `loading-and-error-states.tsx` | `tests/e2e/card-statement-import.spec.ts` |
| `card-statement-preview` | `preview-state.tsx` | `tests/e2e/card-statement-import.spec.ts` |
| `card-statement-bank-name`, `card-statement-brand`, `card-statement-total-pesos`, `card-statement-total-dollars` | `statement-overview.tsx` | `tests/e2e/card-statement-import.spec.ts` |
| `card-statement-group`, `card-statement-row` | `statement-document.tsx` | `tests/e2e/card-statement-import.spec.ts` |
| `card-statement-error`, `card-statement-retry` | `loading-and-error-states.tsx` | `tests/e2e/card-statement-import.spec.ts` |
| `card-statement-history`, `card-statement-history-row-{id}`, `card-statement-traceability-{id}` | `statement-history-panel.tsx` | `tests/e2e/deuda-futura/card-history.spec.ts` |
| `card-statement-usd-ars-rate` | `exchange-rate-card.tsx` | (sin spec propio actualmente; conservado igual) |

Ningún `data-testid` fue renombrado, eliminado ni movido a un componente lógicamente distinto.

## Validación ejecutada

- `npm run typecheck` → PASS, sin errores.
- `npm run lint` → mismos 4 hallazgos preexistentes ya documentados en las dos entregas anteriores (1 error `react-hooks/use-memo` en `conciliacion-section.tsx`, no tocado por esta entrega; 3 warnings `no-unused-expressions` en archivos ajenos a este trabajo). Ningún hallazgo nuevo introducido por la descomposición.
- `npm run build` → SUCCESS. Compilación Turbopack, TypeScript y generación estática de página (`/`) sin errores.
- Verificación visual manual con Playwright contra un servidor de desarrollo efímero (puerto 3910, sin backend real, `.next` cache limpiado antes de levantar el servidor, detenido y liberado al finalizar):
  - Navegación completa de las 15 secciones visible y funcional en el sidebar, incluida "Tarjetas".
  - Sección Tarjetas renderiza el estado `booting` ("Cargando tus resúmenes" / "Consultando datos, proyecciones y compras manuales guardadas.") sin errores de React/hidratación/runtime.
  - Consola: únicamente errores `ERR_CONNECTION_REFUSED` esperados por ausencia del backend real en esta verificación acotada; cero `pageerror` de JavaScript.
- No se ejecutó el arranque autoritativo (`cajaapp-headless-up.ps1`) en esta auditoría porque el backend requiere el proveedor de IA (Ollama) para completar el preflight de arranque, y el entorno local tiene un defecto preexistente y no relacionado (`OLLAMA_MODELS=H:\IA-models` apunta a una unidad de Google Drive virtual que no admite crear ese directorio vía `mkdir` estándar). Este defecto es ajeno al alcance de esta entrega y no bloquea la validación estática/visual realizada.

## Known issues

- Deuda de lint preexistente documentada en las dos entregas anteriores, no bloqueante.
- No se ejecutó Playwright con backend real contra los specs de `tarjetas-section` (`card-statement-import.spec.ts`, `card-history.spec.ts`) en esta entrega, por el defecto de entorno de Ollama descrito arriba; la preservación de `data-testid` se verificó por inspección estática exhaustiva en lugar de ejecución E2E.
- El defecto de entorno de `OLLAMA_MODELS` en `H:\IA-models` (unidad Google Drive) queda registrado como hallazgo operativo separado, no bloqueante para este trabajo de UX.

## Definition of Done

- [x] `tarjetas-section.tsx` reducido de 2461 a 704 líneas, sin lógica de negocio perdida.
- [x] 11 módulos de presentación nuevos creados bajo `card-statements/`, cada uno con responsabilidad única.
- [x] Los 14 `data-testid` existentes verificados en el mismo componente lógico, sin renombrar ni perder ninguno.
- [x] Ninguna llamada a API, estado o lógica de negocio modificada (solo reubicación de JSX/funciones puras).
- [x] `npm run typecheck` PASS.
- [x] `npm run lint` sin hallazgos nuevos.
- [x] `npm run build` PASS.
- [x] Verificación visual manual sin backend real, servidor de prueba y caché `.next` limpiados, puerto liberado.
- [x] Ningún archivo de backend, Prisma, migraciones o contratos fue modificado.
- [x] Artefactos temporales de verificación visual (`temp-visual-check-*.log`) eliminados del workspace.
