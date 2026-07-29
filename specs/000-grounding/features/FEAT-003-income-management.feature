Feature: Income source and event management

  User defines recurring income sources (e.g., salary) and records
  monthly income events — both projected and actual amounts.

  Scenario: User creates an income source
    Given the user is on the income management screen
    When the user creates a new income source with label and type "salary"
    Then an IncomeSource record is created with isActive true

  Scenario: Income event is auto-projected from source
    Given an active IncomeSource exists
    When a new month begins or the user navigates to a future month
    Then an IncomeEvent is created with projectedAmount and no actualAmount

  Scenario: User sets projected amount for an income event
    Given an IncomeEvent exists for a given month
    When the user sets the projectedAmount
    Then the IncomeEvent.projectedAmount is updated

  Scenario: Salary receipt acceptance updates actual amount
    Given an IncomeEvent exists linked to a salary IncomeSource
    When the user accepts a SalaryReceipt for that source and period
    Then the IncomeEvent.actualAmount is set to the receipt netAmount

  Scenario: User records one-time income
    Given an IncomeSource with type "other" exists
    When the user enters a one-time income event
    Then an IncomeEvent is created with actualAmount set
