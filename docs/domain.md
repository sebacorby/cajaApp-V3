# CajaApp V3 — Domain Model

## Entities

### Document & Extraction

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `UploadedDocument` | Stores raw PDF uploaded by user | id, filename, mimeType, sizeBytes, storagePath, uploadedAt |
| `AiExtractionRun` | Tracks each AI extraction job | id, documentId, status (pending/processing/completed/failed), provider, startedAt, completedAt, errorMessage |
| `CardStatementDraft` | Temporary storage for AI-extracted card data before user accepts | id, extractionRunId, totalAmount, currency, billingPeriodStart, billingPeriodEnd, dueDate |
| `CardStatementDraftSection` | A section within a draft statement (e.g., purchases, payments) | id, draftId, type, displayOrder |
| `CardStatementDraftGroup` | A group within a section (e.g., monthly installments, total tax) | id, sectionId, label, displayOrder |
| `CardStatementDraftRow` | Individual transaction row within a group | id, groupId, date, description, amount, currency, installments, installmentNumber |
| `CardStatement` | Accepted card statement — committed to the user's record | id, extractionRunId, totalAmount, currency, billingPeriodStart, billingPeriodEnd, dueDate, acceptedAt |
| `CardStatementSection` / `Group` / `Row` | Same structure as draft, but immutable after acceptance | (same as above) |
| `CardInstallmentProjection` | Persisted future installment occurrence consumed by the Future Debt read flow | id, statementId, rowId, monthKey (YYYY-MM), installmentCurrent, installmentTotal, amountPesosRaw/amountDollarsRaw, currencyOriginal, isManual |
| `SalaryReceiptDraft` / `SalaryReceiptDraftItem` | Draft version of salary receipt before acceptance | id, extractionRunId, employerName, employeeName, periodMonthKey, payDate, grossAmount, deductionsAmount, netAmount |
| `SalaryReceipt` / `SalaryReceiptItem` | Accepted salary receipt | (same as draft, plus acceptedAt) |

### Income

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `IncomeSource` | A recurring income stream (e.g., "Salary — Company X") | id, label, type (salary/freelance/investment/other), isActive |
| `IncomeEvent` | A single income occurrence (actual or projected) | id, sourceId, monthKey (YYYY-MM), projectedAmount, actualAmount, receivedAt |

### Movements

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `ManualMovement` | A manually entered financial transaction | id, date, description, amount, currency, categoryId, isExpense |
| `MovementCategory` | Category for auto-assignment rules | id, name, icon, color, type (expense/income) |
| `MovementCategoryRule` | Rule for automatic category assignment | id, categoryId, matchField, matchOperator, matchValue, priority |
| `DebitCsvImport` | Metadata for an uploaded CSV file | id, filename, uploadedAt, rowCount, processedAt |
| `DebitCsvRow` | One row from a debit CSV import | id, importId, date, description, amount, currency, categoryId |

### Planning & Budgeting

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `SavingsGoal` | A savings target with a deadline | id, label, targetAmount, currentAmount, deadline, isCompleted |
| `GoalContribution` | A deposit toward a savings goal | id, goalId, amount, date, note |
| `GoalActivity` | Audit log of goal changes | id, goalId, action, amount, previousAmount, newAmount |
| `CategoryBudget` | Monthly spending limit per category | id, categoryId, monthKey (YYYY-MM), limitAmount, spentAmount |
| `FinancialHealthSnapshot` | Periodic health score and metrics | id, monthKey, score, totalAssets, totalLiabilities, netWorth, emergencyFundMonths |

### Reconciliation

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `ReconciliationCase` | A set of transactions that appear to match each other | id, status (open/resolved/discarded), matchType |
| `ReconciliationParticipant` | A record participating in a reconciliation case | id, caseId, entityType, entityId, amount, overlap |

### Month Close

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `MonthClose` | Summary snapshot of a completed month | id, monthKey, totalIncome, totalExpenses, netSavings, savingsRate |
| `MonthCloseActivity` | Audit trail of month close operations | id, monthCloseId, action, details |

### AI

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `AiAdvisorInteraction` | A single turn in a conversation with the AI advisor | id, role (user/assistant), content, claims, sources, createdAt |

### Operations

| Entity | Responsibility | Key Properties |
|--------|---------------|----------------|
| `LocalAppSettings` | Key-value app settings | id, key, value |
| `BackupArchive` | A backup file | id, filename, createdAt, sizeBytes |
| `BackupRestoreActivity` | Audit log of backup/restore operations | id, action, archiveId, performedAt |

---

## Business Flows

### 1. Credit Card Statement Import

```
User uploads PDF
  → UploadedDocument created (status: received)
  → AiExtractionRun created (status: pending)
  → AI worker picks up job
    → Python pdfplumber extracts raw text
    → Ollama vision processes pages → JSON
    → JSON validated against card-statement-import.schema.json
    → On failure: json-repair.service re-prompts (up to N retries)
  → CardStatementDraft created with sections/groups/rows
  → User reviews draft in UI (edit amount, description, category)
   → User accepts draft
     → CardStatement + sections/groups/rows created from draft
     → CardInstallmentProjections derived from installment rows
     → Projection rowId values corrected to match persisted row UUIDs (composite-key map on displayOrder + sectionKey + groupKey)
     → Draft deleted
   → On reject: draft kept for re-editing
```

### 2. Future Debt Consultation

```
Accepted statement rows and manual card purchases
  → persisted CardInstallmentProjection occurrences
  → Future Debt reads projections without re-projecting or mutating data
  → source statement row/group or manual purchase is joined for traceability
  → invalid, missing-currency, or missing-card rows are diagnosed and kept in pendientes
  → valid occurrences are deduplicated and grouped by month (YYYY-MM) and card
  → ARS and USD totals are calculated independently from visible rows
  → user selects a 1–24 month horizon and may reveal the current period
```

This flow is deterministic and non-destructive: consecutive reads with unchanged persisted data return the same result, and consultation does not create, delete, replace, reconcile, or alter occurrences, statements, or purchases. The endpoint is `GET /api/future-debt`.

### 3. Salary Receipt Import

```
User uploads PDF
  → UploadedDocument + AiExtractionRun created
  → AI worker processes via salary-receipt extraction prompt
  → SalaryReceiptDraft created
  → User reviews draft (employer, employee, items)
  → User accepts → SalaryReceipt created; draft deleted
```

### 4. Income Recording

```
User defines IncomeSource (e.g., "Salary")
  → IncomeEvent created per month (projected amount)
  → When salary receipt is imported and accepted:
    → IncomeEvent.actualAmount updated from receipt.netAmount
  → User can override projected amount manually
```

### 5. Manual Movement Recording

```
User enters date, description, amount
  → MovementCategoryRule engine assigns category automatically
  → ManualMovement created
  → Used in: dashboard aggregation, budget tracking, financial health
```

### 6. Debit CSV Import

```
User uploads bank CSV (debit transactions)
  → DebitCsvImport + DebitCsvRow records created
  → Category auto-assignment rules applied per row
  → User reviews and confirms import
  → Rows merged into ManualMovement records
```

### 7. Budget Tracking

```
User sets CategoryBudget for a category + month
  → During month: spentAmount accumulates from ManualMovement + CardStatementRow
  → Dashboard shows budget vs. actual per category
  → Alerts generated when approaching/exceeding limit
```

### 8. Savings Goal Tracking

```
User creates SavingsGoal (target amount + deadline)
  → GoalContributions recorded as money is added
  → GoalActivity audit log maintained
  → Projected completion date calculated
```

### 9. Financial Health Snapshot

```
Monthly (or on-demand): system calculates
  → Total assets (from goal balances, income sources)
  → Total liabilities (from card statement balances, manual movements)
  → Net worth = assets - liabilities
  → Emergency fund months = savings / monthly expenses
  → Composite health score (0–100)
  → Stored as FinancialHealthSnapshot
```

### 10. AI Financial Advisor

```
User asks a question (e.g., "Why did my spending spike in June?")
  → System gathers relevant context (transactions, budgets, health)
  → Prompt sent to Ollama with:
    - Current month financial data
    - Recent transactions
    - Budget vs. actual
    - Citation catalog (source IDs for each claim)
  → LLM responds with structured answer:
    - Claims with source references
    - Risks, alternatives, limitations
    - Follow-up questions
  → AiAdvisorInteraction stored (user + assistant turns)
```

### 11. Month Close

```
User triggers month close for YYYY-MM
  → System creates MonthClose snapshot:
    - Sums all income events (actual)
    - Sums all expense movements (card + manual + debit)
    - Calculates net savings and savings rate
  → MonthCloseActivity audit record created
  → FinancialHealthSnapshot updated
```

### 12. Reconciliation (Auto-match)

```
After importing card statements + manual movements:
  → Reconciliation engine looks for:
    - Same amount (within tolerance)
    - Date proximity
    - Description similarity
  → Potential matches presented as ReconciliationCase
  → User resolves: accept match / discard / leave open
  → Matched items linked to same ReconciliationParticipant
```

### 13. Backup & Restore

```
User triggers backup
  → Prisma exports SQLite file
  → Stored as BackupArchive
  → BackupRestoreActivity logged
User triggers restore
  → Confirm dialog
  → SQLite replaced from archive
  → BackupRestoreActivity logged
```

---

## Domain Terminology

| Term | Meaning |
|------|---------|
| **Card Statement** | Monthly summary from a credit card issuer; lists all transactions and the total balance due |
| **Draft** | Temporary, user-editable version of an AI-extracted document; not yet committed |
| **AI Extraction Run** | One invocation of the AI pipeline for one uploaded document |
| **Installment Projection** | A future obligation derived from an installment purchase in a card statement |
| **Income Source** | A recurring stream of income (salary, freelance, etc.) |
| **Income Event** | A specific occurrence of an income source for a given month |
| **Movement** | Any financial transaction (expense or income) — from card, manual entry, or CSV import |
| **Reconciliation** | The act of matching the same transaction appearing in two different sources |
| **Month Key** | Format `YYYY-MM`; used to group records by fiscal month |
| **Financial Health Score** | Composite 0–100 score reflecting the user's overall financial condition |
| **Category Rule** | An auto-assignment rule that categorizes a movement based on description patterns |
| **AI Advisor** | A chat-style interface powered by local Ollama LLM that explains financial context |
| **Citation Catalog** | System in the AI advisor that tags each LLM claim with a `sourceId` pointing to real data |
| **Salary Receipt** | A payslip or paysheet document; used to auto-populate income events |

---
grounding-version: 2
generated-by: IADEV-grounding
source-commit: no-git
