Feature: Savings goals management

  User creates savings goals with a target amount and deadline, records
  contributions, and tracks progress toward the goal.

  Scenario: User creates a savings goal
    Given the user is on the goals screen
    When the user creates a goal with label "Emergency Fund", targetAmount 100000, deadline "2026-12-31"
    Then a SavingsGoal record is created with currentAmount 0 and isCompleted false

  Scenario: User adds a contribution to a goal
    Given a SavingsGoal exists
    When the user records a contribution of amount 5000 with note "July deposit"
    Then a GoalContribution record is created
    And the goal's currentAmount increases by 5000
    And a GoalActivity record is created logging the contribution

  Scenario: Goal is marked completed when target is reached
    Given a SavingsGoal with currentAmount 95000
    When a contribution of 5000 is added bringing currentAmount to 100000
    Then the goal's isCompleted is set to true

  Scenario: User views goal progress
    Given a SavingsGoal with known currentAmount and targetAmount
    When the user views the goal
    Then the percentage progress is displayed
    And the projected completion date is shown
