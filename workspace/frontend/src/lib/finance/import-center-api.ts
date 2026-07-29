const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type ImportCenterKind =
  | "card_statement"
  | "salary_receipt"
  | "debit_csv";

export type ImportCenterStatus =
  | "processing"
  | "needs_review"
  | "accepted"
  | "failed"
  | "superseded"
  | "reversed"
  | "archived";

export interface ImportCenterItem {
  id: string;
  kind: ImportCenterKind;
  entityId: string;
  documentId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  sha256: string;
  pageCount: number | null;
  status: ImportCenterStatus;
  title: string;
  subtitle: string;
  periodKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  requiresAction: boolean;
  correctionCount: number;
  version: number | null;
  active: boolean;
  error: {
    message: string;
    stage: string | null;
    details: string[];
  } | null;
  issues: string[];
  ai: {
    status: string;
    provider: string;
    model: string;
    completedAt: string | null;
    warnings: string[];
  } | null;
  navigation: {
    section: "tarjetas" | "ingresos" | "movimientos";
    label: string;
  };
  metadata: Record<string, string | number | boolean | null>;
}

export interface ImportCenterResponse {
  items: ImportCenterItem[];
  summary: {
    total: number;
    processing: number;
    needsReview: number;
    accepted: number;
    failed: number;
    corrected: number;
    reversed: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ImportCenterFilters {
  kind?: "all" | ImportCenterKind;
  status?: "all" | ImportCenterStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ImportCenterApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ImportCenterApiError";
  }
}

async function parseError(response: Response): Promise<ImportCenterApiError> {
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
  return new ImportCenterApiError(message, response.status, code);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

export async function listImportCenter(
  filters: ImportCenterFilters = {},
): Promise<ImportCenterResponse> {
  const params = new URLSearchParams();
  if (filters.kind && filters.kind !== "all") {
    params.set("kind", filters.kind);
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  params.set("limit", String(filters.limit ?? 25));
  params.set("offset", String(filters.offset ?? 0));

  const response = await fetch(
    `${API_BASE_URL}/api/import-center?${params.toString()}`,
    { cache: "no-store" },
  );
  return handleResponse(response);
}

export async function getImportCenterDetail(
  item: Pick<ImportCenterItem, "kind" | "entityId">,
): Promise<ImportCenterItem> {
  const response = await fetch(
    `${API_BASE_URL}/api/import-center/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.entityId)}`,
    { cache: "no-store" },
  );
  return handleResponse(response);
}
