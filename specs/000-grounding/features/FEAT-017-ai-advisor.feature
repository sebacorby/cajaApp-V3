Feature: Consult the AI advisor
  Get explain-only financial context with citations, without automated decisions.

  Background:
    Given the user is on the asesor IA section

  Scenario: Advisor explains with citations
    When the user asks about their financial context
    Then an explanation is returned with citations to the underlying data

  Scenario: Advisor never mutates records
    When the user asks for a change to their records
    Then no record is created, modified or deleted
    And the response explains with data instead of acting
