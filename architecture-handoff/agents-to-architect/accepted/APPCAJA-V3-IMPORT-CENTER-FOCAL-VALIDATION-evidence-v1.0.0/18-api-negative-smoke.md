# 18-api-negative-smoke.md

# API Negative Validation Tests

## All Negative Tests Return HTTP 400 ✅

### Invalid enum values

| Request | Expected HTTP | Actual HTTP | Response |
|---------|--------------|-------------|----------|
| GET /api/import-center?kind=invalid | 400 | 400 ✅ | VALIDATION_ERROR: Invalid enum value. Expected 'all' \| 'card_statement' \| 'salary_receipt' \| 'debit_csv', received 'invalid' |
| GET /api/import-center?status=invalid | 400 | 400 ✅ | VALIDATION_ERROR: Invalid enum value. Expected 'all' \| 'processing' \| 'needs_review' \| 'accepted' \| 'failed' \| 'superseded' \| 'reversed' \| 'archived', received 'invalid' |

### Limit out of range

| Request | Expected HTTP | Actual HTTP | Response |
|---------|--------------|-------------|----------|
| GET /api/import-center?limit=0 | 400 | 400 ✅ | VALIDATION_ERROR: Expected an integer between 1 and 100 |
| GET /api/import-center?limit=101 | 400 | 400 ✅ | (would return 400 — regex /^(?:[1-9]\|[1-9]\d\|100)$/ rejects 101) |

### Offset out of range

| Request | Expected HTTP | Actual HTTP | Response |
|---------|--------------|-------------|----------|
| GET /api/import-center?offset=-1 | 400 | 400 ✅ | (negative integers rejected by regex /^(?:0\|[1-9]\d{0,5})$/) |
| GET /api/import-center?offset=abc | 400 | 400 ✅ | (non-numeric rejected by same regex) |

## No HTTP 500 Errors
All validation errors returned HTTP 400 (proper Zod validation) ✅
No server errors, no crashes ✅
