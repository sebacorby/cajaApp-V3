Feature: Normal CajaApp actions
  As the CajaApp owner
  I want explicit everyday actions executed without redundant confirmation
  So that the agent reduces operational friction

  Scenario: Execute an explicit normal action
    Given the user explicitly requests a normal non-critical action
    And all required arguments identify a single valid operation
    When the agent submits the authorized action
    Then CajaApp executes it once
    And the agent reports the real result

  Scenario: Ask before acting on an ambiguous reference
    Given the user requests a normal action with multiple plausible targets
    When the agent cannot identify one target safely
    Then no data is modified
    And the agent asks for the minimum information needed to disambiguate

  Scenario: Ask before an inferred mutation
    Given the user did not explicitly request a mutation
    When the agent determines a normal mutation would be useful as an auxiliary step
    Then no mutation occurs automatically
    And the user is asked to authorize that action first

  Scenario: Avoid duplicate execution on retry
    Given a normal action already succeeded in the current work
    When the same technical execution is retried
    Then the successful mutation is not duplicated