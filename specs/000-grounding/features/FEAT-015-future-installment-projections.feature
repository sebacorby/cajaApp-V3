Feature: Future installment projections

  The system projects future credit card installment obligations based
  on accepted card statements, helping the user plan for upcoming payments.

  Scenario: Installment purchase creates projection
    Given a CardStatementRow with installments=6 and amount=30000 is accepted
    When the projection is generated
    Then a CardInstallmentProjection record is created
    And remainingInstallments is set to 5
    And remainingAmount reflects the unpaid balance

  Scenario: User views upcoming installment obligations
    Given CardInstallmentProjection records exist from past statements
    When the user opens the future view
    Then all future installment payments are listed with dates and amounts
    And the total upcoming obligation is displayed

  Scenario: Projection is reduced as installments are paid
    Given a CardInstallmentProjection with remainingInstallments=6
    When a new card statement is imported showing 1 installment paid
    Then the projection's remainingInstallments is decremented
    And remainingAmount is updated to the new unpaid balance
