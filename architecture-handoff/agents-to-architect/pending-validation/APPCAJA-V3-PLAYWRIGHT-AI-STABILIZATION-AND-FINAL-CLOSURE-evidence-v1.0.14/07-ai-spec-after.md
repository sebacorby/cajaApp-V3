# AI Spec (After)

## New ai-advisor.spec.ts

### Test A: "Asesor IA mantiene fingerprint, claims y citas consistentes"

```typescript
test("Asesor IA mantiene fingerprint, claims y citas consistentes", async ({ request }) => {
  test.setTimeout(240_000);
  // Creates 2 movements
  // GET /api/ai-advisor/context
  // POST /api/ai-advisor/ask (1 AI query)
  // Validates fingerprint, claims, citations
  // Cleanup
});
```

### Test B: "Asesor IA responde en UI desktop y conserva acceso mobile"

```typescript
test("Asesor IA responde en UI desktop y conserva acceso mobile", async ({ page, request }) => {
  test.setTimeout(240_000);
  // Creates 2 movements
  // Opens app, navigates to AI Advisor
  // Sends 1 AI query via UI
  // Validates response
  // Mobile viewport test
  // Cleanup
});
```

## Changes Made

1. Split single test into two independent tests
2. Each test has its own movements and cleanup
3. Test A: 1 API query
4. Test B: 1 UI query
5. Maintained all original assertions

## Test Results

- Test A: PASS (~19s)
- Test B: FAIL - timeout at 240s

## Test B Analysis

Test B consistently times out at 240s. The UI query with question "Explicá los factores financieros del período con evidencia." appears to hang. Direct API calls with the same question work in ~13-20s, suggesting the issue is with the UI flow's context loading or query submission, not the AI service itself.
