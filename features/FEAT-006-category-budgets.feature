Feature: Category budget management

  User defines monthly spending limits per category and the system tracks
  spending against those limits in real time.

  Scenario: User sets a monthly budget for a category
    Given a MovementCategory exists
    And the user is on the budgets screen
    When the user sets a CategoryBudget of 50000 for category "Food" in month "2026-07"
    Then a CategoryBudget record is created with limitAmount 50000 and spentAmount 0

  Scenario: Spending updates the spent amount on a budget
    Given a CategoryBudget exists for "Food" in "2026-07"
    When a ManualMovement of category "Food" for 10000 is created
    Then the budget's spentAmount increases by 10000

  Scenario: Budget shows over-spent when limit is exceeded
    Given a CategoryBudget with limitAmount 50000 and spentAmount 45000
    When a new expense of 10000 in category "Food" is recorded
    Then the budget's spentAmount becomes 55000
    And the budget is flagged as over limit

  Scenario: User views all budgets for a month
    Given budgets exist for multiple categories in "2026-07"
    When the user opens the budgets view for month "2026-07"
    Then each budget shows its limit, spent, and remaining amount
