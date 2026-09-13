# Tasks: Agente IA Conversacional de CajaApp

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Obligatorios según PRD v1.1.0. En cada historia se escriben primero los tests contractuales/focales correspondientes.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: fijar contratos de prompt/configuración y tipos compartidos sin tocar todavía dominio financiero.

- [X] T001 Crear prompt contractual versionado del agente en `contracts/prompts/agent/01-agent-system.md` con reglas PRD §26 y sin secretos/rutas físicas.
- [X] T002 Agregar configuración `AGENT_*` y `AGENT_PROMPTS_DIR` con defaults del PRD en `workspace/backend/src/config/env.ts` y documentarla en `workspace/backend/.env.example`.
- [X] T003 Crear contrato `AgentChatProvider` y tipos de mensajes/tool calls/stream en `workspace/backend/src/modules/ai/agent/agent-chat-provider.ts`.
- [X] T004 Crear tipos transversales de run, eventos, riesgo y referencias en `workspace/backend/src/modules/agent-chat/agent-types.ts`.
- [X] T005 Crear schemas Zod base de IDs, conversación, mensaje, run y approval en `workspace/backend/src/modules/agent-chat/agent-chat.schemas.ts`.

**Checkpoint**: contratos base compilables y sin dependencia nueva.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: persistencia Agent*, provider determinístico y event stream; bloquea todas las historias.

- [X] T006 [P] Escribir tests de persistencia/cascade/idempotencia de modelos Agent* en `workspace/backend/tests/agent-chat/persistence.test.ts` antes de modificar Prisma.
- [X] T007 Agregar `AgentConversation`, `AgentMessage`, `AgentAttachment`, `AgentRun`, `AgentToolCall`, `AgentApproval` y relaciones/índices del `data-model.md` en `workspace/backend/prisma/schema.prisma`.
- [X] T008 Crear migración `workspace/backend/prisma/migrations/<timestamp>_add_agent_chat/migration.sql` que sólo agregue tablas/índices Agent* y validar sobre copia de `dev.db`.
- [X] T009 [P] Escribir tests del contrato provider, cancelación y tool calls en `workspace/backend/tests/agent-chat/provider.test.ts`.
- [X] T010 Implementar `FakeAgentChatProvider` determinístico en `workspace/backend/src/modules/ai/agent/fake-agent-chat-provider.ts`.
- [X] T011 [P] Implementar adapter Ollama `/api/chat` streaming/tool calling en `workspace/backend/src/modules/ai/agent/ollama-agent-chat.client.ts` con tests de parsing en `workspace/backend/tests/agent-chat/provider.test.ts`.
- [X] T012 [P] Implementar adapter OpenAI-compatible sólo cuando declara tool calling compatible en `workspace/backend/src/modules/ai/agent/openai-compatible-agent-chat.client.ts` con tests de parsing.
- [X] T013 Implementar factory/inyección de provider en `workspace/backend/src/modules/ai/agent/agent-chat-provider.factory.ts`, permitiendo fake explícito en tests sin afectar extracción documental.
- [X] T014 [P] Escribir tests de secuencia, replay y heartbeat en `workspace/backend/tests/agent-chat/events.test.ts`.
- [X] T015 Implementar buffer SSE por run, secuencia monótona, replay y heartbeat en `workspace/backend/src/modules/agent-chat/agent-events.service.ts`.

**Checkpoint**: `prisma generate`, build y tests foundation verdes; `ai-advisor` y extracción documental intactos.

---

## Phase 3: User Story 1 - Conversar desde cualquier pantalla (Priority: P1) MVP

**Goal**: conversación general persistente, launcher global, streaming, cancelación y CRUD de chats.

**Independent Test**: abrir launcher desde Dashboard, conversar con fake provider sin tools, minimizar/reabrir, cambiar de sección y conservar el hilo.

### Tests for User Story 1

- [X] T016 [P] [US1] Escribir tests CRUD/paginación/cascade de conversaciones en `workspace/backend/tests/agent-chat/conversations.test.ts`.
- [X] T017 [P] [US1] Escribir tests runner de conversación general, persistencia de user/assistant y cancelación en `workspace/backend/tests/agent-chat/runner.test.ts`.
- [X] T018 [P] [US1] Crear Playwright inicial de launcher/panel/minimizar/reabrir/mobile en `workspace/frontend/tests/agent-chat.spec.ts` antes de implementar UI.

### Implementation for User Story 1

- [X] T019 [US1] Implementar CRUD/paginación de conversaciones y mensajes en `workspace/backend/src/modules/agent-chat/agent-chat.service.ts`.
- [X] T020 [US1] Implementar creación/cancelación/snapshot de runs y loop sin tools con provider inyectable en `workspace/backend/src/modules/agent-chat/agent-runner.service.ts`.
- [X] T021 [US1] Implementar controller HTTP/SSE en `workspace/backend/src/modules/agent-chat/agent-chat.controller.ts`.
- [X] T022 [US1] Implementar rutas `/api/agent` de conversaciones, mensajes, runs, cancel y events en `workspace/backend/src/modules/agent-chat/agent-chat.routes.ts`.
- [X] T023 [US1] Registrar `agentChatRoutes` en `workspace/backend/src/app.ts`.
- [X] T024 [P] [US1] Crear cliente tipado de conversaciones/runs/SSE en `workspace/frontend/src/lib/finance/agent-api.ts`.
- [X] T025 [US1] Agregar estado visual `agentOpen`, `activeAgentConversationId` y acciones relacionadas sin agregar `SectionId` en `workspace/frontend/src/lib/finance/ui-store.ts`.
- [X] T026 [P] [US1] Implementar launcher circular accesible en `workspace/frontend/src/components/finance/agent/agent-launcher.tsx`.
- [X] T027 [P] [US1] Implementar header, lista de mensajes, contenido Markdown, empty state y composer en `workspace/frontend/src/components/finance/agent/conversation-header.tsx`, `message-list.tsx`, `message-content.tsx`, `agent-empty-state.tsx`, `agent-composer.tsx`.
- [X] T028 [US1] Implementar panel desktop/mobile, historial básico y conexión SSE/cancel en `workspace/frontend/src/components/finance/agent/agent-chat-panel.tsx` y `conversation-drawer.tsx`.
- [X] T029 [US1] Montar una única instancia persistente launcher/panel en `workspace/frontend/src/components/finance/layout/app-shell.tsx` y cerrar Playwright US1.

**Checkpoint**: MVP conversacional usable con provider fake en tests y provider real configurable en runtime.

---

## Phase 4: User Story 2 - Consultar datos reales y navegar (Priority: P1)

**Goal**: responder sobre CajaApp con tools de lectura reales y navegar al destino correcto sin cerrar el chat.

**Independent Test**: preguntar gasto/presupuesto, ver Tool Cards completadas y ejecutar `ui.navigate` manteniendo el panel abierto.

### Tests for User Story 2

- [X] T030 [P] [US2] Escribir tests de registry cerrado, risk classes congeladas y tool desconocida en `workspace/backend/tests/agent-chat/tool-registry.test.ts`.
- [X] T031 [P] [US2] Escribir tests de ejecución paralela sólo para reads `parallelSafe`, validación de args y projector sin secretos en `workspace/backend/tests/agent-chat/tool-executor.test.ts`.
- [X] T032 [P] [US2] Extender `workspace/frontend/tests/agent-chat.spec.ts` con consulta financiera real, Tool Card y navegación AC-02/08/13/14.

### Implementation for User Story 2

- [X] T033 [US2] Implementar registry base, lookup cerrado y metadata pública en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [X] T034 [US2] Implementar executor de reads, validación y paralelismo seguro en `workspace/backend/src/modules/agent-chat/agent-tool-executor.ts`.
- [X] T035 [P] [US2] Registrar tools read de búsqueda/dashboard/movimientos/categorías en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts` delegando a services existentes.
- [X] T036 [P] [US2] Registrar tools read de tarjetas/import-center/debit/salary en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [X] T037 [P] [US2] Registrar tools read de ingresos/presupuestos/objetivos/future/reportes/salud/cierres/backups/settings en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [X] T038 [US2] Integrar tool calls/result messages y reads paralelos en `workspace/backend/src/modules/agent-chat/agent-runner.service.ts`.
- [X] T039 [P] [US2] Implementar Tool Card y actividad resumida en `workspace/frontend/src/components/finance/agent/tool-call-card.tsx` y `activity-panel.tsx`.
- [X] T040 [US2] Implementar `ui.navigate` validado contra `useFinanceUI` desde eventos del agente en `workspace/frontend/src/components/finance/agent/agent-chat-panel.tsx`.

**Checkpoint**: preguntas sobre estado actual usan sólo tools registradas; ninguna read muta dominio.

---

## Phase 5: User Story 3 - Ejecutar acciones normales sin fricción (Priority: P1)

**Goal**: ejecutar R2 explícitas sin confirmación redundante, pedir confirmación si son inferidas y evitar duplicados.

**Independent Test**: crear/editar una entidad normal una sola vez desde lenguaje natural y bloquear mutación ambigua.

### Tests for User Story 3

- [ ] T041 [P] [US3] Escribir tests de explicit-intent R2, ambigüedad e idempotencia en `workspace/backend/tests/agent-chat/tool-executor.test.ts`.
- [ ] T042 [P] [US3] Extender Playwright con creación de movimiento R2 y caso ambiguo AC-03/04 en `workspace/frontend/tests/agent-chat.spec.ts`.

### Implementation for User Story 3

- [ ] T043 [US3] Agregar evaluación de explicit intent suministrada por el runner y política R2 en `workspace/backend/src/modules/agent-chat/agent-tool-executor.ts` sin confiar en risk/input del modelo.
- [ ] T044 [US3] Implementar idempotencia durable usando `AgentToolCall.idempotencyKey` en `workspace/backend/src/modules/agent-chat/agent-tool-executor.ts`.
- [ ] T045 [P] [US3] Registrar R2 de movimientos/categorías en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [ ] T046 [P] [US3] Registrar R2 de ingresos/presupuestos/objetivos en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [ ] T047 [P] [US3] Registrar R2 de exchange rate/compra manual/backup create/settings en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [ ] T048 [US3] Persistir resultados exitosos antes de devolver tool result al modelo y serializar writes en `workspace/backend/src/modules/agent-chat/agent-runner.service.ts`.
- [ ] T049 [US3] Mostrar acciones R2 ejecutadas/fallidas con resultado real en `workspace/frontend/src/components/finance/agent/tool-call-card.tsx` y cerrar tests US3.

**Checkpoint**: R2 explícita funciona una vez; R2 inferida nunca muta sin confirmación.

---

## Phase 6: User Story 4 - Aprobar acciones críticas con impacto visible (Priority: P1)

**Goal**: pausar R3/R4, mostrar impacto, aprobar/rechazar exactamente una tool call y continuar el mismo run.

**Independent Test**: pedir cierre mensual o restore, comprobar cero mutación antes de confirmar y validar rechazo/aprobación.

### Tests for User Story 4

- [ ] T050 [P] [US4] Escribir tests de approval requerida, hash de argumentos, rechazo y continuación de run en `workspace/backend/tests/agent-chat/approvals.test.ts`.
- [ ] T051 [P] [US4] Escribir tests de que R3/R4 nunca ejecutan sin approval y no pueden bypassarse en `workspace/backend/tests/agent-chat/tool-executor.test.ts`.
- [ ] T052 [P] [US4] Extender Playwright con Approval Card, confirmar/cancelar y restore validation AC-05/06 en `workspace/frontend/tests/agent-chat.spec.ts`.

### Implementation for User Story 4

- [ ] T053 [US4] Implementar creación/resolución/expiración de approvals y `argumentsHash` en `workspace/backend/src/modules/agent-chat/agent-approval.service.ts`.
- [ ] T054 [US4] Agregar endpoints approve/reject y schemas correspondientes en `workspace/backend/src/modules/agent-chat/agent-chat.controller.ts`, `agent-chat.routes.ts` y `agent-chat.schemas.ts`.
- [ ] T055 [US4] Integrar pausa `awaiting_approval`, confirmación/rechazo y reanudación del mismo run en `workspace/backend/src/modules/agent-chat/agent-runner.service.ts`.
- [ ] T056 [P] [US4] Registrar tools R3 de accept/archive/reverse/delete/reconciliation/month close/health delete en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [ ] T057 [US4] Registrar `backup.restore` como R4 con validación previa y projector de impacto en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- [ ] T058 [P] [US4] Implementar Approval Card accesible en `workspace/frontend/src/components/finance/agent/approval-card.tsx`.
- [ ] T059 [US4] Conectar approve/reject a `agent-api.ts` y panel, invalidar UI si cambian argumentos y cerrar tests US4.

**Checkpoint**: ninguna R3/R4 muta sin approval válida ligada a argumentos exactos.

---

## Phase 7: User Story 5 - Importar documentos desde la conversación (Priority: P2)

**Goal**: stage PDF/CSV, consumirlos sólo mediante import tools y conservar draft/review/accept.

**Independent Test**: adjuntar PDF/CSV válido, iniciar importación y obtener draft sin materializar; aceptar sigue requiriendo R3.

### Tests for User Story 5

- [ ] T060 [P] [US5] Escribir tests de upload MIME/tamaño/ownership/storage path y delete cascade en `workspace/backend/tests/agent-chat/attachments.test.ts`.
- [ ] T061 [P] [US5] Escribir tests de import tools para cards/debit/salary manteniendo draft-first en `workspace/backend/tests/agent-chat/import-tools.test.ts`.
- [ ] T062 [P] [US5] Extender Playwright con attachment PDF/CSV, preview y accept R3 AC-07 en `workspace/frontend/tests/agent-chat.spec.ts`.

### Implementation for User Story 5

- [ ] T063 [US5] Implementar staging local seguro, hash, ownership y asociación a mensajes en `workspace/backend/src/modules/agent-chat/agent-chat.service.ts`.
- [ ] T064 [US5] Agregar endpoint multipart de attachments y validaciones en `workspace/backend/src/modules/agent-chat/agent-chat.controller.ts`, `agent-chat.routes.ts` y `agent-chat.schemas.ts`.
- [ ] T065 [US5] Registrar tools card/debit/salary upload/update + backup.validate/reconciliation.scan/health snapshot en `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts` usando `attachmentId` exclusivamente.
- [ ] T066 [P] [US5] Implementar chip/selector de PDF/CSV y upload en `workspace/frontend/src/components/finance/agent/attachment-chip.tsx` y `agent-composer.tsx`.
- [ ] T067 [US5] Mostrar progreso/draft generado y mantener accept como Approval Card en `agent-chat-panel.tsx`; cerrar tests US5.

**Checkpoint**: documentos se importan desde chat sin saltar draft/review/accept ni exponer filesystem.

---

## Phase 8: User Story 6 - Recuperar conversaciones y trabajos interrumpidos (Priority: P2)

**Goal**: memoria compactada, snapshot durable, reconexión SSE y continuidad tras restart sin duplicar tools.

**Independent Test**: interrumpir run/reload/restart, recuperar snapshot/referencias y continuar sin repetir mutaciones.

### Tests for User Story 6

- [ ] T068 [P] [US6] Escribir tests de context assembly, recent messages, summary y entity refs en `workspace/backend/tests/agent-chat/memory.test.ts`.
- [ ] T069 [P] [US6] Extender tests runner con max steps, provider failure, restart snapshot y `cancelled_after_tool` en `workspace/backend/tests/agent-chat/runner.test.ts`.
- [ ] T070 [P] [US6] Extender Playwright con reload/reconnect/minimized activity/masking AC-09/10/11/18/19 en `workspace/frontend/tests/agent-chat.spec.ts`.

### Implementation for User Story 6

- [ ] T071 [US6] Implementar memoria, resumen versionado y preservación de entity refs/pending actions en `workspace/backend/src/modules/agent-chat/agent-memory.service.ts`.
- [ ] T072 [US6] Implementar armado de contexto con settings locales, prompt versionado, summary, recent messages y catálogo de tools en `workspace/backend/src/modules/agent-chat/agent-context.service.ts`.
- [ ] T073 [US6] Integrar límites `AGENT_MAX_*`, max steps, recovery de snapshot y cancelación robusta en `workspace/backend/src/modules/agent-chat/agent-runner.service.ts`.
- [ ] T074 [US6] Persistir y exponer provider/model, tool count, tokens, errores sanitizados y `lastEventSequence` en runs.
- [ ] T075 [P] [US6] Completar `activity-panel.tsx` con detalles técnicos sanitizados, estado minimizado y badge del launcher.
- [ ] T076 [US6] Implementar reconexión con snapshot + `Last-Event-ID`, dedupe `(runId, sequence)` y continuidad al cambiar sección en `agent-chat-panel.tsx`/`agent-api.ts`.

**Checkpoint**: conversaciones/referencias sobreviven restart y las reconexiones no repiten tools exitosas.

---

## Phase 9: Polish & Cross-Cutting Convergence

- [ ] T077 [P] Agregar pruebas explícitas de que borrar conversación no toca dominio y result projectors no filtran secretos en `workspace/backend/tests/agent-chat/security.test.ts`.
- [ ] T078 [P] Verificar y extender test existente de no mutación de `ai-advisor` en `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts` sin cambiar su contrato.
- [ ] T079 [P] Completar accesibilidad, focus, 44×44 px, responsive 390×844 y dark/light en `workspace/frontend/tests/agent-chat.spec.ts` y componentes `agent/*`.
- [ ] T080 Ejecutar quickstart focal completo de `specs/001-chat-con-ia/quickstart.md` con provider fake/determinístico para contrato y registrar hallazgos.
- [ ] T081 Ejecutar `prisma generate`, migrate deploy/status sobre campaña controlada, `PRAGMA integrity_check`/`foreign_key_check`, backend build y Vitest completo con Node `v24.18.0`.
- [ ] T082 Ejecutar frontend `typecheck`, `lint`, `build` standalone y Playwright completo `workers:1`, `retries:0`, sin skips/filtros.
- [ ] T083 Restaurar `workspace/backend/prisma/dev.db` al SHA-256 exacto pre-campaña y detener servicios/puertos 11436/11437.
- [ ] T084 Actualizar `features/`/grounding y documentación viva del agente sólo después de gates verdes.
- [ ] T085 Registrar `CIERRE / APP-AGENT-CHAT-001` en `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md` con veredicto PASS/FAIL/BLOCKED y commit final.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 son bloqueantes.
- US1 requiere Phase 2 y entrega el MVP visual/conversacional.
- US2 requiere runner/eventos de US1; sus tools read no dependen de writes.
- US3 requiere registry/executor de US2.
- US4 requiere executor/idempotencia de US3.
- US5 requiere approvals para los accepts críticos, aunque staging/upload puede desarrollarse en paralelo tras US1.
- US6 puede comenzar tras US1 y se integra definitivamente después de tool/approval states.
- Convergence depende de las historias seleccionadas como alcance de release; para cerrar APP-AGENT-CHAT-001 requiere US1–US6 completas.

## Parallel Opportunities

- T006/T009/T014 pueden prepararse en paralelo porque cubren persistence/provider/events en archivos distintos.
- Adapters T011/T012 pueden implementarse en paralelo tras T009.
- En US1, T024/T026/T027 pueden avanzar en paralelo una vez fijado el contrato HTTP.
- Grupos de tools read T035/T036/T037 pueden desarrollarse en paralelo con coordinación sobre el registry.
- Grupos R2 T045/T046/T047 pueden desarrollarse en paralelo con coordinación sobre el registry.
- Tests frontend/backend marcados [P] pueden escribirse antes de su implementación correspondiente.

## Implementation Strategy

### MVP first

1. Completar T001–T015 (Setup + Foundation).
2. Completar T016–T029 (US1).
3. Validar chat general persistente y launcher global antes de agregar tools financieras.

### Incremental delivery

- Incremento 1: Foundation + chat general.
- Incremento 2: reads/navegación.
- Incremento 3: writes R2.
- Incremento 4: approvals R3/R4.
- Incremento 5: imports/attachments.
- Incremento 6: recovery/memory y convergencia.

## Format Validation

Total: **85 tasks**. Todos siguen `- [ ] T### [P?] [US?] descripción con path` y las tareas de historia incluyen `[US#]`. No quedan placeholders del template.
