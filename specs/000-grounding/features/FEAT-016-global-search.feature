Feature: Search across the app
  Find records across entities from a single global search.

  Scenario: Global search returns matching records
    Given records exist across several entities
    When the user searches for a matching term
    Then the matching records are listed grouped by entity
