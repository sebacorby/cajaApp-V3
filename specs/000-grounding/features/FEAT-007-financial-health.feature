Feature: Financial health tracking

  The system periodically calculates and stores a financial health snapshot
  including net worth, assets, liabilities, and a composite score.

  Scenario: System generates a financial health snapshot
    Given income events, movements, and savings goals exist for "2026-06"
    When the financial health calculation is triggered
    Then a FinancialHealthSnapshot is created for monthKey "2026-06"
    And it includes totalAssets (from goal balances)
    And totalLiabilities (from card statement balances and manual movements)
    And netWorth = totalAssets - totalLiabilities
    And emergencyFundMonths = savings / monthlyExpenses
    And a composite score 0-100

  Scenario: User views financial health history
    Given multiple FinancialHealthSnapshots exist for past months
    When the user opens the financial health view
    Then the history is displayed with score trend over time

  Scenario: Snapshot updates when new data arrives
    Given a FinancialHealthSnapshot exists for "2026-06"
    When a new income event is recorded for "2026-06"
    Then the snapshot's totalAssets are recalculated
    And the score is updated
