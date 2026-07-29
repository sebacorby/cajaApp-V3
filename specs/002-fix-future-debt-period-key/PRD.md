# PRD — Spec 002: Fix Future Debt Period Key Bug

## Bug Description

### Title
Fix `currentPeriodKey` format bug in Future Debt API endpoint

### Problem Statement
The `GET /api/future-debt` endpoint returns HTTP 500 with:
```
{"code":"INTERNAL_ERROR","message":"Future-debt response failed contract validation: range.currentPeriodKey: Expected YYYY-MM"}
```

The response contains `currentPeriodKey: "13-Jul-"` (malformed) instead of a valid YYYY-MM string like `"2026-07"`.

### Root Cause
In `future.service.ts`, the code attempts to extract `YYYY-MM` from `activeStatement?.periodLabel` using `.slice(0, 7)`:
```typescript
const currentPeriodKey = activeStatement?.periodLabel?.slice(0, 7) ?? null;
```

However, `periodLabel` (which equals `CardStatement.periodLabel = currentDueDate`) stores a **full date** like `"15/07/2026"` or `"July 15, 2026"`, NOT `"YYYY-MM"`. When sliced with `.slice(0, 7)`:
- `"15/07/2026"` → `"15/07/"` (INVALID)
- `"July 15, 2026"` → `"July 1"` (INVALID)

### Expected Behavior
`currentPeriodKey` MUST be a valid YYYY-MM string (matching regex `/^\d{4}-(0[1-9]|1[0-2])$/`, e.g., `"2026-07"`).

### Where the Bug Lives
- `workspace/backend/src/modules/future/future.service.ts` — lines 142, 221, 271 where `periodLabel` is used incorrectly
- The underlying data comes from `cards.service.ts` where `CardStatement.periodLabel = preview.summary.currentDueDate`
- The ACTUAL YYYY-MM period key is stored in `CardStatement.periodKey` (the correct field to use)

### Files to Investigate
1. `workspace/backend/src/modules/future/future.service.ts` — where `currentPeriodKey` and `statementPeriodKey` are set
2. `workspace/backend/src/modules/cards/cards.service.ts` — where `periodKey` vs `periodLabel` are set on CardStatement
3. `workspace/backend/prisma/schema.prisma` — the CardStatement model fields
