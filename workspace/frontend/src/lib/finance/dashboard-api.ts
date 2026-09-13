const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export type DashboardCurrency = "ARS" | "USD";
export type DashboardMovementType = "income" | "expense";
export type DashboardMovementStatus = "actual" | "pending" | "projected" | "voided";


export type DashboardAlertSeverity = "critical" | "warning" | "info";


export interface DashboardAlert {
  id: string;
  rule: string;
  severity: DashboardAlertSeverity;
  title: string;
  message: string;
  evidence: string[];
  action: {
    section: "movimientos" | "tarjetas" | "ingresos";
    label: string;
    drilldown?: {
      from: string;
      to: string;
      label: string;
      type?: "income" | "expense";
      source?: string;
      category?: string;
      status?: "actual" | "pending" | "projected";
      includeProjected?: boolean;
    };
  };
}


export interface DashboardMovement {
  id: string;
  occurredOn: string;
  effectiveMonthKey: string;
  type: DashboardMovementType;
  sourceType: string;
  sourceId: string;
  description: string;
  category: { id: string | null; name: string };
  currency: DashboardCurrency;
  amount: string;
  status: DashboardMovementStatus;
  notes: string | null;
  editable: boolean;
  categoryEditable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  trace: { sourceLabel: string };
}


export interface DashboardTotals {
  incomeArs: string;
  expenseArs: string;
  balanceArs: string;
  incomeUsd: string;
  expenseUsd: string;
  balanceUsd: string;
  savingsRateArs: string | null;
  savingsRateUsd: string | null;
  records: number;
}


export interface DashboardCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  amountArs: string;
  amountUsd: string;
  shareArs: string | null;
  shareUsd: string | null;
  records: number;
}


export interface DashboardMonth extends DashboardTotals {
  monthKey: string;
  label: string;
  projectedExpenseArs: string;
  projectedExpenseUsd: string;
}


export interface DashboardOverview {
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  summary: {
    actual: DashboardTotals;
    pending: DashboardTotals;
    projected: DashboardTotals;
    expected: DashboardTotals;
  };
  comparison: {
    incomeArs: string | null;
    expenseArs: string | null;
    balanceArs: string | null;
    incomeUsd: string | null;
    expenseUsd: string | null;
    balanceUsd: string | null;
    previousActual: DashboardTotals;
  };
  categories: DashboardCategory[];
  monthlyEvolution: DashboardMonth[];
  recentMovements: DashboardMovement[];
  commitments: {
    totals: DashboardTotals;
    items: DashboardMovement[];
  };
  alerts: DashboardAlert[];
  dataQuality: {
    unclassifiedRecords: number;
    actualRecords: number;
    pendingRecords: number;
    projectedRecords: number;
    lastUpdatedAt: string | null;
  };
}


export class DashboardApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "DashboardApiError";
  }
}


async function parseError(response: Response): Promise<DashboardApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as { message?: string; error?: string; code?: string };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new DashboardApiError(message, response.status, code);
}


export async function getDashboardOverview(from: string, to: string): Promise<DashboardOverview> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${API_BASE_URL}/api/dashboard?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<DashboardOverview>;
}