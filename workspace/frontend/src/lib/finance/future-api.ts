const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export type FutureCurrency = "ARS" | "USD";
export type FutureCertainty = "confirmed" | "projected";
export type FutureKind = "income" | "card_debt" | "other_commitment";
export type FutureOriginSection = "tarjetas" | "ingresos" | "movimientos";


export interface FutureMoney {
  ars: string;
  usd: string;
}


export interface FutureComponent {
  id: string;
  monthKey: string;
  occurredOn: string;
  kind: FutureKind;
  certainty: FutureCertainty;
  movementStatus: "actual" | "pending" | "projected";
  sourceType: string;
  sourceId: string;
  description: string;
  sourceLabel: string;
  category: { id: string | null; name: string };
  currency: FutureCurrency;
  amount: string;
  notes: string | null;
  originSection: FutureOriginSection;
  originReference: string;
  dueDateEstimated: boolean;
}


export interface FutureSourceGroup {
  key: string;
  label: string;
  kind: FutureKind;
  originSection: FutureOriginSection;
  originReference: string;
  confirmed: FutureMoney;
  projected: FutureMoney;
  items: FutureComponent[];
}


export interface FutureMonth {
  monthKey: string;
  label: string;
  totals: {
    confirmedIncome: FutureMoney;
    projectedIncome: FutureMoney;
    confirmedCardDebt: FutureMoney;
    projectedCardDebt: FutureMoney;
    confirmedOtherCommitments: FutureMoney;
    projectedOtherCommitments: FutureMoney;
    confirmedCommitments: FutureMoney;
    projectedCommitments: FutureMoney;
    confirmedResult: FutureMoney;
    expectedIncome: FutureMoney;
    expectedCommitments: FutureMoney;
    expectedResult: FutureMoney;
  };
  groups: FutureSourceGroup[];
  componentCount: number;
  dataQuality: {
    status: "complete" | "partial";
    estimatedDueDateItems: number;
    unclassifiedItems: number;
    warnings: string[];
  };
}


export interface FutureOverview {
  range: { from: string; to: string; months: number };
  summary: {
    confirmedIncome: FutureMoney;
    projectedIncome: FutureMoney;
    confirmedCardDebt: FutureMoney;
    projectedCardDebt: FutureMoney;
    confirmedOtherCommitments: FutureMoney;
    projectedOtherCommitments: FutureMoney;
    confirmedCommitments: FutureMoney;
    projectedCommitments: FutureMoney;
    expectedIncome: FutureMoney;
    expectedCommitments: FutureMoney;
    expectedResult: FutureMoney;
  };
  months: FutureMonth[];
  dataQuality: {
    status: "complete" | "partial";
    warnings: string[];
    note: string;
  };
}


export class FutureApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "FutureApiError";
  }
}


async function parseError(response: Response): Promise<FutureApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
      code?: string;
    };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new FutureApiError(message, response.status, code);
}


export async function getFutureOverview(
  from: string,
  months: number,
): Promise<FutureOverview> {
  const params = new URLSearchParams({ from, months: String(months) });
  const response = await fetch(
    `${API_BASE_URL}/api/future-commitments?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<FutureOverview>;
}