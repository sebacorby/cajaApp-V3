# Summary: 001-chat-con-ia

## What was built
CajaApp now has a persistent global conversational agent, separate from the explain-only AI Advisor, that grounds claims in a closed tool registry and executes governed CajaApp capabilities through existing domain services. The delivered vertical now includes conversation-owned document imports plus recovery/continuity for long or interrupted conversations.

## Features
- FEAT-020 `global-agent-conversation` — delivered baseline.
- FEAT-021 `real-data-and-navigation` — delivered baseline.
- FEAT-022 `normal-actions` — delivered baseline.
- FEAT-023 `critical-approvals` — delivered baseline.
- FEAT-024 `document-imports-from-chat` — delivered in T060–T067.
- FEAT-025 `recovery-and-continuity` — delivered in T068–T076 and validated Round 2.
- FEAT-026 `agent-safety-boundaries` — specified/planned for convergence; T077+ not executed.

## Recovery and continuity decisions
- Conversation memory compacts deterministically with `agent-memory-v1` while preserving entity references, identifiers and pending actions.
- Provider context is bounded: versioned system prompt + local settings + compacted summary + recent messages + closed tool catalog.
- Only one active run is allowed per conversation.
- Run snapshots persist provider/model, token/tool metrics, sanitized errors, tool/approval state and `lastEventSequence`.
- `cancelled_after_tool` distinguishes cancellation after domain work has already begun.
- Browser reconnect uses snapshot for durable state and `Last-Event-ID` only for events actually consumed by that browser; dedupe is `(runId, sequence)`.
- `hideAmounts` is applied to structured recovered tool results as well as the rest of the finance UI.

## Stack
Node.js 24.18.0 on Windows x64; Fastify 5 + Prisma 6 + SQLite backend; Next.js 16 + React 19 frontend; Vitest and Playwright for validation.

## Delivery
US6 closed with backend focal 13/13, backend full 257/257, Prisma 19 migrations current, frontend typecheck/lint/build PASS, full `agent-chat.spec.ts` 13/13 PASS and real browser→multipart→backend→draft regression 1/1 PASS on temporary SQLite.

Tester found one real recovery regression during the first full browser run: server snapshot sequence was being treated as the browser-consumed SSE cursor, so fast events could be skipped before stream attachment. The cursor was corrected to advance only from events actually processed by the client; the strengthened reconnect test and full regression are green.

## Verdict
PASS — Round 2 for authorized T068–T076 / FEAT-025 recovery-and-continuity.

## Docs & features updated
Living technical/domain/design docs now include memory/context assembly, durable snapshot/reconnect semantics, minimized activity and recovered-result privacy masking. No existing feature was deprecated because recovery extends the existing global agent contract.

## Artifacts
| Location | File | Purpose |
|---|---|---|
| `functional/` | `PRD.md`, `gherkin.md`, `discovery.md`, `features/` | Product specification and active-feature mapping |
| `/` | `specs.md` | Technical requirements index and estimation |
| `code/` | `proposal.md`, `design.md` | Technical design |
| `test/` | `tasks.md` | Delivery and verification checklist |
| `/` | `implementation.md`, `implementation_report.md`, `validation-results.md` | Delivery plan, implementation evidence, independent validation |

## Notes
T077+ convergence/safety work remains pending and must not be inferred as completed from this PASS. The real `workspace/backend/prisma/dev.db` remained byte-identical at SHA-256 `7270EF53380B59DAA4B0CEDC2ECD2C0121AE0F89F0A6B1C4517DF4691115D219`.
