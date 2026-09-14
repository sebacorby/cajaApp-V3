# Validation Results: 001-chat-con-ia

**Round:** 2 — User Story 6 / T068–T076
**Verdict:** PASS
**Date:** 2026-09-13
**Unverified:** none within T068–T076
**Human review:** none required

## Summary

T068–T076 / FEAT-025 recovery-and-continuity was independently revalidated with the exact Node.js v24.18.0 toolchain. Memory compaction, context assembly, durable run snapshots, cancellation/recovery invariants, minimized/reload UI, amount masking and SSE reconnect/dedupe all passed. Full US1–US6 browser regression is green and no unresolved product finding remains.

## Independent gate evidence

| Gate | Observed by Tester | Status |
|---|---|---|
| exact Node runtime | `v24.18.0` | OK |
| Prisma validate/generate/status | valid; generated; 19 migrations current | OK |
| backend build/typecheck | exit 0 | OK |
| backend US6 focal | memory + runner = 13/13 | OK |
| backend full Vitest | 42 files, 257/257 | OK |
| frontend typecheck | exit 0 | OK |
| frontend lint | 0 errors, same 3 historical warnings | OK |
| frontend production build | exit 0 | OK |
| full `agent-chat.spec.ts`, workers=1/retries=0 | 13/13, exit 0 | OK |
| real FEAT-024 browser→multipart→domain draft regression | 1/1 PASS on temporary SQLite | OK |
| temporary SQLite integrity | `integrity_check=ok`; `foreign_key_check=0` | OK |
| real `prisma/dev.db` SHA-256 | `7270EF53380B59DAA4B0CEDC2ECD2C0121AE0F89F0A6B1C4517DF4691115D219` before/after | OK |
| `git diff --check` | exit 0 | OK |

## US6 scenario coverage

| Capability | Evidence | Status |
|---|---|---|
| compact old history while preserving IDs/entity refs/pending action | `memory.test.ts` | PASS |
| assemble bounded context from prompt + settings + summary + recent messages + tools | `memory.test.ts` | PASS |
| durable restart-style run snapshot incl. approval/tools/metrics | `runner.test.ts` | PASS |
| reject second active run in same conversation | `runner.test.ts` | PASS |
| persist event sequence | `runner.test.ts` | PASS |
| sanitize provider failure | `runner.test.ts` | PASS |
| stop at configured max steps | `runner.test.ts` | PASS |
| cancel during started tool as `cancelled_after_tool` | `runner.test.ts` | PASS |
| reload persisted conversation/run/approval and show minimized badge | `agent-chat.spec.ts` | PASS |
| mask structured recovered amounts when `hideAmounts=true` | `agent-chat.spec.ts` | PASS |
| reconnect with `Last-Event-ID` and dedupe repeated sequence | `agent-chat.spec.ts` | PASS |

## Findings

| ID | Severity | Title | Final status |
|---|---|---|---|
| US6-F01 | high | Snapshot server sequence was incorrectly used as browser-consumed SSE cursor, allowing fast events to be skipped before initial stream attachment | RESOLVED; regression test strengthened and full suite 13/13 PASS |

## Skill / process audit

- `IADEV-validating-implementation` applied for independent revalidation.
- `IADEV-test-driven-development` and `IADEV-bdd-implementation` evidence rechecked against fresh focal/full runs.
- Playwright was launched only through detached Windows Task Scheduler jobs, never as an MCP child process.
- No new dependency or migration was required for US6; Foundation fields already existed.
- Historical US4/US5 test doubles were updated only to the current runner/snapshot interfaces; production was not weakened to satisfy them.

## Notes

- The first full browser run intentionally failed after the new reconnect implementation and exposed US6-F01; this was treated as a real product regression, fixed, and revalidated rather than hidden as test flakiness.
- A 12-minute reconnect test timeout was separately diagnosed as harness-only: its mock stream ended while its snapshot remained permanently `running`, causing correct infinite recovery attempts. The harness was given an actual terminal event; this is not counted as a product defect.
- Generated `playwright-report/` and `test-results/` bundles were removed before source lint; final lint is 0 errors and the same three historical warnings outside this feature.
- The real database was never used for E2E mutations. Temporary SQLite ended `integrity_check=ok`, `foreign_key_check=0`; the real database hash stayed byte-identical.
- Campaign backend and exact `CajaApp-US6-*` Task Scheduler jobs were removed after validation. The pre-existing frontend runtime was not killed.
- T077+ remains unexecuted and is not implied complete by this PASS.
