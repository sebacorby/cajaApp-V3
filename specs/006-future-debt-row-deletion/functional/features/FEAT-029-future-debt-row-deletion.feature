Feature: Bulk Delete Future Debt Rows
  As the user
  I want to select and delete individual future debt rows
  So that I can remove erroneous or unwanted future installment obligations

  Background:
    Given multiple future debt rows exist in the system

  Scenario: Each future debt row displays a checkbox
    When the user views the future debt list
    Then each row has a visible checkbox on the left side

  Scenario: User can select an individual row
    When the user checks the checkbox of a specific row
    Then that row is marked as selected
    And the "Eliminar N filas" button appears with count 1

  Scenario: User can select all rows at once
    When the user checks the "select all" checkbox in the list header
    Then every row in the list is selected
    And the "Eliminar N filas" button appears with the total row count

  Scenario: User clicks delete and sees inline confirmation
    Given the user has selected one or more rows
    When the user clicks "Eliminar N filas"
    Then inline confirmation appears without opening a modal dialog
    And the confirmation offers "Confirmar" and "Cancelar" actions

  Scenario: User cancels the deletion
    Given the user has clicked "Eliminar N filas" and inline confirmation is shown
    When the user clicks "Cancelar"
    Then the confirmation is dismissed
    And no rows are deleted
    And all selected rows remain selected

  Scenario: User confirms and rows are deleted from the database
    Given the user has selected one or more rows
    And the user has clicked "Eliminar N filas"
    When the user clicks "Confirmar"
    Then the selected rows are removed from the database
    And the inline confirmation is dismissed

  Scenario: Manual rows delete both projection and ManualCardPurchase
    Given a manual row with isManual=true exists
    And the user has selected that row
    When the user confirms the deletion
    Then the CardInstallmentProjection record is deleted
    And the corresponding ManualCardPurchase record is also deleted

  Scenario: After deletion, rows disappear from the UI immediately
    Given the user has confirmed deletion of selected rows
    Then the deleted rows are no longer visible in the future debt list
    And the remaining rows are still displayed correctly
    And the "Eliminar N filas" button is hidden when no rows are selected
