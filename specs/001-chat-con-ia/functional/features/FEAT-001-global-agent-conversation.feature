Feature: Global agent conversation
  As the CajaApp owner
  I want to converse with the AI agent from any section
  So that I can keep working without leaving my current context

  Scenario: Open the agent without changing the current section
    Given the user is viewing any CajaApp section
    When the user opens the floating AI agent launcher
    Then the current CajaApp section remains visible
    And the agent conversation becomes available

  Scenario: Minimize and reopen the active conversation
    Given the user has an active agent conversation
    When the user minimizes and reopens the agent
    Then the same conversation is restored
    And its current messages and pending state remain available

  Scenario: Continue an archived conversation
    Given the user opens an archived conversation
    When the user sends a new message
    Then the conversation is automatically reactivated
    And the new message continues the same thread

  Scenario: Handle a general conversation without CajaApp data
    Given the user asks about a topic unrelated to CajaApp state
    When the agent prepares a response
    Then the agent answers conversationally without unnecessary CajaApp actions