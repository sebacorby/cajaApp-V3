Feature: Fix Projection RowId Reference After Statement Acceptance
  As the system
  I want CardInstallmentProjection records to reference the actual persisted row IDs
  So that future debt queries correctly join projections to statement rows and display card references

  Background:
    Given a card statement draft has been reviewed and accepted
    And the statement includes installment purchase rows
    And CardInstallmentProjection records were created during acceptance

  Scenario: Accepted statement installments show correct card reference in future debt view
    When the user views the future debt overview
    Then each installment occurrence is grouped under the correct card
    And the card label shows the bank name and last 4 digits (e.g., "Banco Galicia •••• 4521")
    And no installment appears with "missing_card_reference"

  Scenario: Projection rowId matches the persisted CardStatementRow id after acceptance
    When the draft is accepted
    Then each CardInstallmentProjection.rowId stores the actual CardStatementRow.id (a UUID)
    And future debt queries can successfully join projection to row via rowId
    And the cardLast4 is correctly derived from the associated CardStatementGroup

  Scenario: Re-importing a statement with corrected projections does not repeat the missing card reference
    Given a previous import produced installments with missing_card_reference
    When the user re-imports and accepts the corrected statement
    Then the new projections have correct rowId references
    And the future debt view shows all installments under the correct card
    And the pendientes section has zero missing_card_reference rows
