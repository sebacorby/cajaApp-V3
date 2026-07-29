# Discovery — Spec 003: Revisar drafts pendientes

## Change & PRD

- **Change ID:** `003-revisar-drafts-pendientes`
- **PRD:** `specs/003-revisar-drafts-pendientes/PRD.md`

## Summary

Extender el **Centro de importaciones** con un panel dedicado que liste los `CardStatementDraft` en estado `preview_ready` y `failed`, ofreciendo por ítem las acciones **Aceptar** (commit a `CardStatement`), **Ver** (carga el preview en Tarjetas en modo editable) y **Descartar** (con modal de confirmación; elimina draft y `UploadedDocument`). La edición inline del preview queda fuera de scope.

## Features

| ID        | Name                                  | Type        | File                                                                                  |
|-----------|---------------------------------------|-------------|---------------------------------------------------------------------------------------|
| FEAT-025  | Revisar drafts pendientes             | functional  | [features/FEAT-025-revisar-drafts-pendientes.feature](features/FEAT-025-revisar-drafts-pendientes.feature) |

## Resolved decisions

| # | Decision                                                                                                          | Rationale                                                                                                                |
|---|-------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| 1 | El panel lista `preview_ready` **y** `failed` (no solo los que están listos para revisar).                         | El usuario pidió explícitamente "incluir también los que fallaron". Los `failed` también son "pendientes de resolución". |
| 2 | El panel vive dentro del **Centro de importaciones** existente, no en una sección nueva.                            | El usuario eligió "extender el Centro de importaciones existente". Evita crear un tercer destino de navegación.            |
| 3 | "Descartar" requiere **modal de confirmación** explícito antes de ejecutarse.                                      | Decidido por el usuario para evitar pérdidas accidentales de borradores con datos útiles.                                  |
| 4 | "Ver" navega a **Tarjetas con el preview cargado en modo editable** (no read-only).                                | El usuario así lo pidió. La edición del preview ya vive en Tarjetas; no la duplicamos.                                   |
| 5 | La edición inline del preview desde el Centro de importaciones queda **fuera de scope**.                            | El usuario lo marcó como "out of scope". Reutilizamos el flujo de Tarjetas para no duplicar superficies.                  |
| 6 | "Aceptar" se delega al endpoint existente `POST /api/card-statements/drafts/:draftId/accept`.                     | Ya existe el flujo de aceptación con normalización de fechas (FEAT-024). No reinventarlo.                                 |
| 7 | "Descartar" elimina **draft + `UploadedDocument`** (cascade ya está en el schema).                                  | Es el único estado donde el documento no quedó asociado a un resumen aceptado, así que es seguro borrarlo.                |

## Open questions (for the Planning agent)

Estas son decisiones de producto tomadas; lo que sigue son huecos técnicos que el agente Planning debe resolver:

1. **Endpoint de descarte**: hoy no existe `DELETE /api/card-statements/drafts/:draftId`. ¿Se crea nuevo o se reutiliza el endpoint genérico del import-center (`DELETE /api/import-center/:kind/:id`)? La pregunta es técnica pero la *intención* de producto es: borrar `CardStatementDraft` + `UploadedDocument` en cascada.
2. **Mecanismo de "Ver"**: hoy no hay un mecanismo en `TarjetasSection` para recibir un `draftId` desde fuera y saltar al estado `preview` con ese draft cargado. ¿Se agrega al `FinanceUIState` un campo `pendingDraftId` que `TarjetasSection` consuma en su `useEffect` de boot? Decisión técnica.
3. **Refresh post-acción**: ¿`TanStack Query` invalidación de `["import-center"]` o un `reload` manual del estado local? El panel de Importaciones hoy usa estado local (`useState`), no `TanStack Query`.
4. **Modal de confirmación**: ¿se reutiliza el componente `AlertDialog` de shadcn/ui (que ya está en `components/ui/`) o se construye uno ad-hoc?

## Collision check

Inspeccionado contra `features/FEAT-001..FEAT-024`:

| Feature activa       | Relación con esta spec                                                                                                                                     |
|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `FEAT-001` (card statement import) | **Extiende**. FEAT-001 cubre el flujo "upload → draft → accept" pero no el triage posterior de drafts. Esta spec agrega "ver lista de drafts pendientes + descartar". No reemplaza ningún escenario de FEAT-001. |
| `FEAT-016..FEAT-023` (future debt)  | **No toca**. Distinto dominio.                                                                                                                              |
| `FEAT-024` (period key fix)         | **No toca**. FEAT-024 normaliza fechas al aceptar; esta spec no modifica la aceptación, solo la lista de pendientes.                                          |
| `FEAT-002` (salary receipt import)  | **No toca**. Esta spec cubre solo `CardStatementDraft`. Los recibos de sueldo tienen su propio `SalaryReceiptDraft` y quedan fuera de scope.               |

Conclusión: la spec **extiende** FEAT-001 con una superficie nueva (lista de pendientes + descartar) sin reemplazar ningún escenario existente. El delivery summarizer no debería marcar deprecaciones.

## Codebase context

Resumen del estado actual del código relevante:

### Backend

- `workspace/backend/src/modules/import-center/`
  - `import-center.routes.ts` → `GET /api/import-center` y `GET /api/import-center/:kind/:id`.
  - `import-center.service.ts` ya mapea `preview_ready` → `needs_review` y `failed` → `failed` en `normalizeImportCenterStatus()` (líneas 208–232). Los borradores ya aparecen en el listado general con su estado correcto.
  - Falta un endpoint de descarte para drafts.
- `workspace/backend/src/modules/cards/`
  - `cards.routes.ts` → prefijo `/api/card-statements`.
  - `cards.controller.ts` ya expone:
    - `GET /api/card-statements/drafts/:draftId` (lectura).
    - `PUT /api/card-statements/drafts/:draftId` (edición de preview).
    - `POST /api/card-statements/drafts/:draftId/accept` (aceptar, con normalización FEAT-024).
  - Falta `DELETE /api/card-statements/drafts/:draftId`.
- `workspace/backend/prisma/schema.prisma`
  - `CardStatementDraft` tiene `status: String @default("imported")` y relaciones con `sections`, `groups`, `rows`, todas con `onDelete: Cascade` desde el draft. Eliminar el draft borra automáticamente su árbol.
  - `UploadedDocument` también tiene `drafts CardStatementDraft[]` con `onDelete: Cascade` desde el documento. Importante: si se borra el `UploadedDocument`, los drafts asociados se borran en cascada.

### Frontend

- `workspace/frontend/src/components/finance/sections/importaciones-section.legacy.tsx`
  - Ya pinta la lista general con filtros por estado (`needs_review`, `failed`, etc.) y badges coloreados.
  - Solo expone dos acciones por ítem: "Ver detalle" (toggle del detalle inline) y "Abrir en Tarjetas" (navega a la sección sin pasar `draftId`). Hay que añadir **Aceptar**, **Ver** y **Descartar** por ítem para `preview_ready`, y **Descartar** para `failed`.
- `workspace/frontend/src/lib/finance/import-center-api.ts`
  - Hoy solo expone `listImportCenter` y `getImportCenterDetail`. Hay que añadir las llamadas a `acceptDraft(draftId)` (reutilizable desde `card-statements-api`) y `discardDraft(draftId, documentId)`.
- `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx`
  - Tiene `uiState` que arranca en `"booting"` y pasa a `"preview"` cuando hay preview cargado. Hoy se carga preview solo desde el polling del worker (después del upload).
  - No hay mecanismo para recibir un `draftId` externo y saltar directo a `"preview"` con su preview.
- `workspace/frontend/src/lib/finance/ui-store.ts`
  - Zustand store con `setSection(section)`. No hay canal para pasar payload adicional (como `draftId`) entre secciones. Habría que agregar uno.

### Convenciones detectadas

- Frontend: React + shadcn/ui + Tailwind, naming `kebab-case` para archivos, español para UI strings (badges, botones).
- Backend: Fastify + Prisma + Zod. Patrón `*.routes.ts` + `*.controller.ts` + `*.service.ts` + `*.schemas.ts`.
- Tests: Vitest (backend) + Playwright (frontend E2E).
- Las acciones destructivas (archive, activate) usan POST + sufijo (`/statements/:id/archive`), no DELETE. Vale la pena considerar mismo patrón para descartar (`/drafts/:draftId/discard`).

## Edge cases explícitos

1. **Aceptar dos veces el mismo draft**: el backend debe responder error (probablemente 409 o `draft not in preview_ready`) y el panel debe refrescar la lista para reflejar que el draft ya no existe.
2. **Descartar mientras la IA todavía está procesando** (estado `processing`): no debe aparecer en este panel porque el filtro es `preview_ready | failed`. No es un caso válido.
3. **Lista vacía**: el panel debe mostrar un estado vacío explícito ("No hay borradores pendientes") en vez de quedar oculto, para que el usuario sepa que la vista existe pero está limpia.
4. **Error de red al descartar**: el modal se cierra, el panel muestra un toast/error inline y la lista no se modifica (no se hace rollback optimista).
5. **Múltiples drafts del mismo PDF**: no debería pasar (relación 1:1 via `aiRunId @unique` y `CardStatementDraft.documentId`), pero el panel debe tratar cada draft como independiente.

## Non-obvious details

- `CardStatementDraft.status` por defecto es `"imported"`, no `"preview_ready"`. El paso de `imported` a `preview_ready` lo hace `ai-extraction.service.ts` al validar el JSON. Esto significa que un draft recién creado NO aparece en este panel hasta que la IA termina. Eso es correcto y deseado.
- Los borradores aceptados (`accepted`) tampoco aparecen en este panel: el flujo de aceptación hoy borra el draft (`tx.cardStatementDraft.delete({ where: { id: draftId } })`). Confirmar que esto sigue así para evitar "fantasmas" en la lista.
- El endpoint `/api/import-center` ya devuelve `requiresAction: true` para `needs_review` y `failed`. Es una señal existente que el panel puede reusar para decidir qué acciones mostrar, sin agregar lógica nueva en backend.

## Out of scope (refuerzo)

- Edición inline del preview desde el Centro de importaciones.
- Reprocesamiento automático del draft.
- Drag & drop o selección múltiple.
- Notificaciones / alertas proactivas ("tenés drafts sin revisar").