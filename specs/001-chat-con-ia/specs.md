# Specs: 001-chat-con-ia

Behavioral scenarios: [functional/gherkin.md](functional/gherkin.md)

## Requirements

### FEAT-001: Global agent conversation

**Type:** functional
**Scenarios:** [functional/gherkin.md#feat-001-global-agent-conversation](functional/gherkin.md#feat-001-global-agent-conversation)
**Feature file:** [functional/features/FEAT-001-global-agent-conversation.feature](functional/features/FEAT-001-global-agent-conversation.feature)

**Implementation notes:**
- Keep the agent mounted globally in `AppShell`; it must not become a `SectionId`.
- Persist conversation and message state locally in the existing Agent* Prisma models.
- Sending a new message to an archived conversation must reactivate that same conversation before starting the run.
- Keep one active run per conversation; minimizing/closing the panel never cancels persisted work implicitly.

### FEAT-002: Real CajaApp data and navigation

**Type:** functional
**Scenarios:** [functional/gherkin.md#feat-002-real-cajaapp-data-and-navigation](functional/gherkin.md#feat-002-real-cajaapp-data-and-navigation)
**Feature file:** [functional/features/FEAT-002-real-data-and-navigation.feature](functional/features/FEAT-002-real-data-and-navigation.feature)

**Implementation notes:**
- Current-state claims must originate from the closed backend tool registry and existing domain services.
- Read-only tools marked `parallelSafe` may run in parallel; mutations remain serialized.
- `ui.navigate` may emit only validated CajaApp section/record targets understood by `useFinanceUI`.
- Unknown tool names and invalid arguments fail closed and remain auditable.

### FEAT-003: Normal CajaApp actions

**Type:** functional
**Scenarios:** [functional/gherkin.md#feat-003-normal-cajaapp-actions](functional/gherkin.md#feat-003-normal-cajaapp-actions)
**Feature file:** [functional/features/FEAT-003-normal-actions.feature](functional/features/FEAT-003-normal-actions.feature)

**Implementation notes:**
- R2 handlers delegate to existing domain services and their current Zod validation.
- Explicit intent is required for normal mutations; ambiguous references cannot authorize a write.
- Writes execute serially and use durable idempotency keyed by `runId:providerCallId`/tool-call identity.
- Persist the successful result before returning the tool result to the model.

### FEAT-004: Critical action approvals

**Type:** functional
**Scenarios:** [functional/gherkin.md#feat-004-critical-action-approvals](functional/gherkin.md#feat-004-critical-action-approvals)
**Feature file:** [functional/features/FEAT-004-critical-approvals.feature](functional/features/FEAT-004-critical-approvals.feature)

**Implementation notes:**
- R3/R4 arguments pass tool Zod validation before the approval hash is computed.
- Approval is bound to the exact canonical arguments; any argument change invalidates it.
- Required transition is `proposed -> awaiting_approval -> running`; approve/reject resolution is terminal and atomic.
- Reject/expiry never executes the mutation; approve/reject continues the same run.
- `backup.restore` accepts only persisted `backupId`, validates first, and exposes impact before approval.

### FEAT-005: Document imports from the conversation

**Type:** functional
**Scenarios:** [functional/gherkin.md#feat-005-document-imports-from-the-conversation](functional/gherkin.md#feat-005-document-imports-from-the-conversation)
**Feature file:** [functional/features/FEAT-005-document-imports-from-chat.feature](functional/features/FEAT-005-document-imports-from-chat.feature)

**Implementation notes:**
- Staging accepts files by extension only: `.pdf` and `.csv`, max 10 MiB. Domain import services remain responsible for rejecting invalid content.
- Normalize the stored/import MIME from the accepted extension; never use a model-supplied filesystem path.
- Store bytes under `STORAGE_DIR/agent-chat/<conversationId>/<uuid>.<ext>` and persist SHA-256, size, filename metadata and conversation ownership.
- The model/provider receives `attachmentId` plus safe metadata only; internal `storagePath` never leaves the backend service boundary.
- Several attachments in one message remain independent import workflows and may be processed sequentially in the same requested work.
- An attachment without explicit import intent starts no import.
- Keep staging bytes reusable while processing has not produced a recoverable draft/preview. On domain failure before that point, leave the attachment staged.
- Once a recoverable draft/preview exists, mark the attachment `consumed` and remove only the staging bytes; the domain draft/document becomes the durable source.
- `card_import.upload_attachment`, `debit_import.preview_attachment`, and `salary_receipt.import_attachment` accept only owned `attachmentId` values.
- Definitive accepts remain separate R3 tools and never auto-run after draft/preview creation.
### FEAT-006: Recovery and continuity

**Type:** functional
**Scenarios:** [functional/gherkin.md#feat-006-recovery-and-continuity](functional/gherkin.md#feat-006-recovery-and-continuity)
**Feature file:** [functional/features/FEAT-006-recovery-and-continuity.feature](functional/features/FEAT-006-recovery-and-continuity.feature)

**Implementation notes:**
- Persist run state, tool calls and approvals so a visual SSE interruption cannot erase successful work.
- Replay/dedupe events by `(runId, sequence)` and use run snapshots when reconnecting.
- Conversation compaction must preserve entity IDs, pending decisions and critical references.
- Enforce `AGENT_MAX_STEPS_PER_RUN=32` and end controlled work without resetting conversation state.
- This feature is planned but outside the currently authorized T060-T067 delivery block.

### FEAT-007: Agent safety boundaries

**Type:** constraint
**Scenarios:** [functional/gherkin.md#feat-007-agent-safety-boundaries](functional/gherkin.md#feat-007-agent-safety-boundaries)
**Feature file:** [functional/features/FEAT-007-agent-safety-boundaries.feature](functional/features/FEAT-007-agent-safety-boundaries.feature)

**Implementation notes:**
- Maintain `LLM -> closed registry -> explicit tool -> existing service -> domain`; no dynamic reflection or loopback HTTP for domain logic.
- Tool handlers do not expose arbitrary filesystem, shell, SQL, Prisma models or secrets to the model.
- Structured UI continues using CajaApp amount masking and existing design tokens.
- The existing AI Advisor remains explain-only and is never used as a mutation-capable subagent.
## Estimation

> Estimation criterion (AI-Native SDLC). Relative units normalize functional size — they are
> not story points and do not represent hours. Risk-adjusted range, not a commitment.

**Change type:** existing codebase; the current calibration base covers greenfield runs only.

| FEAT-ID | Feature | Size | Units | Uncertainty | Weight | Weighted | Why |
|---------|---------|:----:|------:|:-----------:|:------:|---------:|-----|
| FEAT-001 | Global agent conversation | M | 3 | A | 1 | 3 | Existing global chat path is already implemented and covered; remaining work is preservation/regression around lifecycle behavior. |
| FEAT-002 | Real CajaApp data and navigation | L | 8 | A | 1 | Closed registry spans many existing services but the read/navigation architecture and tests are already established. |
| FEAT-003 | Normal CajaApp actions | L | 8 | A | 1 | R2 crosses runner, executor and several domain services, but explicit-intent and idempotency behavior are already implemented and tested. |
| FEAT-004 | Critical action approvals | L | 8 | B | 2 | Approval engine is implemented, but exact-argument continuity and regression protection remain cross-layer concerns. |
| FEAT-005 | Document imports from the conversation | L | 8 | B | 2 | Active brownfield delta touches staging, multipart API, registry, three import domains and frontend upload/progress while preserving draft-first semantics. |
| FEAT-006 | Recovery and continuity | XL | 19 | C | 3 | Future work is cross-cutting across memory, context assembly, persisted run recovery, SSE reconnect/dedupe and UI continuity. |
| FEAT-007 | Agent safety boundaries | M | 3 | C | 3 | Constraints span executor, storage exposure, masking and advisor separation; verification crosses existing modules and later convergence. |
| **Total** | | | **57** | | | **117** | |

**Adjustment Coefficient:** 0.07 (confirmed by the user)
**Dominant uncertainty:** C — Moderate uncertainty
**Signals observed:** brownfield code is partially implemented across phases; US5 has an in-progress working tree across backend/frontend/import services; FEAT-006 remains a future cross-cutting integration; the calibration base contains greenfield runs only.

**Estimation:** 117 × 0.07 = **8.19 h**
**Risk-adjusted range (±35%):** **5.32 – 11.06 h**

### Risks

| Signal observed | Risk | Mitigation |
|-----------------|------|------------|
| US5 already has partial changes across backend, frontend and three import domains | Integration regressions can hide behind individually green units | Keep RED/GREEN focal tests per attachment/import boundary and run the controlled temp-DB E2E before closure. |
| FEAT-006 is still unimplemented and cross-cutting | Recovery/memory work can reveal coupling not visible in the completed chat phases | Keep FEAT-006 outside the current T060-T067 block and re-estimate that delta after US5 is closed. |
| Existing codebase calibration is not represented by the two historical calibration runs | The point estimate can misstate brownfield execution rate | Use the stated ±35% range and recalibrate from completed CajaApp agent phases rather than treating 8.19 h as a commitment. |
| Import services include storage, parsing/extraction and durable drafts | A staging lifecycle error can either lose retryability or retain unnecessary bytes | Verify staged -> consumed only after a recoverable draft/preview, and verify failed processing leaves the owned attachment reusable. |
