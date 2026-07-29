// TYPED API CLIENT for the future-debt endpoint.
// The endpoint is the read-only surface for the "Deuda futura de tarjetas" view.
// Response shape mirrors the backend Zod schema in
// specs/001-deuda-futura-de-tarjetas/code/specs.md (Common technical contract).
// Per determinism (RN-016), the wire payload never carries a timestamp field,
// so the response is decoded verbatim without injecting one.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type FutureDebtCurrency = "ARS" | "USD";

export type FutureDebtOriginType = "card_statement" | "manual_card_purchase";

export type FutureDebtRowStatus = "confirmed" | "estimated";

export type FutureDebtRowType = "future_installment";

export interface FutureDebtRange {
  from: string;
  to: string;
  months: number;
  includeCurrentPeriod: boolean;
  currentPeriodKey: string | null;
}

export interface FutureDebtMoney {
  ars: string;
  usd: string;
}

export interface FutureDebtRow {
  id: string;
  monthKey: string;
  description: string;
  installmentNumber: number;
  installmentTotal: number;
  installmentLabel: string;
  amount: string;
  currency: FutureDebtCurrency;
  originType: FutureDebtOriginType;
  originReference: string;
  sourceLabel: string;
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  status: FutureDebtRowStatus;
  rowType: FutureDebtRowType;
}

export interface FutureDebtCard {
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  rows: FutureDebtRow[];
  totals: FutureDebtMoney;
}

export interface FutureDebtMonth {
  monthKey: string;
  label: string;
  totals: FutureDebtMoney;
  cards: FutureDebtCard[];
  dataQuality: {
    status: "complete" | "partial";
    warnings: string[];
  };
}

export interface FutureDebtHorizon {
  persisted: boolean;
  persistedMonths: string[];
}

export interface FutureDebtPendingRow {
  id: string;
  monthKey: string;
  description: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentLabel: string;
  amount: string;
  currency: FutureDebtCurrency | null;
  originType: FutureDebtOriginType;
  originReference: string;
  sourceLabel: string;
  cardId: string | null;
  cardLast4: string | null;
  holderName: string | null;
  cardLabel: string | null;
  status: FutureDebtRowStatus;
  rowType: FutureDebtRowType;
  diagnostic:
    | "invalid_installment"
    | "missing_currency"
    | "missing_card_reference"
    | "invalid_amount";
  diagnosticDetail: string;
}

export interface FutureDebtPendientes {
  rows: FutureDebtPendingRow[];
  diagnostics: string[];
}

export interface FutureDebtDiagnostics {
  duplicateOccurrences: number;
  invalidInstallmentRows: number;
  missingCurrencyRows: number;
  missingCardRows: number;
  warnings: string[];
}

export interface FutureDebtResponse {
  range: FutureDebtRange;
  summary: FutureDebtMoney;
  horizon: FutureDebtHorizon;
  months: FutureDebtMonth[];
  pendientes: FutureDebtPendientes;
  diagnostics: FutureDebtDiagnostics;
}

export interface FutureDebtQuery {
  from?: string;
  months?: number;
  includeCurrentPeriod?: boolean;
}

export class FutureDebtApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "FutureDebtApiError";
  }
}

const DECIMAL_STRING = /^-?\d+\.\d{2}$/;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentUtcMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizeFrom(value: string | undefined): string {
  if (value === undefined || value === "") return currentUtcMonth();
  if (!MONTH_KEY.test(value)) {
    throw new FutureDebtApiError(
      `Invalid 'from' value: '${value}' must be YYYY-MM.`,
      400,
    );
  }
  return value;
}

function normalizeMonths(value: number | undefined): number {
  if (value === undefined) return 6;
  if (!Number.isInteger(value) || value < 1 || value > 24) {
    throw new FutureDebtApiError(
      `Invalid 'months' value: ${value} must be an integer in [1, 24].`,
      400,
    );
  }
  return value;
}

function buildParams(query: FutureDebtQuery): URLSearchParams {
  const from = normalizeFrom(query.from);
  const months = normalizeMonths(query.months);
  const params = new URLSearchParams({
    from,
    months: String(months),
  });
  if (query.includeCurrentPeriod !== undefined) {
    // The locked contract uses the literal string "true" / "false";
    // never coerce a non-literal boolean.
    params.set(
      "includeCurrentPeriod",
      query.includeCurrentPeriod ? "true" : "false",
    );
  }
  return params;
}

async function parseErrorResponse(
  response: Response,
): Promise<FutureDebtApiError> {
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
  return new FutureDebtApiError(message, response.status, code);
}

function assertMoney(value: FutureDebtMoney, path: string): void {
  if (!value || typeof value !== "object") {
    throw new FutureDebtApiError(`Missing money bucket at ${path}`, 500);
  }
  if (!DECIMAL_STRING.test(value.ars) || !DECIMAL_STRING.test(value.usd)) {
    throw new FutureDebtApiError(
      `Money bucket at ${path} must be decimal strings (e.g. 10000.00).`,
      500,
    );
  }
}

function assertResponse(response: FutureDebtResponse): FutureDebtResponse {
  if (!response || typeof response !== "object") {
    throw new FutureDebtApiError(
      "Empty response from the future-debt endpoint.",
      500,
    );
  }
  if (!response.range || !response.summary) {
    throw new FutureDebtApiError(
      "Response is missing 'range' or 'summary'.",
      500,
    );
  }
  assertMoney(response.summary, "summary");
  if (!Array.isArray(response.months)) {
    throw new FutureDebtApiError("Response 'months' must be an array.", 500);
  }
  if (!response.pendientes || !Array.isArray(response.pendientes.rows)) {
    throw new FutureDebtApiError(
      "Response 'pendientes.rows' must be an array.",
      500,
    );
  }
  if (!response.diagnostics) {
    throw new FutureDebtApiError("Response is missing 'diagnostics'.", 500);
  }
  return response;
}

export function buildFutureDebtQueryString(query: FutureDebtQuery): string {
  return buildParams(query).toString();
}

export async function fetchFutureDebt(
  query: FutureDebtQuery = {},
  signal?: AbortSignal,
): Promise<FutureDebtResponse> {
  const params = buildParams(query);
  const response = await fetch(
    `${API_BASE_URL}/api/future-debt?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return assertResponse((await response.json()) as FutureDebtResponse);
}

export async function deleteFutureDebtRow(id: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/future-debt/rows/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (response.status === 204) return;
  if (!response.ok) throw await parseErrorResponse(response);
  // For any other 2xx (should not happen per contract), return undefined
}
