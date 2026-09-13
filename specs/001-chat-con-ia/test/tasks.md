# Tasks: 001-chat-con-ia

> Execution boundary: the current Delivery run is authorized only for legacy tasks T060-T067 (FEAT-005 / US5). Items for FEAT-006 and later convergence are planned here but must not be executed in this block.

## 1. Preserve closed brownfield baseline

- [x] 1.1 Preserve global conversation/widget behavior (FEAT-001)
  - Existing US1 implementation and regression tests are the baseline; do not reopen without a demonstrated blocker.
- [x] 1.2 Preserve real read tools and navigation (FEAT-002)
  - Existing US2 closed registry/read-tool behavior remains authoritative.
- [x] 1.3 Preserve explicit R2 writes and idempotency (FEAT-003)
  - Existing US3 behavior remains authoritative.
- [x] 1.4 Preserve R3/R4 approval engine and same-run continuation (FEAT-004)
  - Existing US4 behavior remains authoritative.

## 2. US5 contract tests — legacy T060-T062

- [x] 2.1 T060 — Complete attachment staging tests (FEAT-005)
  - Cover extension admission, size, ownership, SHA-256, per-conversation controlled path, safe DTOs, retry lifecycle and physical cascade cleanup.
- [x] 2.2 T061 — Complete import-tool contract tests (FEAT-005)
  - Verify the exact Phase F R2 catalog, strict `attachmentId` inputs, ownership context and draft-first behavior.
- [x] 2.3 T062 — Complete Playwright RED/GREEN coverage (FEAT-005)
  - Attach PDF/CSV, show chips/progress/result, process multiple requested attachments, and prove accept remains R3.

## 3. US5 backend implementation — legacy T063-T065

- [x] 3.1 T063 — Harden secure conversation-owned staging (FEAT-005)
  - Store at `STORAGE_DIR/agent-chat/<conversationId>/<uuid>.<ext>`, hash bytes, normalize MIME by extension, keep internal paths private and preserve retryability until durable draft/preview exists.
- [x] 3.2 T064 — Complete attachment HTTP contract (FEAT-005)
  - Implement/validate upload, list and delete endpoints plus message association/ownership checks.
- [x] 3.3 T065 — Complete Phase F tool registration/execution (FEAT-005)
  - Reuse card/debit/salary/backup/reconciliation/health services; resolve owned attachments by `attachmentId`; consume staging only after recoverable draft/preview.

## 4. US5 frontend implementation — legacy T066-T067

- [x] 4.1 T066 — Implement attachment selector and chips (FEAT-005)
  - Add hidden `.pdf,.csv` file input, upload/remove states, safe errors and staged attachment metadata without new dependencies.
- [x] 4.2 T067 — Complete import progress/result integration (FEAT-005)
  - Send selected `attachmentIds`, render tool progress/results, preserve retryable attachments on pre-draft failure and keep definitive accept behind Approval Card.
- [x] 4.3 Close only the US5 focal work unit
  - Run focal backend/frontend tests and refactor while preserving the T060-T067 boundary.

## 5. Planned recovery work — NOT authorized in current block

- [ ] 5.1 Implement context assembly and compaction with preserved entity references (FEAT-006)
  - Future work corresponding to T068+; do not execute during US5.
- [ ] 5.2 Implement durable run recovery and SSE reconnect/dedupe (FEAT-006)
  - Future work corresponding to T068+; do not execute during US5.
- [ ] 5.3 Complete minimized/reload/restart continuity UI (FEAT-006)
  - Future work corresponding to T068+; do not execute during US5.

## 6. Planned cross-cutting convergence — NOT authorized in current block

- [ ] 6.1 Add explicit security regression coverage (FEAT-007)
  - Verify conversation deletion never deletes finance domain data and result/projector paths never expose secrets or storage paths.
- [ ] 6.2 Preserve AI Advisor no-mutation behavior (FEAT-007)
  - Keep existing advisor tests green without changing its contract.
- [ ] 6.3 Complete global accessibility/masking/convergence campaign (FEAT-007)
  - Future release-level work only; not part of T060-T067.
## 7. Verification

- [ ] 7.1 FEAT-001 — Open the agent without changing the current section
  - Verify global launcher/panel preserves the active CajaApp section.
- [ ] 7.2 FEAT-001 — Minimize and reopen the active conversation
  - Verify the same persisted thread/pending state returns.
- [ ] 7.3 FEAT-001 — Continue an archived conversation
  - Verify new input reactivates the same conversation automatically.
- [ ] 7.4 FEAT-001 — General conversation without CajaApp data
  - Verify no unnecessary tool is required.
- [ ] 7.5 FEAT-002 — Answer using current CajaApp data
  - Verify a registered read tool grounds the answer.
- [ ] 7.6 FEAT-002 — Combine multiple sources
  - Verify independent safe reads can be combined without invented values.
- [ ] 7.7 FEAT-002 — Navigate to an identified record
  - Verify validated `ui.navigate` changes the main view while chat stays open.
- [ ] 7.8 FEAT-002 — Refuse an unknown action
  - Verify unknown tool names fail closed and are recorded.
- [ ] 7.9 FEAT-003 — Execute an explicit normal action
  - Verify one R2 mutation and its real result.
- [ ] 7.10 FEAT-003 — Ask before an ambiguous target
  - Verify no mutation occurs until one target is identified.
- [ ] 7.11 FEAT-003 — Ask before an inferred mutation
  - Verify inferred auxiliary writes cannot bypass explicit intent.
- [ ] 7.12 FEAT-003 — Avoid duplicate execution on retry
  - Verify durable idempotency prevents duplicate mutation.
- [ ] 7.13 FEAT-004 — Hold a critical action before execution
  - Verify zero domain mutation while awaiting approval.
- [ ] 7.14 FEAT-004 — Execute exactly the approved action
  - Verify the same run resumes with unchanged canonical arguments.
- [ ] 7.15 FEAT-004 — Reject a critical action
  - Verify rejection is terminal for that proposal and domain state stays unchanged.
- [ ] 7.16 FEAT-004 — Invalidate approval when arguments change
  - Verify a previous approval hash cannot authorize changed arguments.
- [x] 7.17 FEAT-005 — Attach a supported document and request import
  - Current US5 gate: verify matching import flow creates a draft/preview before any accept.
- [x] 7.18 FEAT-005 — Do not import attachment without intent
  - Current US5 gate: verify attachment-only input starts no import and asks for intent.
- [x] 7.19 FEAT-005 — Process multiple requested attachments
  - Current US5 gate: verify each requested attachment becomes an independent workflow and accepts remain separate.
- [x] 7.20 FEAT-005 — Reuse a valid attachment after import failure
  - Current US5 gate: verify pre-draft failure keeps the same owned staging bytes retryable.
- [x] 7.21 FEAT-005 — Reject unsupported/oversized attachment
  - Current US5 gate: verify staging rejects non-PDF/CSV extensions and files over 10 MiB before import processing.
- [x] 7.22 FEAT-005 — Require approval before definitive acceptance
  - Current US5 gate: verify generated draft/preview never auto-materializes and R3 Approval Card is required.
- [ ] 7.23 FEAT-006 — Reopen persisted conversation after restart
  - Future gate: verify persisted thread/references/pending states survive restart.
- [ ] 7.24 FEAT-006 — Recover after visual stream interruption
  - Future gate: verify snapshot/replay resumes without repeating successful actions.
- [ ] 7.25 FEAT-006 — Cancel an active response safely
  - Future gate: verify provider generation stops while completed domain work remains consistent.
- [ ] 7.26 FEAT-006 — Continue a long conversation with preserved references
  - Future gate: verify compaction retains required entity IDs and pending decisions.
- [ ] 7.27 FEAT-007 — Reject invalid action arguments
  - Verify Zod/runtime validation fails closed with no domain mutation.
- [ ] 7.28 FEAT-007 — Preserve AI Advisor behavior
  - Verify the separate advisor remains explain-only and is not called as a mutation subagent.
- [ ] 7.29 FEAT-007 — Respect amount privacy
  - Verify structured agent presentation follows the existing `hideAmounts` behavior.
- [ ] 7.30 FEAT-007 — Keep operations behind authorized capabilities
  - Verify direct database, arbitrary filesystem, shell and dynamic action access remain unavailable.
