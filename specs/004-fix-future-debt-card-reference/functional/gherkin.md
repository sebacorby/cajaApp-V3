# Specification: specs/004-fix-future-debt-card-reference

PRD: [PRD.md](./PRD.md)

## FEAT-026: Fix Card Reference in Future Debt Projections

type: functional

Scenarios: [FEAT-026-fix-card-reference.feature](./features/FEAT-026-fix-card-reference.feature)

Active: features/FEAT-026-fix-card-reference.feature

---

## Supplementary Notes

### Root cause (product level)

When `acceptDraft` creates `CardInstallmentProjection` records, it sets `groupKey` on `CardStatementRow` using `r.groupId` from the preview, which is the **section ID** rather than the actual **group ID**. This breaks the row→group join at read time in `normalizeProjection`, causing `cardLast4` to be `null` and triggering the `missing_card_reference` diagnostic.

### Fix scope

The fix should ensure that `CardStatementRow.groupKey` stores the correct group ID (`g.id` from the preview group), not the section ID (`r.groupId`). Alternatively, `cardLast4` could be denormalized directly onto `CardInstallmentProjection` to make the projection self-contained.

### Expected outcome

After the fix, all confirmed future debt installments are grouped under the correct card with `cardLabel` showing "Banco Galicia •••• 4521" (or similar) instead of appearing in `pendientes` with "missing_card_reference".
