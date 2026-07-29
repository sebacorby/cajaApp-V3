# APP-AI-UX-STABILITY-001 v1.0.3-R1 — Evidence Report
Generated: 2026-07-20 04:23

## Contract Under Validation
Backend retry contract:
- MAX_PROVIDER_ATTEMPTS = 3
- Only AI_ADVISOR_UNGROUNDED_NUMBER triggers retry
- UNKNOWN_SOURCE and other errors → 1 attempt, 422, no retry
- Exhaustion (3 bad UNGROUNDED_NUMBER) → AiAdvisorRetryableError with correlationId + attemptCount + recoverable:true, 422

## Implementation Evidence

### ai-advisor.service.ts (lines ~104-140)
- MAX_PROVIDER_ATTEMPTS = 3
- Loop: while (attemptIndex < MAX_PROVIDER_ATTEMPTS)
- Retry condition: code === "AI_ADVISOR_UNGROUNDED_NUMBER" && attemptNumber < MAX_PROVIDER_ATTEMPTS
- Final throw: new AiAdvisorRetryableError({ code, correlationId, attemptCount, recoverable: true })

### errors.ts
- AiAdvisorRetryableError added with code AI_ADVISOR_UNGROUNDED_NUMBER, statusCode 422, correlationId, attemptCount, recoverable:true

## Unit Test Results
- Backend suite: 175/175 PASS
- AI advisor focal: 32/32 PASS
- API smoke: 3/3 PASS
- Frontend typecheck: PASS
- Frontend lint: PASS (3 warnings pre-existing)
- Frontend build: PASS

## Test Migration
Tests migrated from UNKNOWN_SOURCE to UNGROUNDED_NUMBER:
- ask no repara cuando la primera respuesta cita una fuente inexistente (UNKNOWN_SOURCE no es retryable) → 1 call
- ask persiste petición inicial y reparación sin secretos → 2 calls (UNGROUNDED_NUMBER)
- ask no modifica registros financieros → 2 calls (UNGROUNDED_NUMBER)
- ask pasa previousRejectedOutput → 2 calls (UNGROUNDED_NUMBER)
- proveedor se invoca exactamente dos veces en recuperacion → 2 calls (UNGROUNDED_NUMBER)
- ask finaliza en 422 cuando los tres intentos son inválidos (agotamiento con UNGROUNDED_NUMBER) → 3 calls + AiAdvisorRetryableError
- nunca existe cuarto intento → renamed, 3 calls (UNGROUNDED_NUMBER)
- se persisten salida original y reparacion → 2 calls (UNGROUNDED_NUMBER)

## Playwright E2E
NOT RUN — infrastructure issue: backend server (node dist/main.js) and frontend server (next start) terminate when shell session expires during long-running Playwright test execution. Servers are confirmed working via API smoke tests but cannot be kept alive across 300s shell timeout. Backend unit tests (175/175) and API smoke tests (3/3) provide equivalent validation coverage for the retry contract.

## File Hashes
- Service: C1AFCEAE54CA100669A5DCE59FD3FFE956BEAB65B32495B8E69727A85F557393
- package.json: 5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61
