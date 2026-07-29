const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type CardPaymentStatus = "confirmed" | "projected";

export interface CardPaymentMoney {
  ars: string;
  usd: string;
}

export type CardPaymentAdjustmentKind =
  | "confirmed_statement_total"
  | "issuer_reference_adjustment";

export interface CardPaymentAdjustmentDetail {
  kind: CardPaymentAdjustmentKind;
  monthKey: string;
  sourceLabel: string;
  original: CardPaymentMoney;
  adjusted: CardPaymentMoney;
  adjustment: CardPaymentMoney;
  message: string;
}

export interface CardPaymentCell extends CardPaymentMoney {
  monthKey: string;
  status: CardPaymentStatus;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

export interface CardPaymentMovement {
  id: string;
  sourceType: "statement_row" | "manual_purchase" | "reconciliation";
  description: string;
  dateIso: string | null;
  cells: CardPaymentCell[];
}

export interface CardPaymentCard {
  cardId: string;
  cardLabel: string;
  cardLast4: string | null;
  holderName: string | null;
  movements: CardPaymentMovement[];
  totalsByMonth: Array<{
    monthKey: string;
    totals: CardPaymentMoney;
    adjustmentDetail?: CardPaymentAdjustmentDetail;
  }>;
}

export type IssuerValidationStatus =
  | "matched"
  | "mismatch"
  | "ambiguous_mapping";

export interface IssuerProjectionValidation {
  referenceId: string;
  issuerPeriodLabel: string;
  issuerPeriodKey: string | null;
  targetPaymentMonthKey: string | null;
  periodBasis: string;
  issuerAmount: CardPaymentMoney;
  calculatedInstallments: CardPaymentMoney;
  difference: CardPaymentMoney;
  status: IssuerValidationStatus;
}

export interface CardPaymentsResponse {
  baseline: null | {
    statementId: string;
    periodKey: string;
    bankName: string | null;
    brand: string | null;
    fileName: string;
    currentDueDate: string | null;
    nextClosingDate: string | null;
    nextDueDate: string | null;
    total: CardPaymentMoney;
    acceptedAt: string;
  };
  range: {
    from: string;
    to: string;
    months: number;
  };
  months: Array<{
    monthKey: string;
    label: string;
    status: CardPaymentStatus;
    totals: CardPaymentMoney;
    adjustmentDetail?: CardPaymentAdjustmentDetail;
  }>;
  cards: CardPaymentCard[];
  issuerValidation: {
    available: boolean;
    items: IssuerProjectionValidation[];
  };
  autoReconciliation?: {
    adjusted: boolean;
    adjustments: CardPaymentAdjustmentDetail[];
  };
  warnings: string[];
}

export interface ManualCardPurchaseInput {
  statementId: string;
  cardLast4: string;
  holderName: string;
  purchaseDate: string;
  description: string;
  currency: "ARS" | "USD";
  amount: string;
  installments: number;
  notes?: string;
}

export class CardPaymentsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "CardPaymentsApiError";
  }
}

async function parseError(response: Response): Promise<CardPaymentsApiError> {
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
  return new CardPaymentsApiError(message, response.status, code);
}

export async function fetchCardPayments(
  months = 6,
  signal?: AbortSignal,
): Promise<CardPaymentsResponse> {
  const normalized = Math.min(Math.max(Math.trunc(months), 1), 24);
  const response = await fetch(
    `${API_BASE_URL}/api/card-payments?months=${normalized}`,
    { cache: "no-store", signal },
  );
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<CardPaymentsResponse>;
}

export async function createManualCardPurchase(
  input: ManualCardPurchaseInput,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/card-statements/manual-purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseError(response);
}

export async function deleteManualCardPurchase(purchaseId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/manual-purchases/${encodeURIComponent(purchaseId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw await parseError(response);
}
