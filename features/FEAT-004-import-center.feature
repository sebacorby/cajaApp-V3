Feature: Triage imports in import center
  Review every pending import from a single aggregated inbox.

  Background:
    Given pending imports exist from cards, receipts or CSV

  Scenario: Import center lists all pending imports
    When the user opens the import center
    Then every pending import is listed with its kind and status

  Scenario: Open an import from the inbox
    Given a pending import in the inbox
    When the user opens it
    Then the import detail is shown for review
