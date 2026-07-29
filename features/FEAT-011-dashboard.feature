Feature: Financial dashboard

  The dashboard provides an aggregated view of the user's financial
  situation for the current month and recent history.

  Scenario: User views the dashboard
    Given the user has financial data for the current month
    When the user opens the dashboard
    Then the view shows:
      - Total income vs. total expenses for the month
      - Budget status per category (spent vs. limit)
      - Recent movements list
      - Savings goal progress widgets
      - Financial health score widget

  Scenario: Dashboard updates in real time
    Given the user is viewing the dashboard
    When a new movement is recorded
    Then the dashboard widgets update without a page reload

  Scenario: User navigates to a past month's dashboard
    Given historical data exists for "2026-05"
    When the user selects month "2026-05"
    Then the dashboard displays data for that month

  Scenario: Dashboard shows trend charts
    Given multiple months of data exist
    When the user views the dashboard
    Then trend charts display income, expenses, and net savings over the last 6 months
