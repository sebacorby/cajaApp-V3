Feature: Generate reports and exports
  Produce financial reports and export their data.

  Background:
    Given the user is on the reportes section

  Scenario: View a report
    When the user opens a report
    Then the report figures match the underlying records

  Scenario: Export a report
    Given a generated report
    When the user exports it
    Then an export file with the report data is produced
