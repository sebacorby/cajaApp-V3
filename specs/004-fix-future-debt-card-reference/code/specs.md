# Specs: 004-fix-future-debt-card-reference

Behavioral scenarios: [gherkin.md](../functional/gherkin.md)

## Requirements

### FEAT-026: Fix Card Reference in Future Debt Projections

**Type:** functional
**Scenarios:** [gherkin.md#feat-026](../functional/gherkin.md#feat-026-fix-card-reference-in-future-debt-projections)

**Implementation notes:**
- `CardStatementRow.groupKey` must be the group ID (`r.id` from `CardStatementPreviewRow`), not the section ID (`r.groupId`). The `groups` map in `normalizeProjection()` is keyed by `${statementId}:${group.groupKey}`, so a section ID in `groupKey` will never match.
- No schema change required — the fix is a correction of the value assigned, not a change to the column meaning.
- `normalizeProjection()` in `future.service.ts` requires no changes; the join logic is correct. Only the data being joined is wrong.
- The fix applies at draft acceptance time; already-accepted statements with incorrect `groupKey` are a separate data fix concern (out of scope).