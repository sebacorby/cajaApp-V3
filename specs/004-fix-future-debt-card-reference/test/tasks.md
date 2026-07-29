# Tasks: 004-fix-future-debt-card-reference

## 1. Test — Verify cardLast4 derivation from accepted draft

- [ ] 1.1 Write integration test: accept a card statement draft with installment purchases, then call `normalizeProjection` on the resulting projections
  - Assert that the normalized occurrence has `cardLast4` matching the group's `cardLast4` (not null)
  - Assert that `cardLabel` is populated (not null)
  - Assert that `status` is `"confirmed"` (not diverted to pendientes)
  - Assert that `missing_card_reference` diagnostic is NOT present
  - **This test must FAIL before the fix is applied**

## 2. Fix — Correct groupKey assignment

- [ ] 2.1 In `cards.service.ts acceptDraft()` around line 830, change `groupKey: r.groupId` to `groupKey: r.id`
  - `r.groupId` is the **section ID** (incorrect)
  - `r.id` is the **group ID** (correct)

## 3. Verification

- [ ] 3.1 Run the integration test from task 1.1
  - It must now PASS — `cardLast4` is correctly derived, `cardLabel` is populated, no `missing_card_reference` diagnostic
- [ ] 3.2 Run the full test suite
  - All tests must pass with no regressions