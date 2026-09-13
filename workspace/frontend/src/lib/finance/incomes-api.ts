const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type IncomeSourceKind = "salary" | "benefit" | "freelance" | "other";
export type IncomeCurrency = "ARS" | "USD";
export type IncomeEventKind =
  | "monthly_override"
  | "permanent_adjustment"
  | "bonus"
  | "aguinaldo"
  | "extra"
  | "other";
export type IncomeEventStatus = "actual" | "projected";

export interface IncomeSourceEvent {
  id: string;
  sourceId: string | null;
  monthKey: string;
  kind: IncomeEventKind;
  currency: IncomeCurrency;
  amount: string;
  label: string;
  status: IncomeEventStatus;
  notes: string | null;
}

export interface IncomeSourceRecord {
  id: string;
  name: string;
  employer: string | null;
  kind: IncomeSourceKind;
  currency: IncomeCurrency;
  baseAmount: string;
  startMonthKey: string;
  paymentDay: number | null;
  increaseEveryMonths: number;
  increasePercent: string;
  active: boolean;
  events: IncomeSourceEvent[];
}

export interface IncomeRecurringMonthItem {
  sourceId: string;
  name: string;
  employer: string | null;
  kind: IncomeSourceKind;
  currency: IncomeCurrency;
  amount: string;
  status: IncomeEventStatus;
  origin: "base" | "automatic_increase" | "permanent_adjustment" | "monthly_override";
  eventId: string | null;
}

export interface IncomeOneOffMonthItem {
  id: string;
  kind: Exclude<IncomeEventKind, "monthly_override" | "permanent_adjustment">;
  label: string;
  currency: IncomeCurrency;
  amount: string;
  status: IncomeEventStatus;
  notes: string | null;
}

export interface IncomeMonthProjection {
  monthKey: string;
  label: string;
  totalArs: string;
  totalUsd: string;
  recurringArs: string;
  recurringUsd: string;
  oneOffArs: string;
  oneOffUsd: string;
  recurring: IncomeRecurringMonthItem[];
  oneOffs: IncomeOneOffMonthItem[];
}

export interface IncomeOverview {
  range: { from: string; to: string };
  currentMonthKey: string;
  summary: {
    totalArs: string;
    totalUsd: string;
    recurringArs: string;
    recurringUsd: string;
    oneOffArs: string;
    oneOffUsd: string;
    recurringSources: number;
    oneOffCount: number;
  };
  sources: IncomeSourceRecord[];
  months: IncomeMonthProjection[];
}

export interface IncomeSourcePayload {
  name: string;
  employer?: string | null;
  kind: IncomeSourceKind;
  currency: IncomeCurrency;
  baseAmount: string;
  startMonthKey: string;
  paymentDay?: number | null;
  increaseEveryMonths: number;
  increasePercent: string;
  active: boolean;
}

export interface IncomeEventPayload {
  sourceId?: string | null;
  monthKey: string;
  kind: IncomeEventKind;
  currency?: IncomeCurrency;
  amount: string;
  label: string;
  status: IncomeEventStatus;
  notes?: string | null;
}

export class IncomesApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "IncomesApiError";
  }
}

async function parseError(response: Response): Promise<IncomesApiError> {
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

  return new IncomesApiError(message, response.status, code);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

export async function getIncomeOverview(
  from: string,
  to: string,
): Promise<IncomeOverview> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(
    `${API_BASE_URL}/api/incomes/overview?${params.toString()}`,
    { cache: "no-store" },
  );
  return handleResponse(response);
}

export async function createIncomeSource(
  payload: IncomeSourcePayload,
): Promise<IncomeSourceRecord> {
  const response = await fetch(`${API_BASE_URL}/api/incomes/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateIncomeSource(
  sourceId: string,
  payload: Partial<IncomeSourcePayload>,
): Promise<IncomeSourceRecord> {
  const response = await fetch(
    `${API_BASE_URL}/api/incomes/sources/${encodeURIComponent(sourceId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(response);
}

export async function deleteIncomeSource(
  sourceId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/incomes/sources/${encodeURIComponent(sourceId)}`,
    { method: "DELETE" },
  );
  return handleResponse(response);
}

export async function createIncomeEvent(
  payload: IncomeEventPayload,
): Promise<IncomeSourceEvent> {
  const response = await fetch(`${API_BASE_URL}/api/incomes/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteIncomeEvent(
  eventId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/incomes/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  return handleResponse(response);
}
