const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type GlobalSearchSection =
  | "movimientos"
  | "tarjetas"
  | "ingresos"
  | "presupuestos"
  | "objetivos";

export type GlobalSearchResultType =
  | "movement"
  | "card_statement"
  | "income_source"
  | "budget"
  | "goal";

export interface GlobalSearchDestination {
  section: GlobalSearchSection;
  recordId: string;
  recordType: GlobalSearchResultType;
}

export interface GlobalSearchResult {
  id: string;
  recordId: string;
  module: string;
  type: GlobalSearchResultType;
  typeLabel: string;
  title: string;
  context: string;
  matchedField: string;
  destination: GlobalSearchDestination;
  score: number;
  updatedAt: string;
}

export interface GlobalSearchSourceCounts {
  manualMovements: number;
  debitMovements: number;
  cardStatements: number;
  incomeSources: number;
  budgets: number;
  goals: number;
}

export interface GlobalSearchResponse {
  query: string;
  normalizedQuery: string;
  ranking: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  exhaustive: boolean;
  sourceWindow: number;
  sourceCounts: GlobalSearchSourceCounts;
  items: GlobalSearchResult[];
}

export class GlobalSearchApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "GlobalSearchApiError";
  }
}

async function parseError(response: Response): Promise<GlobalSearchApiError> {
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

  return new GlobalSearchApiError(message, response.status, code);
}

export async function searchGlobal(
  query: string,
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<GlobalSearchResponse>;
}
