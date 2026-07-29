Feature: Database backup and restore

  User can create on-demand backups of the SQLite database and restore
  from a previous backup.

  Scenario: User creates a backup
    Given the user is on the backup/restore screen
    When the user triggers a backup
    Then a BackupArchive record is created with filename and size
    And the SQLite database file is copied to the archive location
    And a BackupRestoreActivity record is created

  Scenario: User restores from a backup
    Given a BackupArchive exists
    And the user is on the backup/restore screen
    When the user selects the archive and confirms the restore
    Then the current database is replaced with the archived copy
    And a BackupRestoreActivity record is created

  Scenario: User cannot restore without confirmation
    Given a BackupArchive exists
    When the user attempts to restore without explicit confirmation
    Then an error is returned
    And no restore occurs
