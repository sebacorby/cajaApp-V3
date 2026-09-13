# US4 Approvals R3/R4 — Evidencia de Cierre T050–T059

**Fecha:** 2026-09-13
**Agente:** Cline (implementación)
**Handoff:** APPCAJA-V3-AGENT-CHAT-US4-T050-T059-HANDOFF-v1.0.0.md

---

## 1. Estado inicial

- **Rama:** feat/agent-chat
- **HEAD:** 9dcaa049db4731f8c5f2aa4b4c0d11606f81c166
- **Node.js:** v24.18.0 (I:\Tools\node-v24.18.0-win-x64)
- **Estado funcional base:** T001–T049 cerrado (validado por handoff)

## 2. Diseño final de approval/hash

- Servicio central `AgentApprovalService` en `workspace/backend/src/modules/agent-chat/agent-approval.service.ts`.
- Canonicalización JSON estable (claves ordenadas, números no-finitos → null) + SHA-256 de `toolName\0canonicalArgs`.
- Estados: `pending -> approved | rejected | expired`. Terminal no vuelve a `pending`.
- Cada approval pertenece a un único `toolCallId`.
- `argumentsHash` se recalcula antes de ejecutar y al aprobar; si cambia, se invalida.

## 4. Implementación T050–T059

### Backend
- `agent-approval.service.ts`: servicio de approvals con hash canónico.
- Exporta `computeArgumentsHash` y `canonicalToolArguments`.
- `agent-tool-executor.ts`: gate R3/R4 con verificación de `approval.status === "approved"` + `argumentsHash`.
- `agent-runner.service.ts`: pausa `awaiting_approval`, resolución por `waitApprovalDecision`, reanudación del mismo run.
- `agent-tool-registry.ts`: 22 R3 + 1 R4 registradas con `makeCriticalTool` + `impactSummary`.
- `agent-chat.controller.ts`: endpoints `POST /api/agent/tool-calls/:id/approve` y `/reject`.
- `agent-chat.schemas.ts`: esquemas `ApproveToolCallSchema`, `RejectToolCallSchema`, `AgentApprovalView`.
- `agent-chat.routes.ts`: rutas wireadas.
- `backup-restore.service.ts`: `restoreStored` con validación previa + `validateStored` expuesta.
- `env.ts`: `AGENT_APPROVAL_TTL_MS` configurable.

### Frontend
- `approval-card.tsx`: componente accesible con botones Confirmar/Cancelar, impacto, riesgo.
- `agent-chat-panel.tsx`: integración de `ApprovalCard`, estado `pendingApproval`, `resolveApproval`.
- `agent-api.ts`: funciones `approveAgentToolCall`, `rejectAgentToolCall`, tipo `AgentApprovalView`.
- `tool-call-card.tsx`: muestra badge de riesgo y estado.

### Tests
- `approvals.test.ts` (T050): 13 tests de servicio/runner, incluyendo canonicalización Zod, waiters concurrentes, transición terminal atómica y orden de estados.

## 5. Resultados focales backend

```
Test Files  38 passed (38)
     Tests  228 passed (228)
  Duration  1.89s
```

Tests focales US4:
- `tests/agent-chat/approvals.test.ts`: 13 passed
- `tests/agent-chat/tool-executor.test.ts`: 15 passed (incluye gate R3/R4)
- `tests/agent-chat/tool-registry.test.ts`: 4 passed (verifica R3/R4)
- `tests/agent-chat/runner.test.ts`: 5 passed

## 6. Resultados Playwright

```
 ✓ tests/agent-chat.spec.ts: Agente IA: launcher global, minimizar/reabrir y mobile
 ✓ tests/agent-chat.spec.ts: Agente IA: read tools reales, multi-tool, navegación y tool inválida
 ✓ tests/agent-chat.spec.ts: Agente IA: R2 explícita ejecuta una vez y ambigüedad no muta
 ✓ tests/agent-chat.spec.ts: Agente IA: Approval Card R3 confirma una vez y cancelar no muta
```

## 7. Pruebas de seguridad R3/R4

- R3 propuesta: handler NO ejecutado antes de approval (tool-executor.test.ts).
- R4 propuesta: handler NO ejecutado antes de validation + approval (impactSummary ejecuta `validateStored`).
- Aprobar con hash correcto ejecuta exactamente una vez (idempotencia por `idempotencyKey`).
- Approval con argumentos alterados/hash distinto no ejecuta (`APPROVAL_ARGUMENTS_MISMATCH`).
- Cancelar/rechaza deja dominio intacto y tool call `rejected` (status en DB + SSE `approval.resolved`).
- Approval expirada no ejecuta (`APPROVAL_EXPIRED`).
- El mismo run continúa después de approve y reject (runner.service.ts).
- Una R2 explícita sigue ejecutando sin Approval Card (`needsApproval` retorna false).
- Una R2 inferida no muta automáticamente (`explicitIntentFor` requiere acción + dominio).
- Tool R3/R4 inexistente o argumentos inválidos nunca llega al handler (validación Zod en executor).

## 8. Evidencia específica de backup.restore (R4)

- `backup.restore` ejecuta `backupRestoreService.validateStored(backupId)` antes del handler.

## 9. Gates completos

| Gate | Resultado |
|------|-----------|
| Node v24.18.0 | ✓ (I:\Tools\node-v24.18.0-win-x64) |
| `npm run build` backend | ✓ (tsc -p tsconfig.json) |
| `tsc --noEmit` backend | ✓ |
| `tsc --noEmit` frontend | ✓ |
| `prisma validate` | ✓ |
| `prisma generate` | ✓ |
| `prisma migrate status` | ✓ (19 migrations up to date) |
| Vitest focales US4 | ✓ (33 audit focal + 4 registry) |
| Vitest completo | ✓ (228 tests, 38 files) |
| Frontend lint completo | ✓ (0 errores, 3 warnings históricos) |
| Frontend production build | ✓ (Next.js 16.2.10) |
| Playwright agent-chat.spec.ts | ✓ (4 tests, workers=1, retries=0) |
| `git diff --check` | ✓ |

## 10. SHA-256 de dev.db

- **Antes:** 7270ef53380b59daa4b0cedc2ecd2c0121ae0f89f0a6b1c4517df4691115d219
- **Después:** 7270ef53380b59daa4b0cedc2ecd2c0121ae0f89f0a6b1c4517df4691115d219
- **Veredicto:** IDÉNTICO. No se modificó el dev.db real.

## 11. Cleanup

- Puertos 11436, 11437, 11501 liberados (procesos terminados).

## 12. Known issues

- Sin known issues bloqueantes de US4. La auditoría del arquitecto agregó E2E real de Approval Card R3 sobre copia aislada de SQLite: `Confirmar` anuló exactamente un movimiento manual y `Cancelar` dejó otro intacto.

## 13. Archivos modificados/nuevos

### Nuevos:
- `workspace/backend/src/modules/agent-chat/agent-approval.service.ts`
- `workspace/backend/tests/agent-chat/approvals.test.ts`
- `workspace/frontend/src/components/finance/agent/approval-card.tsx`
- `specs/001-chat-con-ia/evidence/us4-approvals-closure-20260913/closure.md`

### Modificados:
- `workspace/backend/.env.example`
- `workspace/backend/src/config/env.ts`
- `workspace/backend/src/modules/agent-chat/agent-chat.controller.ts`
- `workspace/backend/src/modules/agent-chat/agent-chat.schemas.ts`
- `workspace/backend/src/modules/agent-chat/agent-runner.service.ts`
- `workspace/backend/src/modules/agent-chat/agent-tool-executor.ts`
- `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`
- `workspace/backend/src/modules/backup-restore/backup-restore.service.ts`
- `workspace/backend/tests/agent-chat/runner.test.ts`
- `workspace/backend/tests/agent-chat/tool-executor.test.ts`
- `workspace/backend/tests/agent-chat/tool-registry.test.ts`
- `workspace/frontend/src/components/finance/agent/agent-chat-panel.tsx`
- `workspace/frontend/src/components/finance/agent/tool-call-card.tsx`
- `workspace/frontend/src/lib/finance/agent-api.ts`
- `workspace/frontend/tests/agent-chat.spec.ts`

---

**Conclusión auditada:** T050–T059 implementados y verdes tras revisión del arquitecto.

- La auditoría corrigió cuatro bordes de US4: hash sobre argumentos Zod validados/canónicos, waiters concurrentes, transición terminal atómica y orden contractual `proposed -> awaiting_approval -> running`.
- Se agregó E2E real R3 sobre `agent-us4-audit.db`: Approval Card `Confirmar` ejecuta la anulación y `Cancelar` no muta.
- La copia temporal partió del mismo SHA-256 que `dev.db`, finalizó con `PRAGMA integrity_check=ok` y fue eliminada junto con logs/reportes.
- El `dev.db` real mantuvo SHA-256 exacto `7270ef53380b59daa4b0cedc2ecd2c0121ae0f89f0a6b1c4517df4691115d219`.
- Puertos 11436/11437/11501 quedaron libres.
- `validateStored` verifica entradas del paquete, checksum database, schema.prisma, migraciones y tablas; `backup.restore` sólo resuelve por `backupId` controlado y no acepta paths arbitrarios.
- Playwright final: **4/4 PASS** (`workers=1`, `retries=0`, headless).
- `waitForDecision` comparte correctamente la misma Promise por tool call y TTL configurable (`AGENT_APPROVAL_TTL_MS`, default 900000ms).
- `expireStale` mantiene la limpieza de approvals vencidas.

## 3. Catálogo R3/R4 exacto registrado

### R3 (22 tools):
- `card_import.accept_draft`, `cards.archive_statement`, `cards.activate_statement`
- `debit_import.accept`, `debit_import.delete`, `debit_import.reverse`
- `salary_receipt.accept_draft`, `salary_receipt.reverse`
- `movements.void_manual`, `cards.delete_manual_purchase`
- `categories.archive`, `categories.restore`
- `incomes.delete_source`, `incomes.delete_event`
- `budgets.delete`, `goals.delete`, `goals.delete_contribution`
- `reconciliation.resolve`, `reconciliation.reopen`
- `month_close.create`, `month_close.reopen`
- `financial_health.delete_snapshot`

### R4 (1 tool):
- `backup.restore` (con validación previa vía `backupRestoreService.validateStored` e impacto detallado)
