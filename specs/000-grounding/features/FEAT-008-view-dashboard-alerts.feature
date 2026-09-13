Feature: View dashboard and alerts
  See balance evolution and deterministic alerts with drilldown.

  Background:
    Given the user is on the dashboard section

  Scenario: Dashboard shows balance trend
    When the dashboard loads
    Then the balance trend and summary cards are shown

  Scenario: Alert drills down to its cause
    Given an active alert
    When the user opens the alert drilldown
    Then the underlying records causing the alert are shown
