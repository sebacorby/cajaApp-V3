Feature: Salary receipt import and AI extraction

  User uploads a salary receipt PDF and reviews the AI-extracted earnings
  and deductions before committing them to the income record.

  Background:
    Given the AI extraction service is available

  Scenario: Upload a salary receipt PDF
    Given the user has a salary receipt PDF file
    When the user uploads the PDF via the import flow
    Then an UploadedDocument record is created
    And an AiExtractionRun record is created with status "pending"

  Scenario: AI extracts salary receipt data
    Given an UploadedDocument with a pending AiExtractionRun for salary receipt
    When the AI worker processes the document
    Then the LLM output is validated against the salary-receipt schema
    And a SalaryReceiptDraft is created with employer info, items, and totals

  Scenario: User accepts salary receipt draft
    Given a SalaryReceiptDraft exists
    When the user accepts the draft
    Then a SalaryReceipt record is created with all items
    And the corresponding IncomeEvent.actualAmount is updated
    And the draft is deleted

  Scenario: User rejects salary receipt draft
    Given a SalaryReceiptDraft exists
    When the user rejects the draft
    Then the draft is preserved for editing
    And no SalaryReceipt is created
