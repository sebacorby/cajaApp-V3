export type FinanceChartCurrency = "ARS" | "USD";

export interface MonthlyEvolutionDatum {
  monthKey: string;
  label: string;
  range?: { from: string; to: string };
  incomeArs: string;
  expenseArs: string;
  balanceArs: string;
  incomeUsd: string;
  expenseUsd: string;
  balanceUsd: string;
  projectedExpenseArs: string;
  projectedExpenseUsd: string;
}

export interface CategoryDistributionDatum {
  id: string;
  name: string;
  color: string;
  amountArs: string;
  amountUsd: string;
  shareArs: string | null;
  shareUsd: string | null;
  records?: number;
}
