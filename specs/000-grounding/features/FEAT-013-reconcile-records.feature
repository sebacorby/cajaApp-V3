Feature: Reconcile records across sources
  Detect duplicates and relationships between sources and resolve them reversibly.

  Background:
    Given the user is on the conciliacion section

  Scenario: Duplicate records open a case
    Given the same record exists in two sources
    When reconciliation runs
    Then a case is opened linking both participants

  Scenario: Resolve a case reversibly
    Given an open reconciliation case
    When the user resolves the case
    Then the records are linked and the resolution can be reverted
