Feature: Credit card statement import and AI extraction

  User uploads a credit card statement PDF and reviews the AI-extracted
  transactions before committing them to the record.

  Background:
    Given the AI extraction service is available
    And the PDF text extraction service is available

  Scenario: Upload a new credit card statement PDF
    Given the user has a credit card statement PDF file
    When the user uploads the PDF via the import flow
    Then a new UploadedDocument record is created
    And an AiExtractionRun record is created with status "pending"

  Scenario: AI extraction processes the PDF asynchronously
    Given an UploadedDocument with a pending AiExtractionRun exists
    When the AI worker picks up the extraction job
    Then raw text is extracted using pdfplumber
    And the PDF pages are converted to images
    And each page is sent to the Ollama vision model
    And the LLM output is validated against the card-statement-import schema
    And a CardStatementDraft is created with sections, groups, and rows

  Scenario: AI extraction fails and job is marked failed
    Given an UploadedDocument with a pending AiExtractionRun exists
    When the AI worker encounters an unrecoverable error
    Then the AiExtractionRun status is set to "failed"
    And the error message is stored on the run record

  Scenario: User reviews and accepts a card statement draft
    Given a CardStatementDraft exists with transactions
    When the user reviews the draft in the UI
    And the user accepts the draft
    Then a CardStatement record is created with the same data
    Then CardStatementSection, Group, and Row records are created
    And CardInstallmentProjection records are derived from installment rows
    And the draft is deleted

  Scenario: User edits a draft row before accepting
    Given a CardStatementDraft exists with at least one row
    When the user edits the amount of a draft row
    Then the draft row is updated with the new amount
    And the draft remains editable until acceptance

  Scenario: User rejects a card statement draft
    Given a CardStatementDraft exists
    When the user rejects the draft
    Then the draft is preserved for further editing
    And no CardStatement is created
