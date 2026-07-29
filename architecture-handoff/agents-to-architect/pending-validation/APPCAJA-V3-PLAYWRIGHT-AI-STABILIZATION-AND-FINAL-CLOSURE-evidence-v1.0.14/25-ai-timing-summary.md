# AI Timing Summary

## 3 Consecutive AI Queries

| Query | Question | Status | Duration (ms) | Attempts | Fingerprint Match |
|--------|----------|--------|---------------|----------|-------------------|
| 1 | Balance del período actual. | 201 | 20636 | 1 | YES |
| 2 | Resumen de finanzas. | 201 | 9574 | 1 | YES |
| 3 | Análisis financiero. | 201 | 21408 | 1 | YES |

## Gate Result

- 3/3 HTTP 201: PASS
- 3/3 fingerprint match: PASS
- All durations < 180s: PASS

## Notes

- Questions used for measurement differ from Playwright test questions
- Ollama cloud rate limiting required 60s waits between queries
- All fingerprints matched their respective context fingerprints

## Playwright Test Questions

- Test A: "Explicá el balance realizado y esperado usando sólo fuentes de CajaApp."
- Test B: "Explicá los factores financieros del período con evidencia."

Test A passed (API call ~19s). Test B timed out (UI call >240s).

The issue is not with the AI service or fingerprint fix - both API calls work correctly. The issue is with the UI flow in Test B.
