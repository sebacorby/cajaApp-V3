Feature: Delete Accepted Card Statements
  As the user
  I want to be able to delete accepted card statements with wrong data
  So that I can remove erroneous records and clean up my financial data

  Background:
    Given at least one accepted card statement exists in the system

  Scenario: User deletes an accepted card statement from the statements list
    When the user navigates to the card statements list
    And the user selects an accepted statement
    And the user clicks the delete action
    And the user confirms the deletion
    Then the statement is removed from the database
    And all associated sections, groups, and rows are cascade-deleted
    And all associated CardInstallmentProjection records are cascade-deleted
    And all associated ManualCardPurchase records are cascade-deleted
    And the statements list no longer shows the deleted statement

  Scenario: Deleted statement's future debt installments no longer appear
    Given a card statement with installments was previously accepted
    When that statement is deleted
    And the user views the future debt overview
    Then no installments from the deleted statement appear
    And no pendientes entries from the deleted statement appear

  Scenario: Delete action is unavailable for draft statements
    When the user is viewing a draft statement
    Then the delete action is not shown or is disabled
    And draft statements can only be discarded via the discard draft action

  Scenario: Deleting a statement with no associated projections succeeds
    Given an accepted card statement with no installment rows
    When the user deletes that statement
    Then the deletion succeeds
    And the statement and all its child records are removed
