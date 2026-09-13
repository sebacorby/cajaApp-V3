Feature: Project future commitments
  See upcoming debt and installment obligations projected over time.

  Background:
    Given accepted statements or manual purchases with installments

  Scenario: Future commitments are projected
    When the user opens the deuda futura view
    Then the upcoming installment obligations are listed by period

  Scenario: Exchange rate converts card amounts
    Given a USD/ARS exchange rate is set
    When the user views card statement values
    Then the amounts are shown converted with that rate
