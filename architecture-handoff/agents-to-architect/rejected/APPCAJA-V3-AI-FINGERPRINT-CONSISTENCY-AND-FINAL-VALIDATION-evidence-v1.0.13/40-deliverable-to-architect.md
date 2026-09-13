# Deliverable to Architect - v1.0.13

## Campaign: AI Fingerprint Consistency Fix

## What Was Done

1. **Root Cause Identified:** `ask()` passed full `AiAdvisorQuestionInput` (with `mode`, `currency`, `question`, etc.) to `buildAiAdvisorContext()`, contaminating the fingerprint.

2. **Fix Implemented:**
   - Created `normalizeAdvisorPeriod()` to extract only `{from, to}`
   - Modified `ask()` to use normalized period
   - Modified `buildAiAdvisorContext()` to normalize period at start
   - Created `buildContextFingerprint()` helper for centralized fingerprint computation

3. **Tests Added:** 6 new fingerprint consistency tests (154 total, exceeds 148)

4. **Verification:**
   - Unit tests: 154/154 PASS
   - Smoke tests: 3/3 fingerprint matches
   - Real queries: 5/5 HTTP 201

## What Remains

- Playwright focal test times out (240s) due to AI+UI duration, not fingerprint issue
- Fingerprint fix is verified working via tests and manual smoke tests

## Files Changed

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`

## SQLite

- Restored to post-migration baseline
- Hash: `E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208`
- node_modules deleted
- Lockfiles unchanged

## Request

Awaiting architect review and decision on Playwright timeout issue.
