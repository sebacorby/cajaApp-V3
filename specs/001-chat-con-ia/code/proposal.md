# Proposal: 001-chat-con-ia

## Why

CajaApp already exposes the financial data and operations the owner needs, but using them directly requires knowing which section contains each capability and translating conversational intent into filters, forms and multi-step workflows.

The new conversational agent removes that navigation and coordination burden while preserving CajaApp as the source of truth. It must be able to talk normally, ground financial claims in real application state, execute authorized actions, pause critical operations for approval, and start supported document imports without bypassing their existing draft/review/accept lifecycle.

The current brownfield implementation already covers the global chat, read tools, normal writes and critical approvals. The active delivery delta is document attachment/import support; recovery/memory and final convergence remain planned future work.

## What Changes

### Global conversational access

Maintain the existing floating agent experience as a product separate from AI Advisor, with persistent conversations, streaming, cancellation, tool cards and navigation.

### Governed CajaApp actions

Keep all application actions behind the closed registry and existing domain services, with R0/R1 reads, explicit-intent R2 writes, and exact-argument R3/R4 approvals.

### Document imports from chat

Add safe conversation-owned staging for PDF/CSV attachments and allow the agent to initiate existing card, debit and salary import workflows using `attachmentId` only.
Keep import initiation draft-first: preparing a draft/preview is R2, while definitive acceptance remains a separate R3 approval.

### Recovery and continuity

Plan durable context compaction, persisted run recovery and SSE reconnection without duplicating already successful actions. This area is not part of the current T060-T067 implementation authorization.

## Scope

**In scope:**
- Global conversational agent separate from AI Advisor.
- Closed tool registry over existing CajaApp domain services.
- R0/R1 reads, R2 explicit writes, R3/R4 approvals and durable idempotency.
- Conversation-owned PDF/CSV staging up to 10 MiB.
- Card statement, debit CSV and salary receipt import initiation from chat.
- Multiple requested attachments processed as independent workflows.
- Retry with the same valid staged attachment when processing fails before a recoverable draft/preview.
- Automatic reactivation when a user sends a new message to an archived conversation.
- Recovery/memory design and future implementation plan.

**Out of scope:**
- Replacing or changing the explain-only AI Advisor contract.
- Direct SQL/Prisma, arbitrary filesystem, shell or dynamic service access from the model.
- Web browsing, scheduled/autonomous agent runs, voice or arbitrary image attachments.
- Skipping document draft/review/accept semantics.
- Executing T068+ during the currently authorized US5 delivery block.
## Capabilities

**New:** conversation-owned attachment staging; import initiation from chat; safe attachment reuse across pre-draft failures; future persisted recovery/context compaction.
**Modified:** archived conversation continuation; agent tool catalog; message/provider context metadata; frontend composer/panel for attachments and import progress.

## Inputs

- Product source: `specs/001-chat-con-ia/PRD.md` v1.1.0.
- Discovery source: `specs/001-chat-con-ia/functional/discovery.md` and its seven feature files.
- Existing brownfield contracts: `spec.md`, `plan.md`, `tasks.md`, `contracts/`, Prisma Agent* models and current agent-chat implementation.
- User product decisions: process all explicitly requested attachments independently; no auto-import from attachment-only messages; allow retry from the same valid staged attachment; reactivate archived conversations on new input.
- User technical decisions: extension-based `.pdf`/`.csv` staging; per-conversation staging directory; consume/delete staging bytes only after a recoverable draft/preview exists.
- Current delivery authorization remains T060-T067 only.
