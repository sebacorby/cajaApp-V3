Feature: Backup and restore
  Create backup archives of the local database and restore them.

  Background:
    Given the user is on the respaldo section

  Scenario: Create a backup archive
    When the user creates a backup
    Then a backup archive is recorded with its activity

  Scenario: Restore a backup archive
    Given a backup archive exists
    When the user restores it
    Then the database matches the archived state
