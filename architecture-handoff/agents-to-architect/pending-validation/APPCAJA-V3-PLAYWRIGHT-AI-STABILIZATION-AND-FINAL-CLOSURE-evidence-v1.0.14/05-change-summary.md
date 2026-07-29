# Change Summary

## Authorized Changes Made

### ai-advisor.spec.ts (split into 2 tests)

**Test A:** "Asesor IA mantiene fingerprint, claims y citas consistentes"
- Creates movements
- GET /api/ai-advisor/context
- POST /api/ai-advisor/ask (1 AI query)
- Validates fingerprint, claims, citations
- Timeout: 240s

**Test B:** "Asesor IA responde en UI desktop y conserva acceso mobile"
- Creates movements
- Opens app, navigates to AI Advisor
- Sends UI query (1 AI query)
- Validates response
- Mobile viewport test
- Timeout: 240s

## No Changes Made To

- `ai-advisor.service.ts` (frozen from v1.0.13)
- `ai-advisor.service.test.ts` (frozen from v1.0.13)
- `ai-advisor.schemas.ts` (frozen)
- Prompts (frozen)
- Prisma schema (frozen)
- Migrations (frozen)
- Lockfiles (unchanged)
- Frontend productive code (frozen)

## Fingerprint Fix (from v1.0.13, verified frozen)

The fix ensures:
- `normalizeAdvisorPeriod()` extracts only `{from, to}`
- Both `context()` and `ask()` use normalized period
- Fingerprint is independent of mode, currency, question
- Simulation fingerprints are deterministic

## Test Results

- Backend tests: 154/154 PASS
- Test A (API): PASS (~19s)
- Test B (UI): FAIL - timeout at 240s
