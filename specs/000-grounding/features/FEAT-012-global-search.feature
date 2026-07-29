Feature: Global search

  User searches across all entities from a single search input to
  quickly find transactions, goals, budgets, or settings.

  Scenario: User searches for a transaction by description
    Given movements exist with various descriptions
    When the user searches for "Uber"
    Then all movements containing "Uber" in the description are returned

  Scenario: User searches across multiple entity types
    Given a movement "Uber Trip", a goal "Emergency Fund", and a budget for "Food" exist
    When the user searches for "fund"
    Then results include the Emergency Fund goal
    And any movement with "fund" in description
    And category names matching "fund"

  Scenario: Search returns categorized results
    Given a search query matches multiple entity types
    When the results are displayed
    Then results are grouped by type (Movements, Goals, Budgets, etc.)
