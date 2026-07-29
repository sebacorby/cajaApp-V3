Feature: Transaction reconciliation

  The system automatically identifies transactions that likely refer to
  the same event across different sources (card statement vs. manual entry).

  Scenario: System suggests reconciliation candidates
    Given a CardStatementRow exists with amount 5000 and date "2026-06-15"
    And a ManualMovement exists with amount 5000 and date "2026-06-15"
    When the reconciliation engine runs
    Then a ReconciliationCase is created with these two participants
    And the case status is "open"

  Scenario: User accepts a reconciliation match
    Given a ReconciliationCase with two participants exists
    When the user accepts the match
    Then the case status is set to "resolved"
    And the participants are linked

  Scenario: User discards a reconciliation suggestion
    Given a ReconciliationCase exists
    When the user discards the suggestion
    Then the case status is set to "discarded"
    And no linking occurs

  Scenario: User leaves a reconciliation case open
    Given a ReconciliationCase exists
    When the user takes no action
    Then the case remains in "open" status
