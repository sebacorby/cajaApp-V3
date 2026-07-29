# Discovery collision check

Status: completed by the discoverer. Reproduced here for traceability.

## FEAT-015 — Future Installment Projections (active)

- **Collision:** the active `features/FEAT-015-future-installment-projections.feature` describes a "remainingInstallments" model that does not match the persisted `CardInstallmentProjection` schema. The active feature assumes a single projection record per source purchase with a `remainingInstallments` counter; the actual schema stores one row per future installment with `monthKey` populated.
- **Resolution:** `FEAT-015` is treated as **historical** — it remains in `features/` until delivery summarization confirms any deprecation. The new features `FEAT-016…FEAT-023` are the **detailed successor specification** for the future-debt behavior. The active feature is not modified by this change.

## FEAT-001 — Card Statement Import (active)

- **Collision:** `FEAT-001` says that `CardInstallmentProjection` records are derived from installment rows on statement acceptance. The new feature set constrains that derivation through the rule set (RN-001…RN-016), but does not change the acceptance flow.
- **Resolution:** the statement-acceptance flow remains unchanged. The new read path consumes the persisted `CardInstallmentProjection` rows; it does not change how those rows are created. The mapper (`card-statement.mapper.ts`) and the projection service (`installment-projection.service.ts`) are not modified.

## `FEAT-016+future-debt` — no overlap with non-card features

- **Collision:** the rejected `future.service.ts` mixed card debt with `income` and `other_commitment` buckets. The new feature set is scoped to card debt only (per PRD §5.1).
- **Resolution:** the new endpoint exposes only card-related data. The `income` and `other_commitment` buckets are not part of this PRD; they are not in the new contract. A separate "future cash-flow" view, if needed, is a separate PRD.
