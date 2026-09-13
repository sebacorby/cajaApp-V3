# Summary: 001-chat-con-ia

## What was built
CajaApp now has a persistent global conversational agent, separate from the explain-only AI Advisor, that grounds application claims in registered tools and executes governed CajaApp capabilities through existing domain services. The delivered slice now includes conversation-owned PDF/CSV staging and draft-first document-import initiation from chat without bypassing existing review/accept semantics.

## Features
- FEAT-020 `global-agent-conversation` — delivered baseline.
- FEAT-021 `real-data-and-navigation` — delivered baseline.
- FEAT-022 `normal-actions` — delivered baseline.
- FEAT-023 `critical-approvals` — delivered baseline.
- FEAT-024 `document-imports-from-chat` — delivered in T060-T067 and validated in this cycle.
- FEAT-025 `recovery-and-continuity` — specified/planned; T068+ remains outside the current authorization.
- FEAT-026 `agent-safety-boundaries` — specified/planned for later convergence; not claimed complete by this cycle.

## Key decisions
- The conversational agent is a separate product from AI Advisor and never uses it as a mutation subagent.
- Tool execution is closed-registry only; handlers reuse CajaApp domain services and never expose direct Prisma/SQL, arbitrary filesystem, or shell access to the model.
- R0/R1 reads/artifacts and explicit R2 writes follow fixed risk classes; R3/R4 actions require exact explicit approval.
- PDF/CSV attachments are conversation-owned, capped at 10 MiB, stored under controlled staging, and referenced to tools only by `attachmentId`.
- Import initiation is draft-first; definitive acceptance remains a separate R3 operation.
- A valid staged attachment survives a pre-draft processing failure and can be retried without re-uploading.

## Stack
Node.js 24.18.0 on Windows x64; Fastify 5 + Prisma 6 + SQLite backend; Next.js 16 + React 19 frontend; Vitest and Playwright for validation.

## Delivery
The T060-T067 delivery completed in one validation round. Developer verification finished with 249/249 backend tests, 21/21 US5 focal tests, clean type/build gates, and FEAT-024 browser coverage; Tester independently proved a real browser→multipart→AgentAttachment→runner→registry→debit draft path on temporary SQLite and closed the full agent-chat regression at 10/10.

Two suite-only Playwright races were diagnosed as page/bootstrap contention against SQLite and stabilized in test setup by waiting for network idle; no production behavior was changed by Tester.

## Verdict
PASS — round 1 for the authorized T060-T067 / FEAT-024 delivery.

## Docs & features updated
Merged shipped agent architecture into `docs/technical.md`, agent entities/flows into `docs/domain.md`, and the global agent presentation surface into `docs/design.md`. FEAT-020 through FEAT-024 remain active; no existing feature was deprecated because the agent extends rather than replaces existing domain capabilities.

## Artifacts
| Location | File | Purpose |
|----------|------|---------|
| `functional/` | `PRD.md`, `gherkin.md`, `discovery.md`, `features/` | Product specification and active-feature mapping |
| `/` | `specs.md` | Technical requirements index and estimation |
| `code/` | `proposal.md`, `design.md` | Technical design |
| `test/` | `tasks.md` | Delivery and verification checklist |
| `/` | `implementation.md`, `implementation_report.md`, `validation-results.md` | Delivery plan, implementation evidence, independent validation |

## Notes
T068+ recovery/continuity and later convergence remain pending and must not be inferred as completed from this PASS. The real `workspace/backend/prisma/dev.db` remained byte-identical at SHA-256 `7270EF53380B59DAA4B0CEDC2ECD2C0121AE0F89F0A6B1C4517DF4691115D219`.