# 001-chat-con-ia -- Implementation Plan

> **For the Developer agent:** Execute this plan task by task under strict RED -> GREEN -> REFACTOR using the installed SDD/TDD skills. This is a brownfield continuation: preserve valid work already present in the working tree and never fabricate a new RED for behavior whose failing test was already witnessed in this same US5 cycle.

## Goal

Complete only FEAT-005 / legacy T060-T067 so CajaApp can stage PDF/CSV attachments inside a conversation, start the existing card/debit/salary draft-first import flows by `attachmentId`, show progress/results in chat, and keep definitive acceptance behind R3 approval.

## Architecture summary

Keep the existing TypeScript/Fastify/Prisma backend and Next.js/React frontend. The model reaches imports only through the closed agent registry: `LLM -> registered tool -> existing domain service -> domain`; filesystem paths stay internal to `AgentChatService`. Attachments are staged under a conversation-owned directory and consumed only after the requested import service has produced durable recoverable state; failed pre-durable processing leaves the attachment reusable.

## Tech stack

- Language/runtime: TypeScript on exact Node.js `v24.18.0` from `I:\Tools\node-v24.18.0-win-x64`.
- Backend: Fastify 5, Zod 3, Prisma 6, SQLite.
- Frontend: Next.js 16, React 19, Zustand, existing shadcn/Tailwind primitives.
- Testing: Vitest 3 for backend; Playwright 1.61 for browser/E2E.
- Communication: REST/multipart + existing SSE run stream.

## Scope

**In scope (this plan delivers):**
- T060-T067 / FEAT-005 only.
- Extension-based `.pdf`/`.csv` admission, 1..10 MiB, canonical MIME normalization, SHA-256 and conversation ownership.
- Physical staging at `STORAGE_DIR/agent-chat/<conversationId>/<uuid>.<ext>`; `storagePath` never enters provider/frontend payloads.
- Message association and provider context using safe `attachmentId` metadata only.
- Exact Phase F R2 catalog already specified by Planning; no invented tools.
- Multiple explicitly requested attachments remain independent workflows.
- Attachment-only input does not imply import intent; the agent asks what to do.
- Retry of the same staged attachment after failure before recoverable draft/preview.
- Existing card/debit/salary draft/review/accept behavior; definitive acceptance stays R3.
- Attachment selector/chips, safe upload errors, import Tool Card progress/result and Approval Card continuity.
- Controlled focal/full gates, temporary SQLite E2E campaign, SSOT closure, one final commit/push after all gates.

**Out of scope (do NOT touch in this plan):**
- T068+ / FEAT-006 recovery-memory implementation.
- Any functional rewrite of FEAT-020 through FEAT-023; they are regression baselines only.
- AI Advisor behavior or its contracts.
- New Prisma models/migrations for US5.
- New dependencies, alternate import engines, arbitrary image support, browsing, shell, generic filesystem access, direct Prisma/SQL tools.
- Refactors outside files explicitly required by T060-T067.

**Brownfield guardrail:** current US5 source/test edits are intentional work-in-progress. Reconcile them against this approved plan; do not reset, discard, or pretend already witnessed RED/GREEN cycles never happened.

## Package & dependency recommendations

No dependency changes. Existing Fastify multipart, Zod, Prisma, React, Lucide, Vitest and Playwright are sufficient and form a hard ceiling for T060-T067.

## Source artifacts
- PRD: `specs/001-chat-con-ia/functional/PRD.md`
- Behavior index: `specs/001-chat-con-ia/functional/gherkin.md`
- Active behavior: `features/FEAT-024-document-imports-from-chat.feature`
- Discovery: `specs/001-chat-con-ia/functional/discovery.md`
- Proposal: `specs/001-chat-con-ia/code/proposal.md`
- Specs: `specs/001-chat-con-ia/specs.md`
- Design: `specs/001-chat-con-ia/code/design.md`
- High-level tasks: `specs/001-chat-con-ia/test/tasks.md`
- Legacy execution checklist: `specs/001-chat-con-ia/tasks.md` T060-T067.
- SSOT: `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`.

## Feature -> task index

| FEAT-ID | Feature | Delivery tasks |
|---|---|---|
| FEAT-005 / active FEAT-024 | Document imports from the conversation | Tasks 1-4; verified by Tasks 5-6 |

### Scenario coverage map

| Active scenario | Primary layer | Planned test |
|---|---|---|
| Attach a supported document and request import | E2E + backend unit | `agent-chat.spec.ts`; `attachments.test.ts`; `import-tools.test.ts` |
| Do not import an attachment without user intent | E2E | one FEAT-024 Playwright case |
| Process multiple requested attachments | E2E | one FEAT-024 Playwright case |
| Reuse a valid attachment after an import failure | backend unit + E2E | import-tool failure/retention + retry UI case |
| Reject an unsupported or oversized attachment | backend unit + E2E | staging validation + visible error case |
| Require approval before definitive acceptance | E2E + existing approvals regression | separate FEAT-024 Playwright case |

## Plan
### Task 1: T060 + T063 — Attachment staging contract and service

**Files:**
- Modify `workspace/backend/tests/agent-chat/attachments.test.ts`.
- Modify `workspace/backend/src/modules/agent-chat/agent-chat.service.ts`.

**Skills the Developer should look for:** anything for strict test-driven development, filesystem-safe backend testing, and TypeScript/Vitest.

- [ ] **Step 1.1: Write the contract-delta RED tests.**

Update T060 tests to the approved contract: a `.csv` must stage even when the browser sends `application/octet-stream`, a `.pdf` must stage independently of browser MIME, a `.png` must be rejected even if its MIME claims PDF, stored MIME must be canonical by extension, and the persisted path must be inside `<attachmentRoot>/<conversationId>/` with a generated filename. Keep the existing empty/>10 MiB, ownership, SHA-256, no-`storagePath` DTO, missing-conversation and physical cascade assertions. Add an integrity case proving `resolveAttachment` rejects tampered size/hash.

Run from `I:\cajaApp-V3\workspace\backend`:
`& 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' vitest run tests/agent-chat/attachments.test.ts`

Expected RED: at least the extension/canonical-MIME/per-conversation-path assertions fail against the current MIME-driven flat staging implementation; failures must reach those assertions rather than module/import errors.

- [ ] **Step 1.2: Implement minimal staging GREEN.**

In `AgentChatService.stageAttachment`, derive accepted type from the sanitized filename extension only, normalize MIME to `application/pdf` or `text/csv`, create `attachmentRoot/<conversationId>/`, write `<uuid>.<ext>`, persist conversation ownership/hash/size/canonical MIME, and never return the path. `safeAttachmentPath`/resolution/deletion must still prevent escape from the controlled root. Do not parse PDF/CSV content here; existing import domains own that validation.

Run the same focal Vitest command.
Expected GREEN: all `attachments.test.ts` tests pass, 0 failures.
- [ ] **Step 1.3: Refactor while green.**

Keep extension-to-canonical-MIME mapping in one private constant/helper and keep path checks centralized. Remove the old MIME-driven admission branch; do not add content sniffing or alternate storage abstractions.

Run the focal Vitest command again.
Expected: all attachment tests pass with no warnings/errors.

- [ ] **Step 1.4: Record evidence, do not commit yet.**

Append Task 1 RED/GREEN commands and counts to `specs/001-chat-con-ia/implementation_report.md`. The project owner requested a single final commit only after all US5 gates and SSOT closure, so leave this task in the working tree.

### Task 2: T064 — Attachment HTTP and message association

**Files:**
- Modify `workspace/backend/tests/agent-chat/attachments.test.ts` or add `workspace/backend/tests/agent-chat/attachments-http.test.ts` only if separation is needed for focused HTTP assertions.
- Modify `workspace/backend/src/modules/agent-chat/agent-chat.controller.ts`.
- Modify `workspace/backend/src/modules/agent-chat/agent-chat.schemas.ts`.
- Modify `workspace/backend/src/modules/agent-chat/agent-chat.service.ts` only for association/ownership behavior required by the test.

**Skills the Developer should look for:** anything for Fastify HTTP integration testing, multipart requests, Zod contracts, and Vitest.

- [ ] **Step 2.1: Write HTTP RED coverage.**

Cover `POST/GET/DELETE /api/agent/conversations/:id/attachments` and `POST /messages`: multipart field `file` required; safe upload DTO excludes `storagePath`; list only returns that conversation's attachments; delete requires matching conversation ownership; message accepts text-only, attachment-only, or both but rejects neither; max 10 UUID attachment IDs; every linked ID must still be staged and owned by the same conversation. Use a Fastify test instance/spies or isolated temp DB — never the real `prisma/dev.db`.

Run the focal attachment HTTP/unit test command.
Expected RED: newly asserted contract gaps fail for the right route/schema/ownership reason, not because the server cannot start.
- [ ] **Step 2.2: Implement minimal HTTP GREEN.**

Keep multipart parsing in the existing controller and validation in the existing Zod schemas/service. Return `201` safe metadata on upload, `{ items }` on list and `204` on delete. `appendMessage` must validate all unique attachment IDs inside the same transaction, link them to the new user message and fail closed if ownership/staged state changed.

Run the focal HTTP/unit test command.
Expected GREEN: all new route/schema/association assertions pass, 0 failures.

- [ ] **Step 2.3: Verify provider-context privacy.**

Extend the focal service test if needed: `getProviderMessages` may include `attachmentId`, filename, canonical MIME and size, but never `storagePath`, raw bytes or secrets.

Run: `& 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' vitest run tests/agent-chat/attachments*.test.ts`
Expected: PASS, 0 failures.

- [ ] **Step 2.4: Refactor and report, no commit.**

Keep route DTO construction/service ownership logic DRY and append fresh RED/GREEN evidence to `implementation_report.md`. Do not add wrappers or helper scripts.

### Task 3: T061 + T065 — Phase F import tools and attachment lifecycle

**Files:**
- Modify `workspace/backend/tests/agent-chat/import-tools.test.ts`.
- Modify `workspace/backend/src/modules/agent-chat/agent-tool-registry.ts`.
- Modify `workspace/backend/src/modules/agent-chat/agent-tool-executor.ts` only if context/idempotency behavior needs correction.
- Modify `workspace/backend/src/modules/agent-chat/agent-runner.service.ts` only if conversation context/explicit import intent is not propagated correctly.

**Skills the Developer should look for:** anything for TDD of service orchestration, Zod schemas, idempotent command execution, and Vitest spies/mocks at external/domain boundaries.
- [ ] **Step 3.1: Preserve prior RED evidence and add only missing contract-delta tests.**

The current US5 cycle already witnessed T061 fail 3/3 because Phase F tools did not exist, then pass 3/3 after the registry was introduced. Do not delete working code merely to manufacture another RED. Add only missing assertions: all nine Phase F names are R2 + explicit-intent; file tools accept strict UUID `attachmentId` and reject paths/extra fields; missing conversation context fails before domain work; wrong ownership/unknown attachment fails via `resolveAttachment`; a domain failure must not call `consumeAttachment`; a successful domain preparation calls it exactly once after the domain result exists; R3 accept tools remain separate.

Run: `& 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' vitest run tests/agent-chat/import-tools.test.ts`
Expected: any genuinely missing contract-delta assertion fails for that behavior; already implemented assertions may remain green and must be recorded as characterization, not mislabeled RED.

- [ ] **Step 3.2: Implement minimal Phase F GREEN.**

Keep exactly: `card_import.upload_attachment`, `card_import.update_draft`, `debit_import.preview_attachment`, `debit_import.update_row`, `salary_receipt.import_attachment`, `salary_receipt.update_draft`, `backup.validate`, `reconciliation.scan`, `financial_health.create_snapshot`. File handlers must require runtime `conversationId`, resolve an owned staged attachment through `AgentChatService`, call the existing canonical domain service, and consume staging only after successful durable preparation. Failure leaves staging untouched. No handler accepts or emits arbitrary paths.

`AgentToolExecutor` passes only runtime conversation context; `AgentRunnerService` supplies that context and preserves explicit import intent semantics. Keep writes serial and durable idempotency unchanged.

Run the focal import-tools test.
Expected GREEN: all `import-tools.test.ts` tests pass, 0 failures.

- [ ] **Step 3.3: Run combined US5 backend focal tests.**

Run: `& 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' vitest run tests/agent-chat/attachments.test.ts tests/agent-chat/attachments-http.test.ts tests/agent-chat/import-tools.test.ts`
If `attachments-http.test.ts` was not needed, omit only that path.
Expected: 0 failed tests.
- [ ] **Step 3.4: Refactor and report, no commit.**

Remove duplicate lifecycle/orchestration branches only if the combined focal suite remains green. Keep domain logic in existing import services. Append the exact focal counts and any characterization-only tests to `implementation_report.md`.

### Task 4: T062 + T066 + T067 — Attachment UI, import progress and R3 continuity

**Files:**
- Modify `workspace/frontend/tests/agent-chat.spec.ts`.
- Modify `workspace/frontend/src/lib/finance/agent-api.ts`.
- Create `workspace/frontend/src/components/finance/agent/attachment-chip.tsx`.
- Modify `workspace/frontend/src/components/finance/agent/agent-composer.tsx`.
- Modify `workspace/frontend/src/components/finance/agent/agent-chat-panel.tsx`.

**Skills the Developer should look for:** anything for end-to-end browser testing, React component testing/design using the existing project primitives, accessibility, and Playwright.

- [ ] **Step 4.1: Split FEAT-024 into six explicit Playwright scenario tests and verify RED.**

Use test names containing `FEAT-024` plus a unique substring of each active scenario. Preserve the already witnessed valid RED where `Adjuntar archivo` was disabled. Add separate cases for: explicit supported import -> draft/preview; attachment-only -> no auto-import and assistant asks intent; multiple attachments -> both IDs sent/independent workflows; failed pre-draft import -> chip remains retryable without re-upload; unsupported/oversized -> visible clear error before import; definitive accept -> R3 Approval Card and no materialization before approval. Mock only the provider/backend boundaries necessary for deterministic UI behavior; do not collapse scenarios into one test.

Run from `I:\cajaApp-V3\workspace\frontend`:
`$env:CAJAAPP_FRONTEND_BASE_URL='http://127.0.0.1:11437'; & 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' playwright test tests/agent-chat.spec.ts --grep 'FEAT-024' --workers=1 --retries=0`

Expected RED: new FEAT-024 cases fail because the composer/API/panel attachment flow is still missing; the failure must be user-surface behavior, not a broken frontend runtime.
- [ ] **Step 4.2: Implement the typed attachment API surface.**

In `agent-api.ts`, add a safe `AgentAttachment` DTO and functions to upload multipart `file`, list conversation attachments and delete one. Change `sendAgentMessage(conversationId, content, attachmentIds)` to send the supplied IDs. Do not expose or model `storagePath`.

Run: `& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' run typecheck`
Expected: exit 0 after the API types compile; FEAT-024 Playwright remains RED until UI is wired.

- [ ] **Step 4.3: Implement `AttachmentChip` and composer GREEN surface.**

Create `attachment-chip.tsx` using existing tokens/primitives. It displays filename, safe upload/staged/consumed/error state and an accessible remove/retry affordance when applicable. Update `AgentComposer` with a hidden `input[type=file]` accepting `.pdf,.csv`, an enabled `Adjuntar archivo` button, client guard for extension and <=10 MiB, chip rendering, and send enabled when either trimmed text or at least one staged attachment exists. No auto-import action occurs on file selection.

Run the frontend typecheck, then the FEAT-024 Playwright subset.
Expected: typecheck 0 errors; attachment selection/chip/error scenarios move GREEN while still-missing panel orchestration may remain RED.

- [ ] **Step 4.4: Complete panel orchestration and import-progress GREEN.**

`AgentChatPanel` owns uploaded attachment state per active conversation. Ensure/create the conversation before upload; upload through `agent-api`; on load/run completion refresh safe attachment statuses; send current staged IDs with the user message; keep still-staged attachments available after a pre-draft tool failure so a later retry message can reuse the same ID; remove/hide consumed attachments after successful durable preparation as appropriate. Handle `tool.proposed/started/completed/failed` through the existing Tool Card/conversation reload path and preserve the existing Approval Card flow. Multiple staged IDs are sent together when the user explicitly asks to import them all.

Run the FEAT-024 Playwright subset.
Expected GREEN: six FEAT-024 scenario tests pass, 0 failures, including attachment-only intent clarification, multi-attachment behavior, retry, clear validation error and separate R3 acceptance.

- [ ] **Step 4.5: Refactor and run all agent-chat Playwright regression cases.**

Keep upload/state helpers inside the existing agent vertical; do not add a new global store or SectionId. Remove duplicate upload/error state branches while preserving accessibility labels/testids.

Run: `& 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' playwright test tests/agent-chat.spec.ts --workers=1 --retries=0`
Expected: all closed US1-US4 agent-chat cases plus six FEAT-024 cases pass.
- [ ] **Step 4.6: Report Task 4 evidence, no commit.**

Record each FEAT-024 scenario-to-test mapping and the fresh Playwright counts in `implementation_report.md`. If the frontend server fails before the scenario assertion (for example a dev-runtime persistence fault), record it as infrastructure and rerun on a clean supported runtime; it does not count as RED.

### Task 5: Developer verification for T060-T067

**Files:**
- Append aggregate evidence to `specs/001-chat-con-ia/implementation_report.md`.
- Do not change production behavior in this task unless a failing in-scope gate is first reproduced by a test.

**Skills the Developer should look for:** anything for TypeScript quality gates, Vitest, ESLint, and scenario-coverage auditing.

- [ ] **Step 5.1: Confirm exact runtime.**

Run: `& 'I:\Tools\node-v24.18.0-win-x64\node.exe' -v`
Expected: exactly `v24.18.0`.

- [ ] **Step 5.2: Backend typecheck.**

From `workspace/backend`, run: `& 'I:\Tools\node-v24.18.0-win-x64\npx.cmd' tsc -p tsconfig.json --noEmit`
Expected: exit 0, 0 TypeScript errors.

- [ ] **Step 5.3: Backend US5 focal and full Vitest.**

Run the US5 focal files first, then `& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' test`.
Expected: 0 failures, 0 errors; no skipped tests introduced by US5.

- [ ] **Step 5.4: Frontend typecheck and lint.**

From `workspace/frontend`, run `& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' run typecheck` and then `& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' run lint`.
Expected: typecheck exit 0; lint 0 errors. Only the pre-existing historical warnings may remain.
- [ ] **Step 5.5: Formatter/config check.**

CajaApp has no configured formatter-check script for these workspaces. Record this gate as `n/a — no formatter check configured`; do not introduce Prettier/Biome in this feature.

- [ ] **Step 5.6: Confirm FEAT-024 scenario coverage.**

Read the active `features/FEAT-024-document-imports-from-chat.feature` and map all six scenarios one-to-one to passing tests in `implementation_report.md`. Missing or collapsed scenario coverage is a verification failure even if the suite is green.

- [ ] **Step 5.7: Repository whitespace check.**

From repo root run: `git diff --check`
Expected: exit 0, no whitespace errors in implementation/source/tests.

- [ ] **Step 5.8: Assemble the implementation report.**

Ensure `implementation_report.md` records branch `feat/agent-chat`, baseline HEAD `bd70ffa296517a0f3b6afa47c2ba86a6d957a27b`, every RED/GREEN command/count, files touched, skills used/searched, scenario coverage, and deferred Tester gates. No completion claim without fresh evidence.

### Task 6: Tester handoff and release-quality US5 campaign

**Files:**
- Tester writes `specs/001-chat-con-ia/validation-results.md`.
- After PASS, the cycle summarizer may write `summary.md` and incrementally update living docs; no feature deprecation is expected because Discovery found none superseded.
- The architect/assistant then updates the SSOT CIERRE and performs the single final commit/push required by the project.

**Skills the Tester should look for:** anything for browser E2E, HTTP integration testing, SQLite integrity checks, TypeScript/ESLint/build validation, and implementation auditing.

The Tester must rerun Developer gates and additionally execute every gate below. It must not use the real `dev.db` for mutation/import E2E.
- [ ] **Step 6.1: Protect the real SQLite database before integration/E2E.**

Hash `workspace/backend/prisma/dev.db` with SHA-256 and require baseline `7270EF53380B59DAA4B0CEDC2ECD2C0121AE0F89F0A6B1C4517DF4691115D219`. Copy it to a temporary `.db` outside the real Prisma path. Start backend with `DATABASE_URL` pointing only at that temporary DB. No mutation/import test may address the real file.

- [ ] **Step 6.2: Prisma/build gates on exact Node.**

From backend, run with exact npm/npx: Prisma `validate`, `generate`, `migrate status`; `tsc --noEmit`; `npm run build`; focal US5 Vitest; full `npm test`.
Expected: schema valid, client generated, 19 migrations up to date, build/typecheck 0 errors, all tests pass.

- [ ] **Step 6.3: Frontend production gates.**

From frontend run `npm run typecheck`, `npm run lint`, and `npm run build` through `I:\Tools\node-v24.18.0-win-x64\npm.cmd`.
Expected: typecheck/build PASS; lint 0 errors and no new warnings beyond the documented historical baseline.

- [ ] **Step 6.4: Real FEAT-024 E2E on the temporary DB.**

Use backend `11436`, frontend `11437`, fake OpenAI-compatible provider `11501`, with Playwright `workers:1`, `retries:0`. At least one FEAT-024 flow must traverse the real browser -> multipart backend -> AgentAttachment -> runner -> registry -> existing domain service -> draft/preview path, not only `page.route` mocks. Prefer the deterministic debit CSV path using the parser's established valid fixture shape (`Fecha;Descripción;Débito;Crédito;Referencia`) so no live AI extraction is required. Assert the resulting import is still a draft and no definitive acceptance is materialized without R3 approval.

Run the complete `tests/agent-chat.spec.ts` after the focal FEAT-024 subset.
Expected: all agent-chat Playwright tests PASS, no skips introduced.

- [ ] **Step 6.5: Database integrity and immutability proof.**

Against the temporary DB run SQLite `PRAGMA integrity_check` and `PRAGMA foreign_key_check`; require `ok` and zero FK rows. Rehash the real `workspace/backend/prisma/dev.db` and require the exact same SHA-256 baseline. Any mismatch is FAIL and blocks closure.
- [ ] **Step 6.6: Repository/security/cleanup gates.**

Run `git diff --check` and, after staging only the intended final files, `git diff --cached --check`. Verify no `.env`, credentials, real DB, temp DB, test logs, `playwright-report`, `test-results`, or accidental runtime artifacts are staged. Stop test runtimes, confirm ports `11436`, `11437`, `11501` are free, and delete the temporary DB/storage used by the campaign.

- [ ] **Step 6.7: Tester verdict.**

Write `validation-results.md` with the six FEAT-024 scenario mappings, every command/result, DB integrity proof, real DB before/after hashes, and findings. Verdict is only PASS / FAIL / BLOCKED. Any BLOCKING or MAJOR finding rebounds to the Developer; never waive it silently.

- [ ] **Step 6.8: Close the authorized legacy checklist only after PASS.**

Mark legacy `specs/001-chat-con-ia/tasks.md` T060-T067 `[X]` and leave T068+ `[ ]`. Update `test/tasks.md` only for the corresponding US5 execution items/verification evidence if the delivery summarizer requires it; never mark future FEAT-006 work complete.

- [ ] **Step 6.9: Final SSOT closure and one commit/push.**

Only after Tester PASS and cleanup, the architect/assistant writes `CIERRE / APP-AGENT-CHAT-001` in the SSOT with result, files, tests, evidence, DB hashes/integrity, cleanup and next authorized block. Then create one final commit on `feat/agent-chat`, push it to the SSH origin, and verify remote branch/HEAD. Do not begin T068.

## Final acceptance conditions

T060-T067 are complete only when the six FEAT-024 scenarios have passing coverage, focal/full backend tests are green, backend/frontend type/build/lint gates are green, Prisma is current, a real attachment/import E2E has passed against a temporary SQLite copy, the real `dev.db` hash is unchanged, temporary processes/artifacts are gone, SSOT has its CIERRE, and the final commit is pushed. T068+ remains untouched.

## Current baseline at plan creation

- Branch: `feat/agent-chat`.
- Baseline HEAD: `bd70ffa296517a0f3b6afa47c2ba86a6d957a27b`.
- Runtime check: `v24.18.0` PASS.
- US1-US4 are closed baseline behavior.
- Current US5 working tree contains intentional partial backend/tests/Playwright changes; no reset is authorized.
