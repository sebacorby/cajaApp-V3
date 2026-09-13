# Discovery: 001-chat-con-ia

## Change & PRD

- Change: `001-chat-con-ia`
- Source PRD: `specs/001-chat-con-ia/PRD.md` v1.1.0
- Functional copy: `functional/PRD.md`
- Product: CajaApp V3 conversational AI agent, separate from the existing AI Advisor.

## Summary

CajaApp adds a persistent global conversational agent that can talk normally, query real CajaApp state, execute authorized application capabilities, pause critical actions for explicit approval, and start supported document imports from the conversation. Existing domain services remain authoritative and document ingestion keeps its draft/review/accept lifecycle.

## Features

| ID | Name | Type | Scenarios |
|---|---|---|---|
| FEAT-001 | Global agent conversation | functional | [feature](features/FEAT-001-global-agent-conversation.feature) |
| FEAT-002 | Real CajaApp data and navigation | functional | [feature](features/FEAT-002-real-data-and-navigation.feature) |
| FEAT-003 | Normal CajaApp actions | functional | [feature](features/FEAT-003-normal-actions.feature) |
| FEAT-004 | Critical action approvals | functional | [feature](features/FEAT-004-critical-approvals.feature) |
| FEAT-005 | Document imports from the conversation | functional | [feature](features/FEAT-005-document-imports-from-chat.feature) |
| FEAT-006 | Recovery and continuity | functional | [feature](features/FEAT-006-recovery-and-continuity.feature) |
| FEAT-007 | Agent safety boundaries | constraint | [feature](features/FEAT-007-agent-safety-boundaries.feature) |

## Resolved decisions

These decisions come directly from the user's clarification round and are binding product behavior:

1. **Multiple attachments are processed in the same request.** If several valid PDF/CSV attachments are present and the user asks to import them all, CajaApp processes each attachment as an independent import workflow. Any later critical acceptance remains separately approval-gated.
2. **An attachment by itself is not import intent.** Uploading a file without an instruction does not start processing; the agent asks what the user wants to do with it.
3. **Failed imports may reuse the same valid attachment.** If processing fails before a recoverable draft/preview exists, the already staged attachment remains available for retry while it is still valid; the user does not need to upload it again.
4. **Archived conversations reactivate on new input.** Sending a message in an archived conversation automatically reactivates that same conversation and continues its existing thread.

## Product rules carried from the PRD

- General conversation does not require CajaApp actions.
- Claims about current CajaApp state must come from authorized application capabilities rather than invented values.
- Explicit normal actions may execute without redundant confirmation when arguments are complete and unambiguous.
- Ambiguous mutations must wait for disambiguation.
- Critical actions always stop for explicit approval tied to the exact proposed action.
- Document import is not definitive acceptance: PDF/CSV flows remain draft/review/accept.
- The existing AI Advisor remains a separate explain-only product.
- Unknown actions, invalid inputs, direct database access, arbitrary filesystem access and shell execution are outside the agent capability boundary.

## Open questions

No unresolved product questions remain from the discovery completeness gate. Planning must reconcile the existing brownfield implementation and prior Spec Kit artifacts with the canonical SDD artifact topology without reopening already validated behavior unless a demonstrated contradiction exists.

## Collision check

The conversational agent intentionally orchestrates existing CajaApp behaviors rather than replacing their domain contracts. Active-feature candidates to preserve/extend are:

- `FEAT-001-import-card-statement-pdf`: extended through chat initiation; draft/review/accept remains authoritative.
- `FEAT-002-import-salary-receipt`: extended through chat initiation; existing draft lifecycle remains authoritative.
- `FEAT-003-import-debit-csv`: extended through chat initiation; preview remains separate from acceptance.
- `FEAT-004-import-center`: agent may surface import status/detail but does not replace the aggregated inbox.
- `FEAT-006-manage-incomes`, `FEAT-007-manage-movements-categories`, `FEAT-009-manage-budgets`, `FEAT-010-manage-savings-goals`, `FEAT-011-project-future-commitments`, `FEAT-012-generate-reports-exports`: extended by conversational access to their existing capabilities.
- `FEAT-013-reconcile-records`, `FEAT-014-close-month`, `FEAT-015-backup-restore`: extended by agent proposals while preserving their critical-operation rules.
- `FEAT-016-global-search`: extended as an agent retrieval capability rather than superseded.
- `FEAT-017-ai-advisor`: explicitly not superseded; it stays separate and explain-only.
- `FEAT-018-settings-privacy`: amount masking and local preferences remain transversal to agent presentation.
- `FEAT-019-statement-history`: agent navigation/read behavior extends access without replacing history semantics.

No active domain feature is intentionally deprecated by this change.

## Codebase context

The targeted brownfield area is already implemented as a dedicated `agent-chat` vertical. Backend code lives under `workspace/backend/src/modules/agent-chat/` and integrates with the existing Fastify/Prisma services through a closed tool registry. Provider adapters live under `workspace/backend/src/modules/ai/agent/`.

Frontend agent components live under `workspace/frontend/src/components/finance/agent/`, with API integration in `workspace/frontend/src/lib/finance/agent-api.ts`. The widget is mounted globally rather than represented as a primary CajaApp section.

The repository already contains focused backend agent tests under `workspace/backend/tests/agent-chat/` and Playwright coverage in `workspace/frontend/tests/agent-chat.spec.ts`. Prior work has completed the base chat, read tools, normal writes and critical approvals; the current working tree contains in-progress attachment/import work that must be reconciled by Planning/Delivery rather than discarded.