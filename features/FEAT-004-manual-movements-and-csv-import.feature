Feature: Manual movement recording and CSV import

  User manually enters financial transactions and can also import
  bank debit transactions from a CSV file.

  Scenario: User records a manual expense
    Given the user is on the movements screen
    When the user enters date, description, amount, and category
    Then a ManualMovement record is created with isExpense true

  Scenario: User records a manual income movement
    Given the user is on the movements screen
    When the user enters date, description, amount, and category as income
    Then a ManualMovement record is created with isExpense false

  Scenario: Category auto-assignment applies to manual movement
    Given a MovementCategoryRule exists for "Uber" matching description contains "UBER"
    When the user creates a ManualMovement with description "UBER Trip"
    Then the movement is assigned the matching category automatically

  Scenario: User imports a debit CSV file
    Given the user has a bank CSV export file
    When the user uploads the CSV via the debit import flow
    Then a DebitCsvImport record is created
    And DebitCsvRow records are created for each data row
    And category auto-assignment rules are applied to each row

  Scenario: User confirms debit CSV import
    Given a DebitCsvImport with rows exists and user has reviewed them
    When the user confirms the import
    Then ManualMovement records are created from each DebitCsvRow
    And the import is marked as processed
