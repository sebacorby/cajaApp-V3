Feature: Manage incomes
  Track recurring income sources with real and projected events.

  Background:
    Given the user is on the ingresos section

  Scenario: Register an income source
    When the user registers an income source
    Then the source is listed with its projected events

  Scenario: Record a real income event
    Given an income source exists
    When the user records a real income event
    Then the event counts toward realized income

  Scenario: View projected income
    Given an income source with future events
    When the user views projections
    Then the future income events are shown separately from realized ones
