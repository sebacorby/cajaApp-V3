Feature: Manage budgets
  Set per-category budgets and track spending against them.

  Background:
    Given the user is on the presupuestos section

  Scenario: Create a category budget
    When the user creates a budget for a category
    Then the budget is listed with its limit

  Scenario: Spending counts against the budget
    Given a budget for a category
    When movements in that category are recorded
    Then the budget shows the consumed amount
