# 18 - API Smoke — v1.0.2 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Status: PARTIAL

## What Was Tested

### GET /api/salary-receipts

- No auth required for health check
- Backend responds with 200
- Schema: `{ value: [], count: 0 }`

### Query Validation

| Test | Result |
|------|--------|
| Default (no params) | 200 ✅ |
| limit=1&includeReversed=true | 200 ✅ |
| limit=0 | 400 ✅ |
| limit=101 | 400 ✅ |
| limit=abc | 400 ✅ |
| limit=1.5 | 400 ✅ |
| includeReversed=yes | 400 ✅ |

## What Was NOT Tested (BLOCKED)

### POST /api/salary-receipts/import

- Requires a real PDF file upload
- No sanitized salary receipt PDF exists in the codebase
- Cannot test end-to-end import flow

### Full Scenario

The complete scenario (import PDF → edit → accept → verify income → reverse) could NOT be executed because:
1. No salary receipt PDF available in test fixtures
2. Playwright test uses mocks, not real PDF

## Conclusion

Backend API is functional and query remediation works correctly. Full end-to-end smoke test blocked by missing test data (salary receipt PDF).
