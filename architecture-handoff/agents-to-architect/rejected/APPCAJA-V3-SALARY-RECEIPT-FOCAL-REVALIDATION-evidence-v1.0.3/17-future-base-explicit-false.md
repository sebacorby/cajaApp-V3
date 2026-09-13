# 17 - Explicit False Future Base — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Test: useAsFutureBase: false

### Request
```
POST /api/salary-receipts/drafts/37639125-8897-442c-a692-c0c28f5522e8/accept
Content-Type: application/json
Body: {"useAsFutureBase": false}
```

### Response
```json
{
  "id": "af60c9d4-59be-4b30-a015-e78ba0fa9597",
  "status": "accepted",
  "isActiveForPeriod": true,
  "actualIncomeEventId": "1e3fdf0f-b80b-4cf2-8175-ca6bfbd9b606",
  "projectionIncomeEventId": null
}
```

## Result: ✅ PASS

- actualIncomeEventId: SET ✅ (real income created)
- projectionIncomeEventId: null ✅ (no future base adjustment)

The controller correctly respects explicit useAsFutureBase: false.