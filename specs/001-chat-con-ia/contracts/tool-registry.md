# Tool Registry Contract

The backend registry is the only authority for tools available to the conversational agent.

Each entry MUST define:
- `name`: stable public tool identifier.
- `description`: model-facing purpose without hidden implementation details.
- `inputSchema`: validator for model-generated arguments.
- `riskClass`: `R0|R1|R2|R3|R4` fixed in code.
- `parallelSafe`: whether independent calls may execute concurrently.
- `requiresExplicitIntent`: whether normal execution requires an explicit user request.
- `handler`: adapter that calls an existing domain service.
- `resultProjector`: removes internal/secret fields before returning a result to the model.
- `auditEntityRefs`: extracts stable entity references for conversation memory/audit.

## Risk semantics

- `R0`: read-only; automatic.
- `R1`: artifact generation/download; automatic only after explicit request.
- `R2`: normal write; automatic only when current user intent explicitly requests it and arguments are unambiguous, otherwise approval is required.
- `R3`: materialization, reversal, delete, reconciliation or close; approval always required.
- `R4`: database restore; validation plus approval always required.

Risk class is never accepted from provider output.

## Phase C read catalog

Initial read tools:
- `app.search`
- `dashboard.get_overview`
- `movements.list`
- `movements.export_csv`
- `categories.list`
- `categories.suggest`
- `cards.list_statements`
- `cards.get_latest`
- `cards.get_statement`
- `cards.get_traceability`
- `cards.get_exchange_rate`
- `cards.get_updated_values`
- `card_import.get_status`
- `card_import.get_draft`
- `import_center.list`
- `import_center.get`
- `debit_import.list`
- `debit_import.get`
- `salary_receipt.list`
- `salary_receipt.get`
- `salary_receipt.get_draft`
- `incomes.get_overview`
- `budgets.get_overview`
- `budgets.list`
- `goals.get_overview`
- `goals.list`
- `goals.get`
- `future.get_overview`
- `reports.get`
- `reports.export_csv`
- `reconciliation.list`
- `reconciliation.get`
- `financial_health.get`
- `financial_health.history`
- `month_close.list`
- `month_close.get`
- `backup.list`
- `backup.download`
- `settings.get`
- `settings.get_system`
- `ui.navigate`

## Phase D normal writes (R2)

- `movements.create_manual`
- `movements.update_manual`
- `categories.create`
- `categories.update`
- `categories.assign`
- `incomes.create_source`
- `incomes.update_source`
- `incomes.create_event`
- `budgets.create`
- `budgets.update`
- `budgets.set_status`
- `goals.create`
- `goals.update`
- `goals.set_status`
- `goals.add_contribution`
- `cards.set_exchange_rate`
- `cards.create_manual_purchase`
- `backup.create`
- `settings.update`

## Phase F import/review tools

- `card_import.upload_attachment`
- `card_import.update_draft`
- `debit_import.preview_attachment`
- `debit_import.update_row`
- `salary_receipt.import_attachment`
- `salary_receipt.update_draft`
- `backup.validate`
- `reconciliation.scan`
- `financial_health.create_snapshot`

Attachment-based tools accept only an `attachmentId` owned by the conversation; never a filesystem path.

## Critical tools (R3/R4)

R3:
- `card_import.accept_draft`
- `cards.archive_statement`
- `cards.activate_statement`
- `debit_import.accept`
- `debit_import.delete`
- `debit_import.reverse`
- `salary_receipt.accept_draft`
- `salary_receipt.reverse`
- `movements.void_manual`
- `cards.delete_manual_purchase`
- `categories.archive`
- `categories.restore`
- `incomes.delete_source`
- `incomes.delete_event`
- `budgets.delete`
- `goals.delete`
- `goals.delete_contribution`
- `reconciliation.resolve`
- `reconciliation.reopen`
- `month_close.create`
- `month_close.reopen`
- `financial_health.delete_snapshot`

R4:
- `backup.restore`

## Forbidden registry behavior

- No tool named from arbitrary model text can be dispatched if absent from registry.
- No handler accepts SQL, table names, method names, shell commands or arbitrary paths.
- `ai-advisor.ask` is intentionally absent; the conversational agent never nests the existing advisor as a subagent.
- A result projector must remove internal storage paths, credentials, environment values and raw secret-bearing errors.
