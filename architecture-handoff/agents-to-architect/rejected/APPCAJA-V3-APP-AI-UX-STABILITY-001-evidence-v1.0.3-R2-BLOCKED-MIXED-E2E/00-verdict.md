# APP-AI-UX-STABILITY-001 v1.0.3-R2 Verdict

**Generated**: 2026-07-21T02:10:00Z
**Validation**: APP-AI-UX-STABILITY-001 v1.0.3-R2
**Objective**: Close all E2E gates and promote backend retry contract (AI_ADVISOR_UNGROUNDED_NUMBER → max 3 attempts, structured 422)

---

## Staging Isolation: COMPLETE

- Junctions removed: `src/app`, `src/lib`, `src/components` → physical copies
- `src/hooks` also copied (was missing from candidate)
- `node_modules` is physical in candidate
- Canonical verified unchanged (hash comparison)
- `.next` cache cleared and rebuilt with IPv4 binding

---

## Backend Validation: ALL PASS

| Gate | Required | Actual | Status |
|------|----------|--------|--------|
| Focal AI Advisor | 32/32 | 32/32 | **PASS** |
| Full Backend Suite | 175/175 | 175/175 | **PASS** |
| Frontend Runtime Contract | 3/3 | 3/3 | **PASS** |
| TypeScript Build | 0 errors | 0 errors | **PASS** |

The backend validates correctly that `AI_ADVISOR_UNGROUNDED_NUMBER` triggers max 3 retry attempts with structured 422 responses.

---

## E2E Playwright: BLOCKED

### Focal AI Advisor
| Run | Result | Details |
|-----|--------|---------|
| Focal Run 1 | **1/2** | Test 1 PASS (43.5s); Test 2 FAIL on browser cleanup |
| Focal Run 2 | **1/2** | Same pattern - infrastructure issue |

### Order Contamination: **3/4 PASS**
- month-close: PASS
- ai-advisor spec 1: PASS
- ai-advisor spec 2: FAIL (browser cleanup)
- cleanup: not reached

### Full E2E Suite: **36/45 PASS, 9 FAIL**

| Category | Count | Failure Pattern |
|----------|-------|-----------------|
| Infrastructure | 4 | Python venv missing, browser cleanup |
| Application | 5 | Requires investigation |

#### Infrastructure Failures (not application issues):
1. `ai-advisor.spec.ts:60` - browser cleanup after viewport change
2. `card-statement-import.spec.ts:121` - Python venv missing
3. `salary-receipts.real.spec.ts:22` - Python venv missing
4. `salary-receipts.spec.ts:62` - Python venv missing

#### Application Failures (require investigation):
5. `categories.spec.ts` - 1.5m timeout
6. `financial-health.spec.ts` - 48.1s 
7. `movements.spec.ts` - 12.5m timeout
8. `privacy-mode.spec.ts` - 54.1s
9. (one more card statement retry test)

---

## Gating Status

```
Backend gates:         ✅ ALL PASS (32/32 focal, 175/175 full, 3/3 contract, 0 TS errors)
E2E gates:            ❌ ALL FAIL (focal 1/2, order 3/4, full 36/45)
Baseline comparison:   ⚠️  NOT RUN (no fresh baseline this session)
PROMOTION:             🚫 NOT AUTHORIZED - E2E gates blocked
```

---

## Root Cause Analysis

### E2E Infrastructure Issues
1. **Browser cleanup failure**: `ai-advisor.spec.ts:60` sets viewport to 390x844, does `page.goto("/")`, then the `finally` block calls `request.delete()` on the API. The browser/context appears to close after the mobile viewport navigation, causing `apiRequestContext.delete: Target page, context or browser has been closed`. Test assertions all pass; only cleanup fails.

2. **Python venv**: Candidate backend missing `.venv` directory (expected, since PDF processing is optional). Tests that depend on Python PDF import fail immediately.

### E2E Application Failures
The 4-5 application failures (`categories`, `financial-health`, `movements`, `privacy-mode`) require individual investigation. These could be:
- Pre-existing issues in the canonical codebase
- Environment-specific issues (DB state, timing)
- Real regressions that need fixing

---

## Recommendation

**DO NOT PROMOTE** until:
1. Python venv provisioned in candidate staging OR tests that require it are excluded from the gate
2. Browser cleanup issue in `ai-advisor.spec.ts:60` resolved OR test excluded from gate  
3. Application failures investigated and either fixed or declared pre-existing

**Backend is READY** for promotion if only backend changes are being deployed.

---

## Files Modified in R1/R2

From R1/R2 analysis (prior session):
- `backend/src/modules/ai-advisor/services/ai-advisor.service.ts` - UNGROUNDED_NUMBER retry logic
- `backend/src/modules/ai-advisor/prompts/` - prompt version changes
- Potentially other backend retry/contract files

**If promotion includes ONLY backend changes, and no frontend changes are needed, the backend validation (175/175 PASS) is sufficient.**
