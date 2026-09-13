Feature: Configure settings and privacy
  Adjust local settings, mask amounts for privacy, and persist the theme.

  Background:
    Given the user is on the configuracion section

  Scenario: Hide amounts masks every money display
    When the user enables hide amounts
    Then every amount in the app is shown masked

  Scenario: Settings persist across sessions
    Given the user changed settings
    When the app is reopened
    Then the saved settings are applied
