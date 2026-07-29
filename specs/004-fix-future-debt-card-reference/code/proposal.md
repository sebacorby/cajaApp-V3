# Proposal: 004-fix-future-debt-card-reference

## Why

When a card statement draft is accepted, `CardInstallmentProjection` records are created for each future installment. These projections do not store `cardLast4` directly — instead, `cardLast4` is derived at read time by joining the projection's `rowId` → `CardStatementRow.groupKey` → `CardStatementGroup.cardLast4`.

Due to a field name error in `acceptDraft()`, `CardStatementRow.groupKey` is being set to the **section ID** (via `r.groupId`) instead of the **group ID** (via `r.id`). This causes the `groups` map lookup in `normalizeProjection()` to return `undefined`, so `cardLast4` is `null` for every future installment row.

The consequence: every confirmed future debt installment is tagged with the `missing_card_reference` diagnostic and diverted to the `pendientes` section, even though the card reference is known and should be resolvable. Users see "sin tarjeta" instead of "Banco Galicia •••• 4521" for all their future installments.

## What Changes

### cards.service.ts — acceptDraft()

Fix `groupKey` assignment on `CardStatementRow` creation: replace `r.groupId` (section ID) with `r.id` (group ID). This restores the correct row→group join used by `normalizeProjection()` to derive `cardLast4`.

## Scope

**In scope:**
- Fix `groupKey: r.groupId` → `groupKey: r.id` in `cards.service.ts acceptDraft()` line ~830
- Add an integration test that verifies `cardLast4` is correctly derived for normalized projections

**Out of scope:**
- Schema migration to denormalize `cardLast4` onto `CardInstallmentProjection`
- Changes to `future.service.ts normalizeProjection()` — the join logic is correct; only the data being joined is wrong
- Migration of existing `CardStatementRow.groupKey` values in the database (existing unaccepted drafts would still need re-import; accepted statements with incorrect `groupKey` would need a data fix script, which is tracked separately)

## Capabilities

**Modified:** Future debt installment rows are now correctly associated with the originating card, displaying the card label (e.g., "Visa •••• 4521") instead of appearing in `pendientes` with `missing_card_reference`.