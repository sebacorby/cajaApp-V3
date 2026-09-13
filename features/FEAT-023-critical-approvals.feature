Feature: Critical action approvals
  As the CajaApp owner
  I want critical actions paused with visible impact
  So that destructive or definitive changes only happen after my approval

  Scenario: Hold a critical action before execution
    Given the agent proposes a critical CajaApp action
    When the action reaches the approval boundary
    Then no domain mutation has occurred
    And the user is shown the action impact and consequences

  Scenario: Execute exactly the approved action
    Given a critical action is awaiting approval
    When the user confirms that exact action
    Then the same agent work continues
    And only the approved arguments are executed

  Scenario: Reject a critical action
    Given a critical action is awaiting approval
    When the user rejects the action
    Then the domain remains unchanged by that action
    And the agent continues without bypassing the rejection

  Scenario: Invalidate approval when arguments change
    Given a critical action has an existing approval decision
    When the proposed action arguments are changed
    Then the previous approval is not valid for the changed action
    And execution remains blocked until a matching approval exists