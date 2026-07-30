const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type ReconciliationRelationType =
  | "duplicate_movement"
  | "salary_deposit"
  | "card_payment";
export type ReconciliationStatus = "open" | "resolved" | "dismissed";
export type ReconciliationResolution =
  | "exclude_left"
  | "exclude_right"
  | "keep_both"
  | "link_only"
  | "dismiss";

export interface ReconciliationNavigation {
  section: "movimientos" | "tarjetas" | "ingresos";
  label: string;
  recordId: string;
  recordType: "movement" | "card_statement" | "income_source";
  module: string;
  typeLabel: string;
  title: string;
  context: string;
}

export interface ReconciliationParticipant {
  id: string;
  role: "left" | "right";
  entityKey: string;
  entityType: "movement" | "salary_receipt" | "card_statement";
  sourceType: string;
  sourceId: string;
  movementId: string | null;
  description: string;
  occurredOn: string | null;
  currency: "ARS" | "USD" | null;
  amount: string | null;
  excluded: boolean;
  metadata: Record<string, string | number | boolean | null>;
  navigation: ReconciliationNavigation;
}

export interface ReconciliationItem {
  id: string;
  fingerprint: string;
  relationType: ReconciliationRelationType;
  status: ReconciliationStatus;
  resolution: ReconciliationResolution | null;
  confidence: number;
  title: string;
  rationale: string[];
  suggestedResolution: "exclude_left" | "exclude_right" | "review";
  currency: "ARS" | "USD" | null;
  amount: string | null;
  occurredOn: string | null;
  excludedMovementId: string | null;
  isCurrent: boolean;
  lastDetectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ReconciliationParticipant[];
}

export interface ReconciliationSummary {
  total: number;
  open: number;
  resolved: number;
  dismissed: number;
  duplicates: number;
  relations: number;
  excluded: number;
  current: number;
}

export interface ReconciliationResponse {
  items: ReconciliationItem[];
  summary: ReconciliationSummary;
  filteredSummary: ReconciliationSummary;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ReconciliationScanResponse {
  range: { from: string; to: string };
  detected: number;
  summary: ReconciliationSummary;
  items: ReconciliationItem[];
  refreshedAt?: string;
}

export class ReconciliationApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ReconciliationApiError";
  }
}

async function parseError(response: Response): Promise<ReconciliationApiError> {
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
  return new ReconciliationApiError(message, response.status, code);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

export async function listReconciliation(input: {
  status?: "all" | ReconciliationStatus;
  relationType?: "all" | ReconciliationRelationType;
  scope?: "all" | "current" | "historical";
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ReconciliationResponse> {
  const params = new URLSearchParams();
  params.set("status", input.status ?? "all");
  params.set("relationType", input.relationType ?? "all");
  params.set("scope", input.scope ?? "current");
  if (input.search?.trim()) params.set("search", input.search.trim());
  params.set("limit", String(input.limit ?? 100));
  params.set("offset", String(input.offset ?? 0));
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/reconciliation?${params}`, {
      cache: "no-store",
    }),
  );
}

export async function scanReconciliation(input: {
  from: string;
  to: string;
}): Promise<ReconciliationScanResponse> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/reconciliation/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function getReconciliationDetail(
  caseId: string,
): Promise<ReconciliationItem> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/reconciliation/${encodeURIComponent(caseId)}`,
      { cache: "no-store" },
    ),
  );
}

export async function resolveReconciliation(
  caseId: string,
  action: ReconciliationResolution,
): Promise<ReconciliationItem> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/reconciliation/${encodeURIComponent(caseId)}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    ),
  );
}

export async function reopenReconciliation(
  caseId: string,
): Promise<ReconciliationItem> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/reconciliation/${encodeURIComponent(caseId)}/reopen`,
      { method: "POST" },
    ),
  );
}
