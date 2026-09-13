# CajaApp V3 — Domain

Functional domain inferred from code (`workspace/backend/prisma/schema.prisma`
— 34 models — route modules, `contracts/`, frontend sections). Architecture
reference: `docs/technical.md`.

## Entities

- **UploadedDocument**: stored source file (PDF/CSV) with SHA dedup key.
  Related to every import run. Duplicates blocked by SHA.
- **AiExtractionRun**: one AI extraction attempt (prompt hash, model,
  durations, status). Traceability root for drafts.
- **CardStatementDraft (+ Section/Group/Row)**: editable preview of an
  imported card statement. Statuses: `imported` → `processing` →
  `preview_ready` | `failed`; `accepted` once materialized.
- **CardStatement (+ Section/Group/Row)**: accepted, immutable statement with
  history (archive/activate) and traceability back to draft + run.
- **CardInstallmentProjection / ManualCardPurchase**: installments derived
  from accepted statements; manually entered card purchases.
- **SalaryReceiptDraft (+ Item) / SalaryReceipt (+ Item)**: mirror draft →
  accepted flow for salary receipts.
- **DebitCsvImport (+ Row)**: parsed debit CSV import batch and its rows.
- **IncomeSource / IncomeEvent**: recurring income sources and realized or
  projected income events (real + projected).
- **MovementCategory (+ Rule) / ManualMovement**: categorization taxonomy
  with auto-categorization rules; unified ledger entries incl. manual ones.
- **CurrencyExchangeRate**: USD/ARS rate used by card statements.
- **LocalAppSettings**: local preferences incl. `hideAmounts` (privacy) and
  theme.
- **SavingsGoal (+ Contribution/Activity), CategoryBudget**: planning
  entities (goals with contributions, per-category budgets).
- **FinancialHealthSnapshot, AiAdvisorInteraction**: health snapshots;
  explain-only advisor turns with citations.
- **ReconciliationCase (+ Participant)**: reversible duplicate/relationship
  cases across sources (frozen detector + manager).
- **MonthClose (+ Activity)**: monthly close aggregate and its activities.
- **BackupArchive (+ Activity)**: backup archives and restore activities.

## Business Flows

1. **Import card statement (PDF → AI → draft → accept)**: upload PDF
   (`POST /api/card-statements/import`, 10MB) → RAW text via
   `python/pdf_to_raw.py` → document-type detection → AI extraction
   (contracts prompts/schemas, `AiExtractionRun`) → draft (`processing` →
   `preview_ready`, polled via `GET /import/:draftId/status`) → user edits
   (`PUT /drafts/:draftId`) → accept (`POST /drafts/:draftId/accept`)
   materializes statement + sections/groups/rows + installment projections.
   Duplicates rejected by SHA; failures land in `failed` with `failedAt`.
2. **Import salary receipt**: mirror flow under `/api/salary-receipts/*`
   (draft + items → accepted receipt).
3. **Import debit CSV**: parse + import rows under `/api/debit-imports/*`.
4. **Import center triage**: aggregated inbox (`/api/import-center`) across
   cards, receipts and CSV imports for review.
5. **Manual card purchase**: hand-entered purchases feeding statements and
   projections.
6. **Income tracking**: sources + events, real vs projected, salary
   calculations (`/api/incomes`).
7. **Ledger + categorization**: unified movements, manual entries, category
   rules auto-classify, export (`/api/movements`).
8. **Dashboard + alerts**: balance trend, deterministic alerts with drilldown
   (`/api/dashboard`).
9. **Planning**: category budgets and savings goals with contributions
   (`/api/budgets`, `/api/goals`).
10. **Future commitments**: debt/future projection panel
    (`/api/future-commitments`).
11. **Reports**: reports + exports (`/api/reports`).
12. **Reconciliation**: detect duplicate/related records across sources,
    resolve reversibly (`/api/reconciliation`).
13. **Month close**: close a month with activities (`/api/month-close`).
14. **Backup/restore**: create archives, restore `dev.db`
    (`/api/backup-restore`).
15. **AI advice (explain-only)**: contextual explanation with citations and
    isolated simulations; never computes authoritatively, mutates records or
    decides (`/api/ai-advisor`).
16. **Global search**: cross-entity search (`/api/search`).
17. **Settings + privacy**: local settings, `hideAmounts` masking via shared
    `Amount` component, persisted theme (`/api/settings`).

## Domain Terminology

Recurring names across backend, contracts and UI (Spanish UI, English code):
draft / preview (`preview_ready`) / accept / statement (`resumen`) /
section / group / row / installment (`cuota`) / receipt (`recibo`) /
import center (`centro de importaciones`) / movement (`movimiento`) /
category + rules / income (`ingreso`, real vs projected) / dashboard +
alerts / goal (`objetivo`) / budget (`presupuesto`) / future commitments
(`deuda futura`) / reconciliation (`conciliación`) / month close
(`cierre mensual`) / backup-restore (`respaldo`) / financial health
(`salud financiera`) / advisor (`asesor IA`) / exchange rate
(`cotización USD/ARS`) / hideAmounts (privacy masking).

---
grounding-version: 2
generated-by: IADEV-grounding
source-commit: n/a-no-git-repo
