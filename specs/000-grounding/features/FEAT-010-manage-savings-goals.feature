Feature: Manage savings goals
  Define savings goals and record contributions toward them.

  Background:
    Given the user is on the objetivos section

  Scenario: Create a savings goal
    When the user creates a savings goal with a target amount
    Then the goal is listed with zero progress

  Scenario: Contribute to a goal
    Given a savings goal exists
    When the user records a contribution
    Then the goal progress reflects the contribution
