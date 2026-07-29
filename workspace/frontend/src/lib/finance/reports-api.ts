const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export interface ReportTotals {
  incomeArs: string;
  expenseArs: string;
  resultArs: string;
  incomeUsd: string;
  expenseUsd: string;
  resultUsd: string;
  savingsRateArs: string | null;
  savingsRateUsd: string | null;
  records: number;
}

export interface ReportMonthlyRow {
  monthKey: string;
  label: string;
  range: { from: string; to: string };
  actual: ReportTotals;
  pending: ReportTotals;
  projected: ReportTotals;
  expected: ReportTotals;
  chart: {
    incomeArsPercent: string;
    expenseArsPercent: string;
    incomeUsdPercent: string;
    expenseUsdPercent: string;
  };
}

export interface ReportsOverview {
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  monthCount: number;
  summary: {
    actual: ReportTotals;
    pending: ReportTotals;
    projected: ReportTotals;
    expected: ReportTotals;
    monthlyAverageActual: ReportTotals;
  };
  comparison: {
    current: ReportTotals;
    previous: ReportTotals;
    incomeArs: string | null;
    expenseArs: string | null;
    resultArs: string | null;
    incomeUsd: string | null;
    expenseUsd: string | null;
    resultUsd: string | null;
  };
  monthly: ReportMonthlyRow[];
  categories: Array<{
    id: string | null;
    name: string;
    amountArs: string;
    amountUsd: string;
    shareArs: string | null;
    shareUsd: string | null;
    records: number;
  }>;
  sources: Array<{
    sourceType: string;
    label: string;
    amountArs: string;
    amountUsd: string;
    shareArs: string | null;
    shareUsd: string | null;
    records: number;
  }>;
  cardDebt: Array<{
    monthKey: string;
    label: string;
    range: { from: string; to: string };
    actual: ReportTotals;
    pending: ReportTotals;
    projected: ReportTotals;
  }>;
  recurringIncome: Array<{
    sourceId: string;
    label: string;
    months: Array<{
      monthKey: string;
      label: string;
      actualArs: string;
      actualUsd: string;
      projectedArs: string;
      projectedUsd: string;
    }>;
  }>;
  dataQuality: {
    totalRecords: number;
    actualRecords: number;
    pendingRecords: number;
    projectedRecords: number;
    unclassifiedRecords: number;
    currencies: { arsRecords: number; usdRecords: number };
  };
}

export class ReportsApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "ReportsApiError";
  }
}

async function parseError(response: Response): Promise<ReportsApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const payload = await response.json();
    message = payload.message || payload.error || message;
    code = payload.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new ReportsApiError(message, response.status, code);
}

export async function getReportsOverview(from: string, to: string): Promise<ReportsOverview> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${API_BASE_URL}/api/reports?${params}`, { cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<ReportsOverview>;
}

export async function downloadReportsCsv(from: string, to: string): Promise<void> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${API_BASE_URL}/api/reports/export.csv?${params}`);
  if (!response.ok) throw await parseError(response);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? `cajaapp-reportes-${from}-${to}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
