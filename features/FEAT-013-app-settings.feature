Feature: App settings management

  User configures application-level settings that persist across sessions.

  Scenario: User saves a setting
    Given the user is on the settings screen
    When the user changes a setting value
    Then a LocalAppSettings record is created or updated
    And the new value is used immediately by the application

  Scenario: Settings persist across restarts
    Given a LocalAppSettings record exists with key "currency" and value "ARS"
    When the application is restarted
    Then the setting value is still "ARS"
