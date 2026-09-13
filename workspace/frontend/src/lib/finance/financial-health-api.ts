const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export type FinancialHealthCurrency = "ARS" | "USD";
export type FinancialHealthCalculationStatus = "calculated" | "insufficient_data";
export type FinancialHealthFactorStatus = "available" | "unavailable";
export type FinancialHealthImpact = "positive" | "neutral" | "negative";
export type FinancialHealthConfidenceLabel = "high" | "medium" | "low" | "insufficient";
export type FinancialHealthFactorId =
  | "actual_balance"
  | "expected_balance"
  | "commitment_coverage"
  | "expense_trend"
  | "budget_control"
  | "data_quality";


export interface FinancialHealthAction {
  section: "movimientos" | "deuda" | "presupuestos" | "objetivos" | "reportes";
  label: string;
  drilldown?: {
    from: string;
    to: string;
    label: string;
    type?: "income" | "expense";
    category?: string;
    status?: "actual" | "pending" | "projected";
    includeProjected?: boolean;
  };
}


export interface FinancialHealthFactor {
  id: FinancialHealthFactorId;
  title: string;
  description: string;
  status: FinancialHealthFactorStatus;
  impact: FinancialHealthImpact;
  weight: number;
  points: number | null;
  rule: string;
  evidence: string[];
  action: FinancialHealthAction;
}


export interface FinancialHealthCurrencyResult {
  currency: FinancialHealthCurrency;
  status: FinancialHealthCalculationStatus;
  score: number | null;
  band: "favorable" | "stable" | "exposed" | "compromised" | "not_calculated";
  bandLabel: string;
  confidence: {
    label: FinancialHealthConfidenceLabel;
    labelText: string;
    basisPoints: number;
    availableWeight: number;
    recordEvidence: number;
    historyMonths: number;
    classifiedBasisPoints: number;
  };
  availableWeight: number;
  earnedPoints: number;
  factors: FinancialHealthFactor[];
  blockers: string[];
}


export interface FinancialHealthComparison {
  snapshotId: string;
  period: { from: string; to: string };
  savedAt: string;
  currencies: Record<FinancialHealthCurrency, {
    scoreDelta: number | null;
    previousScore: number | null;
    factorChanges: Array<{
      factorId: FinancialHealthFactorId;
      previousPoints: number | null;
      currentPoints: number | null;
      delta: number | null;
    }>;
  }>;
}


export interface FinancialHealthEvaluation {
  formula: {
    version: string;
    title: string;
    description: string;
    scoreRange: { minimum: 0; maximum: 100 };
    weights: Array<{ factorId: FinancialHealthFactorId; weight: number }>;
    minimumRequirements: string[];
  };
  period: { from: string; to: string };
  evaluatedAt: string;
  sourceFingerprint: string;
  currencies: Record<FinancialHealthCurrency, FinancialHealthCurrencyResult>;
  goalsContext: {
    note: string;
    activeGoals: number;
    nearestActiveTargetDate: string | null;
    currencies: Record<FinancialHealthCurrency, {
      targetAmount: string;
      contributedAmount: string;
      remainingAmount: string;
      progressPercent: string;
    }>;
  };
  comparison: FinancialHealthComparison | null;
  disclaimer: string;
}


export interface FinancialHealthHistoryItem {
  id: string;
  period: { from: string; to: string };
  formulaVersion: string;
  sourceFingerprint: string;
  savedAt: string;
  currencies: Record<FinancialHealthCurrency, {
    status: FinancialHealthCalculationStatus;
    score: number | null;
    bandLabel: string;
    confidenceLabel: string;
  }>;
}


export interface FinancialHealthResponse {
  evaluation: FinancialHealthEvaluation;
  history: FinancialHealthHistoryItem[];
  snapshotId: string | null;
  snapshotCreated: boolean;
}


export class FinancialHealthApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "FinancialHealthApiError";
  }
}


async function parseError(response: Response): Promise<FinancialHealthApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as { message?: string; error?: string; code?: string };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new FinancialHealthApiError(message, response.status, code);
}


function queryString(from: string, to: string): string {
  return new URLSearchParams({ from, to }).toString();
}


export async function getFinancialHealth(
  from: string,
  to: string,
): Promise<FinancialHealthResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/financial-health?${queryString(from, to)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<FinancialHealthResponse>;
}


export async function saveFinancialHealthSnapshot(
  from: string,
  to: string,
): Promise<FinancialHealthResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/financial-health/snapshots`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
    },
  );
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<FinancialHealthResponse>;
}


export async function deleteFinancialHealthSnapshot(snapshotId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/financial-health/snapshots/${snapshotId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await parseError(response);
}