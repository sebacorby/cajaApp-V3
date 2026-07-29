Feature: AI financial advisor

  User asks questions about their financial situation and receives
  structured, source-cited answers from a local LLM.

  Background:
    Given the AI advisor service is available

  Scenario: User asks a financial question
    Given the user has financial data for the current month
    When the user sends a question to the AI advisor
    Then the system gathers relevant context (transactions, budgets, health)
    And sends a structured prompt to Ollama with a citation catalog
    And a structured response is received with claims, risks, and follow-up questions
    And an AiAdvisorInteraction record is created

  Scenario: User views AI advisor conversation history
    Given multiple AiAdvisorInteraction records exist
    When the user opens the AI advisor screen
    Then the conversation thread is displayed

  Scenario: AI advisor response includes source citations
    Given the AI advisor generates a response about spending
    When the response is received
    Then each claim includes a sourceId referencing real data
    And the frontend renders the citations as clickable references

  Scenario: AI advisor falls back when LLM is unavailable
    Given Ollama is not running
    When the user sends a question to the AI advisor
    Then an error is returned indicating the service is unavailable
    And no AiAdvisorInteraction record is created
