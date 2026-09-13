Feature: Review card statement history
  Browse past statements with traceability and archive control.

  Background:
    Given accepted card statements exist

  Scenario: History lists past statements
    When the user opens the statement history
    Then every accepted statement is listed

  Scenario: Statement shows its traceability
    Given an accepted statement
    When the user opens its traceability
    Then the originating draft and extraction run are shown

  Scenario: Archive and reactivate a statement
    Given an active statement
    When the user archives it
    Then it leaves the active view and can be reactivated later
