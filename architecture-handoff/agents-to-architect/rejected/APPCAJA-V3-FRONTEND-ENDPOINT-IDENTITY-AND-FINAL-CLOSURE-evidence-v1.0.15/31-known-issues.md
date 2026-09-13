# Known Issues

## 1. AI Advisor UI Test Timeout

**Test:** ai-advisor.spec.ts:60 — "Asesor IA responde en UI desktop y conserva acceso mobile"

**Symptom:** After filling question and clicking submit, the `ai-advisor-response` element never appears within 180 seconds.

**Error Context shows:**
- UI fully rendered with AI Advisor section visible
- Question text filled correctly
- Submit button clicked
- No error displayed in UI

**Analysis:** The API call succeeded (confirmed by Test 1 passing). The issue is UI-level: the response Card component (`<Card data-testid="ai-advisor-response"...>`) is not rendering after `setInteraction()` is called.

**Possible causes:**
- `interaction.answer` may have unexpected structure causing render failure
- Timing issue in React state update
- Frontend error handler setting error state instead of interaction

**Status:** Pre-existing issue, not caused by port change

---

## 2. Card Statement Import — Python venv Not Found

**Test:** e2e\card-statement-import.spec.ts:121 — "imports Galicia Visa PDF and renders the real preview"

**Symptom:** `Failed to spawn Python: spawn .venv\Scripts\python.exe ENOENT`

**Analysis:** The Python virtual environment for PDF processing is not set up in the test environment. This is an infrastructure/environment issue, not a code issue.

**Status:** Pre-existing environment issue

---

## 3. Lint Warnings (Pre-existing)

3 warnings in frontend code:
- `@typescript-eslint/no-unused-expressions` in 3 files

**Status:** Pre-existing, not introduced by this change
