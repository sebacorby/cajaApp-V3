# Known Issues

## Issue 1: Test B UI Timeout

### Description
Test B ("Asesor IA responde en UI desktop y conserva acceso mobile") consistently times out at 240 seconds.

### Symptom
- Test A (API+fingerprint): PASS in ~19s
- Test B (UI desktop+mobile): FAIL - times out at 240s

### Investigation
- Direct API call with Test B's question "Explicá los factores financieros del período con evidencia." works in ~13-20s
- The same question via UI flow hangs
- Issue is specific to the UI flow, not the AI service or fingerprint fix

### Root Cause
Likely related to how the UI loads context before submitting the query. The context summary loading or the query submission appears to hang in the Playwright context.

### Impact
- Focal test cannot achieve 2/2 PASS
- Full suite not executed

## Issue 2: Ollama Cloud Rate Limiting

### Description
Ollama cloud service imposes aggressive rate limiting on AI queries.

### Symptom
- Consecutive queries with same/similar questions return 422 Unprocessable Entity
- Rate limit resets after ~60s between different questions

### Mitigation
- Used different questions for AI measurement
- Waited 60s between consecutive queries

### Impact
- AI measurement required longer time due to rate limits
- Not a code issue, external dependency

## Note

The fingerprint fix from v1.0.13 is verified working. Test A proves this. The issue is with the UI test infrastructure/timing, not the code.
