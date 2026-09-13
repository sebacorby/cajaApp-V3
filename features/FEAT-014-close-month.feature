Feature: Close the month
  Close a financial month with its activities recorded.

  Background:
    Given the user is on the cierres section

  Scenario: Close an open month
    When the user closes the current month
    Then the month close is recorded with its activities

  Scenario: Closed month stays readable
    Given a closed month
    When the user opens it
    Then its snapshot and activities are shown
