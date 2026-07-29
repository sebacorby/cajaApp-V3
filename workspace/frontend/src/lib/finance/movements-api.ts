const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type MovementType = "income" | "expense";
export type MovementCurrency = "ARS" | "USD";
export type MovementStatus = "actual" | "pending" | "projected" | "voided";
export type ManualMovementSourceType =
  | "manual_cash"
  | "manual_income"
  | "manual_unexpected"
  | "manual_transfer"
  | "manual_adjustment";
export type CategoryAssignableSourceType = ManualMovementSourceType | "debit_csv";

export interface MovementCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  isSystem: boolean;
  active: boolean;
  keywords: string[];
  manualMovementCount: number;
  debitCsvRowCount: number;
  usageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MovementCategoryPayload {
  name: string;
  color: string;
  icon: string;
  keywords: string[];
}

export interface MovementRecord {
  id: string;
  occurredOn: string;
  effectiveMonthKey: string;
  type: MovementType;
  sourceType: string;
  sourceId: string;
  description: string;
  category: { id: string | null; name: string };
  currency: MovementCurrency;
  amount: string;
  status: MovementStatus;
  notes: string | null;
  editable: boolean;
  categoryEditable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  trace: {
    sourceLabel: string;
    statementId?: string;
    incomeSourceId?: string;
    debitImportId?: string;
  };
}

export interface MovementOverview {
  range: { from: string; to: string };
  filters: {
    type: MovementType | null;
    source: string | null;
    category: string | null;
    status: MovementStatus | null;
    currency: MovementCurrency | null;
    q: string | null;
    includeProjected: boolean;
  };
  summary: {
    incomeArs: string;
    expenseArs: string;
    balanceArs: string;
    incomeUsd: string;
    expenseUsd: string;
    balanceUsd: string;
    records: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  items: MovementRecord[];
}

export interface MovementQuery {
  from: string;
  to: string;
  page?: number;
  pageSize?: number;
  type?: MovementType;
  source?: string;
  category?: string;
  status?: MovementStatus;
  currency?: MovementCurrency;
  q?: string;
  minAmount?: string;
  maxAmount?: string;
  includeProjected?: boolean;
}

export interface ManualMovementPayload {
  occurredOn: string;
  type: MovementType;
  sourceType: ManualMovementSourceType;
  description: string;
  categoryId?: string | null;
  currency: MovementCurrency;
  amount: string;
  status: "actual" | "pending";
  notes?: string | null;
}

export class MovementsApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "MovementsApiError";
  }
}

async function parseError(response: Response): Promise<MovementsApiError> {
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
  return new MovementsApiError(message, response.status, code);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

function buildMovementQueryParams(query: MovementQuery): URLSearchParams {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
    includeProjected: String(query.includeProjected ?? false),
  });
  if (query.type) params.set("type", query.type);
  if (query.source) params.set("source", query.source);
  if (query.category) params.set("category", query.category);
  if (query.status) params.set("status", query.status);
  if (query.currency) params.set("currency", query.currency);
  if (query.q) params.set("q", query.q);
  if (query.minAmount) params.set("minAmount", query.minAmount);
  if (query.maxAmount) params.set("maxAmount", query.maxAmount);
  return params;
}

export async function getMovements(query: MovementQuery): Promise<MovementOverview> {
  const params = buildMovementQueryParams(query);
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/movements?${params.toString()}`, {
      cache: "no-store",
    }),
  );
}

export async function downloadMovementsCsv(query: MovementQuery): Promise<void> {
  const params = buildMovementQueryParams({ ...query, page: 1, pageSize: 100 });
  const response = await fetch(`${API_BASE_URL}/api/movements/export.csv?${params.toString()}`);
  if (!response.ok) throw await parseError(response);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = disposition.match(/filename="([^"]+)"/)?.[1]
    ?? `cajaapp-movimientos-${query.from}-${query.to}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function listMovementCategories(
  includeInactive = false,
): Promise<MovementCategory[]> {
  const params = new URLSearchParams({
    includeInactive: String(includeInactive),
  });
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/movements/categories?${params.toString()}`, {
      cache: "no-store",
    }),
  );
}

export async function createMovementCategory(
  payload: MovementCategoryPayload,
): Promise<MovementCategory> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/movements/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateMovementCategory(
  categoryId: string,
  payload: Partial<MovementCategoryPayload>,
): Promise<MovementCategory> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/movements/categories/${encodeURIComponent(categoryId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  );
}

export async function archiveMovementCategory(
  categoryId: string,
  replacementCategoryId?: string | null,
): Promise<{
  success: boolean;
  replacementCategory: { id: string; name: string };
  reassignedManualMovements: number;
  reassignedDebitRows: number;
}> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/movements/categories/${encodeURIComponent(categoryId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replacementCategoryId: replacementCategoryId ?? null }),
      },
    ),
  );
}

export async function restoreMovementCategory(
  categoryId: string,
): Promise<MovementCategory> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/movements/categories/${encodeURIComponent(categoryId)}/restore`,
      { method: "POST" },
    ),
  );
}

export async function assignMovementCategory(payload: {
  sourceType: CategoryAssignableSourceType;
  sourceId: string;
  categoryId: string | null;
}): Promise<{
  success: boolean;
  category: { id: string | null; name: string; color: string; icon: string };
}> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/movements/categories/assignment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function createManualMovement(
  payload: ManualMovementPayload,
): Promise<MovementRecord> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/movements/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateManualMovement(
  movementId: string,
  payload: Partial<ManualMovementPayload>,
): Promise<MovementRecord> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/movements/manual/${encodeURIComponent(movementId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  );
}

export async function deleteManualMovement(
  movementId: string,
): Promise<{ success: boolean }> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/movements/manual/${encodeURIComponent(movementId)}`,
      { method: "DELETE" },
    ),
  );
}
