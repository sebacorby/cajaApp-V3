const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type CurrencyTotals = { ARS: string; USD: string };
export type StatusTotals = {
  all: CurrencyTotals;
  actual: CurrencyTotals;
  pending: CurrencyTotals;
  projected: CurrencyTotals;
};

export interface MonthCloseSummary {
  monthKey: string;
  movements: number;
  income: StatusTotals;
  expense: StatusTotals;
  balance: StatusTotals;
  sources: Record<string, number>;
  openReconciliations: number;
}

export interface MonthCloseItem {
  id: string;
  monthKey: string;
  version: number;
  status: "closed" | "reopened";
  active: boolean;
  summary: MonthCloseSummary;
  sourceFingerprint: string;
  canReopen: boolean;
  closedAt: string;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  snapshot?: {
    version: "month-close-v1";
    monthKey: string;
    range: { from: string; to: string };
    generatedAt: string;
    summary: MonthCloseSummary;
    movements: unknown[];
    settings: unknown;
    goals: unknown[];
    budgets: unknown[];
    cardStatements: unknown[];
    salaryReceipts: unknown[];
  };
  activities?: Array<{ id: string; kind: string; detail: unknown; createdAt: string }>;
}

export class MonthCloseApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "MonthCloseApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = await response.json() as { message?: string; error?: string; code?: string };
      message = body.message || body.error || message;
      code = body.code;
    } catch {
      message = (await response.text()) || message;
    }
    throw new MonthCloseApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

export async function listMonthCloses(input: {
  monthKey?: string;
  status?: "all" | "closed" | "reopened";
  limit?: number;
  offset?: number;
} = {}) {
  const params = new URLSearchParams({
    status: input.status ?? "all",
    limit: String(input.limit ?? 50),
    offset: String(input.offset ?? 0),
  });
  if (input.monthKey) params.set("monthKey", input.monthKey);
  return handleResponse<{
    items: MonthCloseItem[];
    pagination: { limit: number; offset: number; total: number; hasMore: boolean };
  }>(await fetch(`${API_BASE_URL}/api/month-close?${params}`, { cache: "no-store" }));
}

export async function createMonthClose(monthKey: string): Promise<MonthCloseItem> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/month-close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthKey }),
  }));
}

export async function getMonthCloseDetail(id: string): Promise<MonthCloseItem> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/month-close/${encodeURIComponent(id)}`, {
    cache: "no-store",
  }));
}

export async function reopenMonthClose(id: string): Promise<MonthCloseItem> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/month-close/${encodeURIComponent(id)}/reopen`, {
    method: "POST",
  }));
}
