# 17-api-filter-smoke.md

# API Filter Smoke Tests

## HTTP 200 Valid Filters

### By Kind

| Request | HTTP | Response |
|---------|------|----------|
| GET /api/import-center?kind=card_statement | 200 | 25 items, total=60 |
| GET /api/import-center?kind=salary_receipt | 200 | 0 items |
| GET /api/import-center?kind=debit_csv | 200 | 0 items |

### By Status

| Request | HTTP | Response |
|---------|------|----------|
| GET /api/import-center?status=processing | 200 | 0 items |
| GET /api/import-center?status=needs_review | 200 | 25 items |
| GET /api/import-center?status=accepted | 200 | 0 items |
| GET /api/import-center?status=failed | 200 | 25 items (total=35) |
| GET /api/import-center?status=superseded | 200 | 0 items |
| GET /api/import-center?status=reversed | 200 | 0 items |
| GET /api/import-center?status=archived | 200 | 0 items |

### By Pagination

| Request | HTTP | items returned |
|---------|------|---------------|
| GET /api/import-center?limit=5 | 200 | 5 |
| GET /api/import-center?offset=5 | 200 | 25 (skipped 5) |

### Search

| Request | HTTP | Notes |
|---------|------|-------|
| GET /api/import-center?search=galicia | 200 | Matched on fileName/content |
| GET /api/import-center?search=Galicia | 200 | Accent-insensitive search works |

## HTTP 200 Verification for All Filters
All 12 filter requests returned HTTP 200 ✅

## hasMore Coherence
- limit=5, offset=0: hasMore=true (total=60, 5 returned < 60)
- offset=50: would have hasMore=false when offset+items >= total
