# AI Spec (Before)

## Original ai-advisor.spec.ts

```typescript
test("Asesor IA usa contexto estructurado, cita fuentes y limpia su historial", async ({ page, request }) => {
  test.setTimeout(240_000);
  // Creates 2 movements
  // GET /api/ai-advisor/context
  // POST /api/ai-advisor/ask (1st AI query)
  // Validates fingerprint, claims, citations
  // Opens UI, navigates to AI Advisor
  // Sends 2nd AI query via UI
  // Mobile viewport test
  // Cleanup
});
```

Single test with 2 AI queries:
1. API call: "Explicá el balance realizado y esperado usando sólo fuentes de CajaApp."
2. UI call: "Explicá los factores financieros del período con evidencia."

Issue: 2 AI queries in 240s timeout exceeded when AI service is slow.
