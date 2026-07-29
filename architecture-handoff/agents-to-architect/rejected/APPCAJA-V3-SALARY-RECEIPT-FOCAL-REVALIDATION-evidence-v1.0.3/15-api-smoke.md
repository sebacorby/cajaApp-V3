# 15 - API Smoke — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Full Scenario Test (base PDF, useAsFutureBase default=true)

### 1. Import PDF
```
POST /api/salary-receipts/import (multipart, salary-receipt.sanitized.base.pdf)
→ 201, draftId=fdd376d0-e67b-4489-87d7-41a3eb9b77cb, status=preview_ready
```
✅ PASS

### 2. Edit Concept
```
PUT /api/salary-receipts/drafts/fdd376d0-e67b-4489-87d7-41a3eb9b77cb (concept-1 amount changed to 1250000.00)
→ 200, updated preview confirmed
```
✅ PASS

### 3. Accept (omit useAsFutureBase → defaults to true)
```
POST /api/salary-receipts/drafts/fdd376d0-e67b-4489-87d7-41a3eb9b77cb/accept (body: {})
→ 201, receiptId=142a84e2-d2a2-4514-8513-195bb65e0ee2
    isActiveForPeriod=true
    actualIncomeEventId=02271efe-86a7-4983-a305-0eb83d8bfc5a
    projectionIncomeEventId=0e0f3dd7-2fbb-4053-87ca-83f11417402c
```
✅ PASS — projectionIncomeEventId SET (future base created)

### 4. Verify in List
```
GET /api/salary-receipts?limit=10
→ Receipt present with netAmount=1212000.00 (updated), projectionIncomeEventId present
```
✅ PASS

### 5. Reverse
```
POST /api/salary-receipts/142a84e2-d2a2-4514-8513-195bb65e0ee2/reverse
→ {"success":true}
GET /api/salary-receipts?includeReversed=true
→ status=reversed, reversedAt set, actualIncomeEventId=null, projectionIncomeEventId=null
```
✅ PASS — events removed

## Conclusion: ALL PASS ✅