Feature: Real CajaApp data and navigation
  As the CajaApp owner
  I want answers grounded in my current data
  So that the agent can help me act on real records

  Scenario: Answer a question using current CajaApp data
    Given CajaApp contains financial records relevant to the question
    When the user asks about the current state of those records
    Then the agent obtains the required CajaApp data before answering
    And the answer is based on the retrieved results

  Scenario: Combine multiple sources for one answer
    Given the user asks a question that depends on more than one CajaApp area
    When the agent gathers the required information
    Then the response combines the relevant results coherently
    And no missing financial value is invented

  Scenario: Navigate to an identified record
    Given the conversation contains an unambiguous CajaApp entity reference
    When the user asks to go to that entity
    Then CajaApp navigates to the matching section or record
    And the agent conversation remains open

  Scenario: Refuse an unknown action
    Given the model proposes an action outside the authorized catalog
    When CajaApp evaluates the proposed action
    Then the action is rejected without dynamic execution
    And the failure is recorded for the conversation