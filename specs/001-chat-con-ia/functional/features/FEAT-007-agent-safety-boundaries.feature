Feature: Agent safety boundaries
  As the CajaApp owner
  I want agent actions constrained to authorized application capabilities
  So that conversational freedom never bypasses domain safety

  Scenario: Reject invalid action arguments
    Given the agent proposes a known action with invalid or incomplete arguments
    When CajaApp validates the action
    Then the action is rejected without modifying domain data
    And the validation failure is available to the agent

  Scenario: Preserve the existing AI advisor behavior
    Given the separate AI advisor remains available in CajaApp
    When the conversational agent feature is used
    Then the AI advisor keeps its explain-only behavior
    And it is not used as a mutation-capable subagent

  Scenario: Respect amount privacy in structured presentation
    Given amount hiding is enabled in CajaApp preferences
    When the agent displays structured financial results
    Then visible amounts follow the same masking behavior as the rest of CajaApp

  Scenario: Keep financial operations behind authorized capabilities
    Given the model requests access outside the authorized CajaApp actions
    When the runtime evaluates that request
    Then direct database, arbitrary filesystem, shell, and dynamic action access are unavailable