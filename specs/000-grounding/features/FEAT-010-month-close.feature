Feature: Month close process

  User closes a fiscal month, generating a summary snapshot and
  updating the financial health record.

  Scenario: User closes a month
    Given all income events and movements for "2026-06" are recorded
    When the user triggers month close for "2026-06"
    Then a MonthClose record is created with:
      - totalIncome (sum of actual income events)
      - totalExpenses (sum of card + manual + debit movements)
      - netSavings = totalIncome - totalExpenses
      - savingsRate = netSavings / totalIncome
    And a MonthCloseActivity record is created
    And a FinancialHealthSnapshot is generated or updated

  Scenario: User cannot close a month twice
    Given a MonthClose exists for "2026-06"
    When the user attempts to close "2026-06" again
    Then an error is returned indicating the month is already closed

  Scenario: User views past month close summaries
    Given multiple MonthClose records exist
    When the user opens the month close history
    Then each closed month shows totalIncome, totalExpenses, netSavings, and savingsRate
