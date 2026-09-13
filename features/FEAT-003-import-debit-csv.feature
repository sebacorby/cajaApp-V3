Feature: Import debit movements from CSV
  Upload a bank debit CSV and review the parsed rows before accepting them.

  Background:
    Given the user is on the importaciones section

  Scenario: Upload CSV parses rows for review
    When the user uploads a debit CSV file
    Then the parsed rows are shown for review

  Scenario: Accept CSV import records the movements
    Given parsed debit CSV rows under review
    When the user accepts the import
    Then the debit movements are recorded in the ledger
