Feature: Recovery and continuity
  As the CajaApp owner
  I want conversations and work to survive interruptions
  So that long-running agent tasks remain reliable

  Scenario: Reopen a persisted conversation after restart
    Given a conversation contains persisted messages and agent activity
    When CajaApp is restarted and the user reopens that conversation
    Then the persisted thread is available again
    And relevant references and pending states can be continued

  Scenario: Recover after a visual stream interruption
    Given an agent run continues while the visual connection is interrupted
    When the interface reconnects to that run
    Then it recovers the current run state
    And already successful actions are not repeated

  Scenario: Cancel an active response safely
    Given the agent has an active run
    When the user requests cancellation
    Then generation stops in a controlled way
    And no completed action is duplicated or rolled back implicitly

  Scenario: Continue a long conversation with preserved references
    Given a conversation has grown beyond the active context budget
    When the user continues the conversation
    Then the agent retains the identifiers and pending decisions required to continue