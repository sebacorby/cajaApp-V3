# 26 - SQLite Initial Addendum — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Prisma Migrate Status Details

### Migrations Applied (15 total)
1. 20240625_initial_schema
2. 20240625_001_add_users
3. 20240625_002_add_employers
4. 20240626_001_add_employee
5. 20240626_002_add_income_events
6. 20240701_001_add_employer_period_config
7. 20240710_001_add_salary_receipt_tables
8. 20240715_001_add_salary_receipt_concepts
9. 20240720_001_add_attachments
10. 20240801_001_add_projection_income_events
11. 20240810_001_add_receipt_versions
12. 20240815_001_add_status_fields
13. 20240820_001_add_indexes
14. 20250101_001_add_draft_status
15. 20260716033000_add_salary_receipts

### Database
- SQLite: C:\Users\javie\AppData\Local\Temp\cajaapp-salary-receipt-revalidation-v1.0.3\dev.db.backup
- SHA-256: E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208

### Schema Tables
- salary_receipt_drafts
- salary_receipts
- salary_receipt_versions
- income_events (actual and projection)
-概念的 (concepts table)
- attachments