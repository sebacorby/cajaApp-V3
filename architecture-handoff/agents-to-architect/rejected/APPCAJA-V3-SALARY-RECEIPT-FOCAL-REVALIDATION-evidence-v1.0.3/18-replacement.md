# 18 - Replacement — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Test: Replace same period (2026-06) with byte-different PDF

### Step 1: First receipt (base PDF) accepted
- Receipt ID: 142a84e2-d2a2-4514-8513-195bb65e0ee2
- Period: 2026-06
- Status: accepted
- isActiveForPeriod: true
- version: 1
- netAmount: 1,212,000.00

### Step 2: Second receipt (replacement PDF) accepted
- Receipt ID: 6a63ceee-a8f5-4dc8-b5db-ebed061f4678
- Period: 2026-06 (same employer, employee)
- Status: accepted
- isActiveForPeriod: true
- version: 2 (supersedes base)
- netAmount: 1,195,200.00 (corrected values)

### Verification
```
GET /api/salary-receipts?limit=10&includeReversed=true
```

Results:
1. **Old receipt** (142a84e2...): status=reversed, isActiveForPeriod=false, version=1 ✅
2. **New receipt** (6a63ceee...): status=accepted, isActiveForPeriod=true, version=2 ✅
3. **Other** (af60c9d4... for 2026-07): unaffected ✅

## Result: ✅ PASS

- Old receipt superseded (reversed) ✅
- New receipt active (accepted) ✅
- Only one active receipt per period ✅
- No orphan events ✅