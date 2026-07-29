const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export type BudgetCurrency = "ARS" | "USD";
export type BudgetStatus = "active" | "paused" | "closed";


export interface BudgetRecord {
  id: string;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
    active: boolean;
  };
  currency: BudgetCurrency;
  periodStart: string;
  periodEnd: string;
  limitAmount: string;
  rolloverEnabled: boolean;
  rolloverAmount: string;
  effectiveLimit: string;
  spentAmount: string;
  availableAmount: string;
  usageBasisPoints: number;
  usagePercent: string;
  status: BudgetStatus;
  notes: string | null;
  alert: null | {
    rule: string;
    severity: "warning" | "critical";
    message: string;
    thresholdPercent: number;
    evidence: {
      spentAmount: string;
      effectiveLimit: string;
      usagePercent: string;
      currency: BudgetCurrency;
    };
  };
  createdAt: string;
  updatedAt: string;
}


export interface BudgetPayload {
  categoryId: string;
  currency: BudgetCurrency;
  periodStart: string;
  periodEnd: string;
  limitAmount: string;
  rolloverEnabled: boolean;
  status?: "active" | "paused";
  notes?: string | null;
}


export interface BudgetOverviewCurrency {
  budgetCount: number;
  effectiveLimit: string;
  spent: string;
  available: string;
  exceeded: string;
  usageBasisPoints: number;
  usagePercent: string;
}


export interface BudgetOverview {
  filter: {
    from: string | null;
    to: string | null;
    status: BudgetStatus | null;
  };
  participantCount: number;
  activeCount: number;
  attentionCount: number;
  exceededCount: number;
  currencies: Record<BudgetCurrency, BudgetOverviewCurrency>;
}


export interface BudgetOverviewQuery {
  from?: string;
  to?: string;
  status?: BudgetStatus;
}


class BudgetsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "BudgetsApiError";
  }
}


async function parseError(response: Response) {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = await response.json() as {
      message?: string;
      error?: string;
      code?: string;
    };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new BudgetsApiError(message, response.status, code);
}


async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}


function budgetQueryString(query: BudgetOverviewQuery = {}): string {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.status) params.set("status", query.status);
  const value = params.toString();
  return value ? `?${value}` : "";
}


export async function listBudgets(
  query: BudgetOverviewQuery = {},
): Promise<BudgetRecord[]> {
  return handle(await fetch(
    `${API_BASE_URL}/api/budgets${budgetQueryString(query)}`,
    { cache: "no-store" },
  ));
}


export async function getBudgetOverview(
  query: BudgetOverviewQuery = {},
): Promise<BudgetOverview> {
  return handle(await fetch(
    `${API_BASE_URL}/api/budgets/overview${budgetQueryString(query)}`,
    { cache: "no-store" },
  ));
}


export async function createBudget(
  payload: BudgetPayload,
): Promise<BudgetRecord> {
  return handle(await fetch(`${API_BASE_URL}/api/budgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}


export async function updateBudget(
  id: string,
  payload: Partial<BudgetPayload>,
): Promise<BudgetRecord> {
  return handle(await fetch(
    `${API_BASE_URL}/api/budgets/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  ));
}


export async function changeBudgetStatus(
  id: string,
  status: BudgetStatus,
): Promise<BudgetRecord> {
  return handle(await fetch(
    `${API_BASE_URL}/api/budgets/${encodeURIComponent(id)}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  ));
}


export async function deleteBudget(
  id: string,
): Promise<{ success: boolean }> {
  return handle(await fetch(
    `${API_BASE_URL}/api/budgets/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  ));
}