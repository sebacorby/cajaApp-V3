# Design: 001-chat-con-ia

## Stack

| Aspect | Choice | Rationale |
|---|---|---|
| Runtime | Node.js `v24.18.0` from `I:\Tools\node-v24.18.0-win-x64` | Explicit project/runtime contract and both manifests require the exact version. |
| Backend | Fastify 5 + TypeScript | Existing backend stack; no framework change is authorized. |
| Frontend | Next.js 16 + React 19 + TypeScript | Existing frontend stack; the agent is already mounted in the application shell. |
| Persistence | SQLite + Prisma 6 | Existing local-first persistence and Agent* models are already migrated. |
| Validation | Zod | Existing backend contracts validate routes and tool inputs before execution. |
| State | Existing React/Zustand UI state + persisted Agent* rows | Local UI state is only presentation state; conversation/run state remains durable in SQLite. |
| Communication | REST for commands/snapshots + SSE for run events | Explicit PRD contract and existing implementation. |
| Deployment | Local Windows x64 | Explicit product/runtime contract; no remote deployment target is introduced. |
| Identity | Single local owner; no new auth layer | Existing local-personal product model; this change adds no multi-user authorization system. |

## Dependencies

No dependency changes. The change keeps the existing packages below unchanged.

| Action | Package | Why this package | Why not the alternative |
|---|---|---|---|
| keep | `fastify` | Existing `/api/agent` controller and lifecycle | Replacing the HTTP framework is outside scope. |
| keep | `@fastify/multipart` | Existing multipart support for attachment upload | Avoid custom multipart parsing. |
| keep | `zod` | Existing route/tool input validation | Reuse the current validation contract. |
| keep | `prisma` / `@prisma/client` | Existing Agent* and domain persistence | No storage/ORM migration is required. |
| keep | `next` / `react` | Existing global agent UI | No frontend framework change. |
| keep | `zustand` | Existing global agent-open/active-conversation UI state | No second state store is needed. |
| keep | `react-markdown` | Existing assistant Markdown rendering | No new renderer is required. |
| keep | `lucide-react` | Existing launcher/composer icons | Keep the current design-system icon source. |
| keep | `vitest` | Existing backend contract/unit suite | Preserve the current test runner. |
| keep | `@playwright/test` | Existing agent-chat browser/E2E suite | Preserve the current E2E harness. |
| keep | `eslint` | Existing frontend lint gate | No code-quality tool change. |

## Data Model

The current Prisma Agent* schema remains authoritative; no new migration is required for US5. The attachment contract used by this change is:

```prisma
model AgentAttachment {
  id             String   @id @default(uuid())
  conversationId String
  conversation   AgentConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  messageId      String?
  message        AgentMessage? @relation(fields: [messageId], references: [id], onDelete: SetNull)
  fileName       String
  mimeType       String
  sizeBytes      Int
  sha256         String
  storagePath    String
  status         String   @default("staged")
  createdAt      DateTime @default(now())

  @@index([conversationId, createdAt])
  @@index([sha256])
}
```
The attachment row stores ownership and integrity metadata. `storagePath` is backend-internal only. AgentConversation, AgentMessage, AgentRun, AgentToolCall and AgentApproval remain unchanged and continue to cascade only inside the Agent* aggregate.

## Interface

| Method | Path / surface | Request | Response / behavior |
|---|---|---|---|
| GET | `/api/agent/conversations` | status/cursor/limit | Persisted conversation summaries. |
| POST | `/api/agent/conversations` | optional title | Creates an active conversation. |
| PUT | `/api/agent/conversations/:id` | title/status | Rename/archive/reactivate. New input to archived conversation must reactivate before run creation. |
| DELETE | `/api/agent/conversations/:id` | — | Deletes Agent* history and staged bytes only; never referenced finance entities. |
| POST | `/api/agent/conversations/:id/attachments` | multipart field `file` | Stages one `.pdf` or `.csv`; returns safe attachment metadata without `storagePath`. |
| GET | `/api/agent/conversations/:id/attachments` | — | Lists safe attachment metadata owned by the conversation. |
| DELETE | `/api/agent/conversations/:id/attachments/:attachmentId` | — | Deletes the owned attachment record and remaining staging bytes. |
| POST | `/api/agent/conversations/:id/messages` | `{ content, attachmentIds[] }` | Validates ownership, links attachments to the user message and starts one run. |
| GET | `/api/agent/runs/:runId` | — | Recoverable run snapshot. |
| GET | `/api/agent/runs/:runId/events` | `Last-Event-ID` when reconnecting | SSE sequence/replay stream. |
| POST | `/api/agent/runs/:runId/cancel` | — | Requests controlled cancellation. |
| POST | `/api/agent/tool-calls/:toolCallId/approve` | `{}` | Resolves an exact R3/R4 approval and resumes the same run. |
| POST | `/api/agent/tool-calls/:toolCallId/reject` | optional reason | Rejects without mutation and resumes the same run. |

Provider context contains safe attachment metadata in terms of `attachmentId`, filename, canonical MIME and size only. File bytes and storage paths are never inserted into the model message.
## State Transitions

### Attachment lifecycle

| From | Action | To | Constraints |
|---|---|---|---|
| — | Successful stage | `staged` | Extension `.pdf`/`.csv`, size within limit, owned conversation exists, SHA-256 persisted. |
| `staged` | Link to user message | `staged` | `attachmentId` must belong to the same conversation; message association does not consume bytes. |
| `staged` | Start domain import | `staged` | Resolve by conversation + attachment ID and verify stored size/hash before reading bytes. |
| `staged` | Import fails before recoverable draft/preview | `staged` | Keep bytes so the same valid attachment can be retried. |
| `staged` | Recoverable draft/preview exists | `consumed` | Mark consumed and remove only the agent-chat staging bytes. |
| `staged` | User deletes attachment | deleted | Delete row and staging bytes; ownership is mandatory. |
| `staged` | Conversation is deleted | deleted | Agent cascade + physical staged-file cleanup; finance/domain records are untouched. |

### Conversation continuation

| From | Action | To | Constraints |
|---|---|---|---|
| `archived` | User sends new input | `active` | Reactivate the same conversation before persisting/starting the new run. |
| `active` | Archive | `archived` | Existing messages, tool calls and approvals stay persisted. |

### Critical tool execution

| From | Action | To | Constraints |
|---|---|---|---|
| `proposed` | Valid R3/R4 proposal | `awaiting_approval` | Hash canonical Zod-valid arguments. |
| `awaiting_approval` | Exact approval | `running` | Approval hash must still match; same run continues. |
| `awaiting_approval` | Reject/expire | `rejected` / terminal | No mutation occurs. |
| `running` | Domain service succeeds | `succeeded` | Persist result under durable idempotency before model continuation. |
## Architecture Decisions

### Closed agent capability boundary

| | |
|---|---|
| **Choice** | `LLM -> closed registry -> explicit tool -> existing service -> domain`. |
| **Alternatives** | Direct Prisma/SQL, arbitrary service reflection, internal loopback HTTP. |
| **Rationale** | Explicit PRD invariant; preserves domain validation, auditability and local-first safety. |

### Attachment admission

| | |
|---|---|
| **Choice** | Stage by `.pdf` / `.csv` extension with canonical MIME normalization; let the existing import service validate/process content. |
| **Alternatives** | Strict browser MIME allowlist; staging-time content signature/parser validation. |
| **Rationale** | User chose technical option 1C; avoids Windows/browser MIME false negatives and does not duplicate domain parsing logic. |

### Staging isolation

| | |
|---|---|
| **Choice** | `STORAGE_DIR/agent-chat/<conversationId>/<uuid>.<ext>`. |
| **Alternatives** | One flat `agent-chat` staging directory with ownership only in SQLite. |
| **Rationale** | User chose technical option 2A; physical layout mirrors conversation ownership and simplifies cleanup boundaries. |

### Consumption timing

| | |
|---|---|
| **Choice** | Keep bytes staged through processing; consume/delete staging bytes only when a recoverable draft/preview exists. |
| **Alternatives** | Consume immediately after calling the domain service; retain staging bytes for the whole conversation lifetime. |
| **Rationale** | User chose technical option 3A and product retry decision 3A; this preserves retryability without retaining redundant bytes after durable domain state exists. |
## File Structure

```text
workspace/backend/src/modules/agent-chat/
  agent-chat.service.ts          # conversation + attachment staging/ownership/lifecycle
  agent-chat.controller.ts       # REST/multipart attachment endpoints
  agent-chat.schemas.ts          # route/message/attachment identifiers and validation
  agent-runner.service.ts        # run loop, explicit intent, attachment context
  agent-tool-registry.ts         # closed tool catalog including Phase F tools
  agent-tool-executor.ts         # validated execution + idempotency/approval gate
workspace/backend/tests/agent-chat/
  attachments.test.ts            # T060 attachment contract
  import-tools.test.ts           # T061 draft-first/import-tool contract
workspace/frontend/src/lib/finance/
  agent-api.ts                   # attachment/message/run API client
workspace/frontend/src/components/finance/agent/
  attachment-chip.tsx            # new staged/upload/error chip
  agent-composer.tsx             # hidden file selector + chips + send/remove behavior
  agent-chat-panel.tsx           # upload orchestration, progress/result, retry/approval continuity
workspace/frontend/tests/
  agent-chat.spec.ts             # T062 US5 Playwright coverage
```

Future FEAT-006 implementation may add `agent-memory.service.ts` and `agent-context.service.ts`, but those files are outside the current T060-T067 execution boundary.

## Validation Rules

| Entity / surface | Field | Rule |
|---|---|---|
| Attachment upload | filename | Basename for display; staging admission requires case-insensitive `.pdf` or `.csv`. |
| Attachment upload | bytes | Length must be `1..10 MiB` inclusive. |
| Attachment upload | mimeType | Normalize from accepted extension (`application/pdf` or `text/csv`); browser MIME does not decide staging admission. |
| AgentAttachment | conversationId | Must reference an existing conversation and match every later resolve/link/delete operation. |
| AgentAttachment | storagePath | Must resolve inside `STORAGE_DIR/agent-chat/<conversationId>/`; never returned to frontend/provider. |
| AgentAttachment | sha256/sizeBytes | Recompute/verify before domain consumption; mismatch fails closed. |
| Message input | attachmentIds | UUIDs only, max 10, unique for processing, and all must be staged/owned by the target conversation. |
| Import tools | attachmentId | UUID only; arbitrary path/string input is rejected by strict Zod schema. |
| Import processing | file content | Existing card/debit/salary domain service/parser remains authoritative for invalid content. |
| Critical accept | arguments | Existing R3 schema + canonical arguments hash + explicit Approval Card; no auto-accept. |
## Tooling

| Concern | Choice | Source |
|---|---|---|
| Runtime invocation | Exact Node `I:\Tools\node-v24.18.0-win-x64` | PRD + package manifests |
| Backend type/build | TypeScript `tsc` | Existing backend scripts |
| Backend tests | Vitest | Existing manifest and agent-chat suites |
| ORM validation/client | Prisma CLI | Existing backend scripts and schema |
| Frontend typecheck/build | TypeScript + Next.js build | Existing frontend scripts |
| Frontend lint | ESLint | Existing frontend scripts |
| Browser/E2E | Playwright, `workers:1`, `retries:0` for controlled campaign | Existing project gate |
| Database safety | Temporary SQLite copy + `PRAGMA integrity_check` + `foreign_key_check` | Existing SSOT campaign policy |

## Feature-specific decisions

### FEAT-001 — Global agent conversation

- Preserve the existing widget/panel architecture; no new route/SectionId or framework.
- A message sent to an archived conversation automatically reactivates that same conversation before run creation (user product decision 4B).
- Attachment-only input may create/persist the user message but cannot imply an import action; the model must ask for intent (user product decision 2A).

### FEAT-002 — Real CajaApp data and navigation

- Registry remains closed and versioned; unknown names fail without reflection.
- Read tools may run in parallel only when `riskClass=R0` and `parallelSafe=true`.
- Navigation is emitted as validated UI events; the model never manipulates frontend state directly.

### FEAT-003 — Normal CajaApp actions

- Existing explicit-intent classifier remains runtime-owned; model risk metadata cannot authorize writes.
- Ambiguous target references remain read/clarify flows, not implicit mutation authorization.
- R2 execution stays durable/idempotent and serial.
### FEAT-004 — Critical action approvals

- R3/R4 use the existing approval engine; canonical Zod-valid arguments are hashed before waiting.
- Approval/rejection resumes the same run; changed arguments require a new matching approval.
- `backup.restore` remains R4 and accepts a persisted `backupId` only.

### FEAT-005 — Document imports from the conversation

- Stage by extension `.pdf`/`.csv`, not browser MIME (user technical decision 1C).
- Use per-conversation physical staging directory (user technical decision 2A).
- Multiple explicitly requested attachments are processed one by one as independent workflows (user product decision 1A).
- Never start an import merely because an attachment exists (user product decision 2A).
- Keep the same staged file retryable after a pre-draft processing failure (user product decision 3A).
- Mark consumed/delete staging bytes only after a recoverable draft/preview exists (user technical decision 3A).
- Exact R2 Phase F catalog: `card_import.upload_attachment`, `card_import.update_draft`, `debit_import.preview_attachment`, `debit_import.update_row`, `salary_receipt.import_attachment`, `salary_receipt.update_draft`, `backup.validate`, `reconciliation.scan`, `financial_health.create_snapshot`.
- Attachment-based import tools accept only `attachmentId`; no path argument exists.
- `card_import.accept_draft`, `debit_import.accept`, and `salary_receipt.accept_draft` remain separate R3 operations.

### FEAT-006 — Recovery and continuity

- Planned architecture uses persisted Agent* state, run snapshots, event sequence replay and compacted context with preserved entity references.
- This implementation remains explicitly outside current T060-T067 authorization.

### FEAT-007 — Agent safety boundaries

- Keep direct domain mutation impossible outside registered handlers/services.
- Never expose agent staging paths, secrets or arbitrary filesystem access to provider context.
- Reuse the existing `hideAmounts` presentation behavior rather than adding agent-specific masking logic.
- Preserve AI Advisor as a separate explain-only vertical.
