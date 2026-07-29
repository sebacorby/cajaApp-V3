# 20 - Explicit False Future Base — v1.0.2 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Status: BLOCKED

## Reason

Cannot test explicit `useAsFutureBase: false` because no salary receipt PDF available for import.

## Code Verification

The controller code at `salary-receipts.controller.ts:51` correctly implements:
```ts
useAsFutureBase: payload.useAsFutureBase ?? true,
```

When `useAsFutureBase: false` is explicitly sent, the service layer should respect it and create real income without future base adjustment.

## Conclusion

Code-level verification: PASS ✅
Runtime verification: BLOCKED (missing test data)
