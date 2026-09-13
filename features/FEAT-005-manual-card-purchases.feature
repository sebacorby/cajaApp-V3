Feature: Manage manual card purchases
  Hand-enter card purchases that did not come from any statement import.

  Scenario: Register a manual purchase
    Given the user is on the tarjetas section
    When the user registers a manual card purchase with amount and installments
    Then the purchase is listed among the card purchases

  Scenario: Manual purchase feeds projections
    Given a manual purchase with installments
    When the user views future commitments
    Then the purchase installments appear projected
