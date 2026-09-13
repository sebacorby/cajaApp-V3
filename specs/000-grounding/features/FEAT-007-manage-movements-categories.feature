Feature: Manage movements and categories
  Keep a unified ledger with manual entries and rule-based categorization.

  Background:
    Given the user is on the movimientos section

  Scenario: Register a manual movement
    When the user registers a manual movement with category and amount
    Then the movement appears in the ledger

  Scenario: Category rule auto-classifies movements
    Given a categorization rule for a category
    When a matching movement is recorded
    Then the movement is assigned to that category

  Scenario: Export movements
    Given movements exist in the ledger
    When the user exports the movements
    Then an export file with the movements is produced
