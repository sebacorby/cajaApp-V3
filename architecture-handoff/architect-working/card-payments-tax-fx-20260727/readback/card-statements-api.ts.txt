const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export interface CardExchangeRate {
  configured: boolean;
  pair: "USD_ARS";
  rate: string | null;
  effectiveDate: string | null;
  source: string | null;
  status: string;
  updatedAt: string | null;
}

export interface CardMoneyEquivalents {
  usdEquivalentPesos: string | null;
  combinedTotalPesos: string | null;
}

export interface CardStatementHistoryMetadata {
  periodKey: string | null;
  historyKey: string | null;
  version: number;
  isActiveForPeriod: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
}

export interface CardStatementTraceability {
  statement: {
    id: string;
    status: string;
    periodKey: string | null;
    version: number;
    isActiveForPeriod: boolean;
    archivedAt: string | null;
    archivedReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    pageCount: number | null;
    createdAt: string;
  };
  draft: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  aiRun: {
    id: string;
    status: string;
    provider: string;
    model: string;
    promptHash: string;
    promptVersion: string | null;
    rawResponseHash: string | null;
    validationErrors: string | null;
    retries: number;
    createdAt: string;
    completedAt: string | null;
  } | null;
  versions: Array<{
    id: string;
    status: string;
    version: number;
    isActiveForPeriod: boolean;
    createdAt: string;
    archivedAt: string | null;
    archivedReason: string | null;
    document: { fileName: string; sha256: string };
  }>;
}


export interface CardStatementSource {
  bankName: string | null;
  brand: string | null;
  statementNumber: string | null;
  pageCount: number;
}

export interface CardStatementSummary {
  totalPesos: string | null;
  totalDollars: string | null;
  minimumPaymentPesos: string | null;
  currentDueDate: string | null;
  nextClosingDate: string | null;
  nextDueDate: string | null;
}

export interface CardStatementSection {
  id: string;
  displayOrder: number;
  label: string;
}

export interface CardStatementGroup {
  id: string;
  displayOrder: number;
  label: string;
  cardLast4: string | null;
  holderName: string | null;
}

export type CardStatementRowType =
  | "section_header"
  | "group_header"
  | "transaction"
  | "group_total"
  | "consolidated_row"
  | "tax"
  | "charge"
  | "statement_total"
  | "future_installment_reference"
  | "legal_text"
  | "unknown";

export type CurrencyOriginal = "ARS" | "USD" | "MIXED" | "UNKNOWN";

export interface CardStatementRow {
  id: string;
  displayOrder: number;
  sourcePage: number | null;
  sectionId: string;
  sectionLabel: string;
  groupId: string | null;
  groupLabel: string | null;
  groupOrder: number | null;
  rowType: CardStatementRowType;
  editable: boolean;
  dateRaw: string | null;
  dateIso: string | null;
  markerRaw: string | null;
  referenceRaw: string | null;
  installmentRaw: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  receiptRaw: string | null;
  amountPesos: string | null;
  amountDollars: string | null;
  currencyOriginal: CurrencyOriginal;
  originalText: string;
  confidence: number | null;
  warnings: string[];
}

export interface CardStatementPreview {
  statementId: string | null;
  source: CardStatementSource;
  summary: CardStatementSummary;
  sections: CardStatementSection[];
  groups: CardStatementGroup[];
  rows: CardStatementRow[];
  futureInstallmentsBlock: CardStatementRow[];
}

export interface ImportResult {
  draftId: string;
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    sha256: string;
    pageCount: number;
  };
  status: string;
  warnings: string[];
  preview: CardStatementPreview;
  exchangeRate: CardExchangeRate;
  equivalents: CardMoneyEquivalents;
}

export interface UpdatedValuesResponse {
  monthKey: string;
  label: string;
  totalPesos: string;
  totalDollars: string;
  usdEquivalentPesos: string | null;
  combinedTotalPesos: string | null;
}

export interface AcceptResult {
  statementId: string;
  status: string;
  updatedValues: UpdatedValuesResponse[];
  exchangeRate?: CardExchangeRate;
  warnings: string[];
}

export interface ManualPurchasePayload {
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

export interface ManualPurchaseRecord {
  id: string;
  cardLast4: string;
  holderName: string;
  purchaseDate: string;
  description: string;
  currency: "ARS" | "USD" | string;
  amount: string;
  installments: number;
  notes: string | null;
  createdAt: string;
}

export interface AcceptedCardStatement {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  history: CardStatementHistoryMetadata;
  document: {
    fileName: string;
    pageCount: number;
  };
  source: CardStatementSource;
  summary: CardStatementSummary;
  sections: CardStatementSection[];
  groups: CardStatementGroup[];
  rows: CardStatementRow[];
  projections: UpdatedValuesResponse[];
  manualPurchases: ManualPurchaseRecord[];
  exchangeRate: CardExchangeRate;
  equivalents: CardMoneyEquivalents;
}

export interface CardStatementListItem {
  id: string;
  status: string;
  periodKey: string | null;
  historyKey: string | null;
  version: number;
  isActiveForPeriod: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
  bankName: string | null;
  brand: string | null;
  statementNumber: string | null;
  totalPesos: string | null;
  totalDollars: string | null;
  minimumPaymentPesos: string | null;
  currentDueDate: string | null;
  nextClosingDate: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
  cards: Array<{ cardLast4: string | null; holderName: string | null }>;
  document: {
    id: string;
    fileName: string;
    pageCount: number | null;
    sha256: string;
  };
}

export interface ImportStartResult {
  draftId: string;
  pageCount: number;
}

export interface ImportStatusResponse {
  draftId: string;
  status: "processing" | "preview_ready" | "failed";
  progress?: {
    stage?: string;
    message?: string;
    elapsedSeconds?: number;
  };
  preview?: CardStatementPreview;
  error?: {
    stage?: string;
    message?: string;
  };
}

interface RawAcceptResult {
  statementId: string;
  status: string;
  exchangeRate?: CardExchangeRate;
  updatedValues?:
    | UpdatedValuesResponse[]
    | {
        months?: UpdatedValuesResponse[];
        rows?: unknown[];
      };
  warnings?: string[];
}

interface RawUpdatedValuesResponse {
  exchangeRate?: CardExchangeRate;
  months?: UpdatedValuesResponse[];
}

interface RawStatementListItem {
  id: string;
  status: string;
  periodKey: string | null;
  historyKey: string | null;
  version: number;
  isActiveForPeriod: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
  bankName: string | null;
  brand: string | null;
  statementNumber: string | null;
  totalPesosRaw: string | null;
  totalDollarsRaw: string | null;
  minimumPaymentPesosRaw: string | null;
  currentDueDate: string | null;
  nextClosingDate: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
  groups: Array<{ cardLast4: string | null; holderName: string | null }>;
  document: {
    id: string;
    fileName: string;
    pageCount: number | null;
    sha256: string;
  };
}

export class CardStatementsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "CardStatementsApiError";
  }
}

async function parseErrorResponse(response: Response): Promise<CardStatementsApiError> {
  let errorMessage = `HTTP ${response.status}`;
  let errorCode: string | undefined;

  try {
    const errorBody = await response.json();
    errorMessage = errorBody.message || errorBody.error || errorMessage;
    errorCode = errorBody.code;
  } catch {
    errorMessage = (await response.text()) || errorMessage;
  }

  return new CardStatementsApiError(errorMessage, response.status, errorCode);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json() as Promise<T>;
}

function normalizeMonths(
  value:
    | UpdatedValuesResponse[]
    | { months?: UpdatedValuesResponse[] }
    | null
    | undefined,
): UpdatedValuesResponse[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.months) ? value.months : [];
}

function abortableDelay(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Polling aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function waitForCardStatementPreview(
  draftId: string,
  signal: AbortSignal,
  onProgress?: (status: ImportStatusResponse) => void,
): Promise<CardStatementPreview> {
  const deadline = Date.now() + 9 * 60 * 1000;

  while (!signal.aborted) {
    if (Date.now() >= deadline) {
      throw new CardStatementsApiError(
        "La importación superó el tiempo máximo de espera.",
        408,
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/card-statements/import/${encodeURIComponent(draftId)}/status`,
      { signal },
    );

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const result = (await response.json()) as ImportStatusResponse;
    onProgress?.(result);

    if (result.status === "preview_ready") {
      if (!result.preview) {
        throw new CardStatementsApiError(
          "El backend informó que el resumen está listo, pero no devolvió la vista previa.",
          500,
        );
      }
      return result.preview;
    }

    if (result.status === "failed") {
      const errorMessage =
        typeof result.error?.message === "string"
          ? result.error.message.trim()
          : null;
      throw new CardStatementsApiError(
        errorMessage || "No se pudo procesar el resumen.",
        500,
      );
    }

    await abortableDelay(2_000, signal);
  }

  throw new DOMException("Polling aborted", "AbortError");
}

export async function importCardStatementPdf(
  file: File,
  signal?: AbortSignal,
  onProgress?: (status: ImportStatusResponse) => void,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const startResponse = await fetch(`${API_BASE_URL}/api/card-statements/import`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!startResponse.ok) {
    throw await parseErrorResponse(startResponse);
  }

  const { draftId } = (await startResponse.json()) as ImportStartResult;

  await waitForCardStatementPreview(
    draftId,
    signal ?? new AbortController().signal,
    onProgress,
  );

  const fullResponse = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
    { signal },
  );

  return handleResponse<ImportResult>(fullResponse);
}

export async function getCardStatementDraft(draftId: string): Promise<{
  draftId: string;
  status: string;
  preview: CardStatementPreview;
  warnings: string[];
  exchangeRate: CardExchangeRate;
  equivalents: CardMoneyEquivalents;
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
  );
  return handleResponse(response);
}

export async function updateCardStatementDraft(
  draftId: string,
  preview: CardStatementPreview,
): Promise<{ success: boolean; warnings?: string[] }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preview }),
    },
  );

  return handleResponse(response);
}

export async function acceptCardStatementDraft(
  draftId: string,
  preview: CardStatementPreview,
): Promise<AcceptResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}/accept`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preview }),
    },
  );

  const raw = await handleResponse<RawAcceptResult>(response);

  return {
    statementId: raw.statementId,
    status: raw.status,
    updatedValues: normalizeMonths(raw.updatedValues),
    exchangeRate: raw.exchangeRate,
    warnings: raw.warnings ?? [],
  };
}

export async function getUpdatedValues(
  from: string,
  to: string,
): Promise<UpdatedValuesResponse[]> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/updated-values?${params.toString()}`,
  );

  const raw = await handleResponse<
    UpdatedValuesResponse[] | RawUpdatedValuesResponse
  >(response);

  return normalizeMonths(raw);
}


export async function getCardExchangeRate(): Promise<CardExchangeRate> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/exchange-rate`,
    { cache: "no-store" },
  );
  return handleResponse<CardExchangeRate>(response);
}

export async function updateCardExchangeRate(payload: {
  rate: string;
  effectiveDate: string;
}): Promise<CardExchangeRate> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/exchange-rate`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<CardExchangeRate>(response);
}

export async function getLatestCardStatement(): Promise<AcceptedCardStatement | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/latest`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    return null;
  }

  return handleResponse<AcceptedCardStatement>(response);
}

export async function getCardStatement(
  statementId: string,
): Promise<AcceptedCardStatement> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/${encodeURIComponent(statementId)}`,
    { cache: "no-store" },
  );
  return handleResponse<AcceptedCardStatement>(response);
}

export async function listCardStatements(input: {
  limit?: number;
  search?: string;
  status?: string;
  includeArchived?: boolean;
} = {}): Promise<CardStatementListItem[]> {
  const params = new URLSearchParams({
    limit: String(input.limit ?? 50),
    includeArchived: String(input.includeArchived ?? true),
  });
  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.status?.trim()) params.set("status", input.status.trim());

  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements?${params.toString()}`,
    { cache: "no-store" },
  );

  const raw = await handleResponse<{ statements: RawStatementListItem[] }>(response);

  return raw.statements.map((statement) => ({
    id: statement.id,
    status: statement.status,
    periodKey: statement.periodKey,
    historyKey: statement.historyKey,
    version: statement.version,
    isActiveForPeriod: statement.isActiveForPeriod,
    archivedAt: statement.archivedAt,
    archivedReason: statement.archivedReason,
    bankName: statement.bankName,
    brand: statement.brand,
    statementNumber: statement.statementNumber,
    totalPesos: statement.totalPesosRaw,
    totalDollars: statement.totalDollarsRaw,
    minimumPaymentPesos: statement.minimumPaymentPesosRaw,
    currentDueDate: statement.currentDueDate,
    nextClosingDate: statement.nextClosingDate,
    nextDueDate: statement.nextDueDate,
    createdAt: statement.createdAt,
    updatedAt: statement.updatedAt,
    cards: statement.groups,
    document: statement.document,
  }));
}

export async function getCardStatementTraceability(
  statementId: string,
): Promise<CardStatementTraceability> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/${encodeURIComponent(statementId)}/traceability`,
    { cache: "no-store" },
  );
  return handleResponse<CardStatementTraceability>(response);
}

export async function archiveCardStatement(
  statementId: string,
  reason?: string,
): Promise<{ success: boolean; statementId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/${encodeURIComponent(statementId)}/archive`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    },
  );
  return handleResponse(response);
}

export async function activateCardStatement(
  statementId: string,
): Promise<AcceptedCardStatement> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/${encodeURIComponent(statementId)}/activate`,
    { method: "POST" },
  );
  return handleResponse<AcceptedCardStatement>(response);
}

export async function createManualPurchase(
  payload: ManualPurchasePayload,
): Promise<{
  purchase: {
    id: string;
    statementId: string;
  };
  projections: unknown[];
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/manual-purchases`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return handleResponse(response);
}

export async function deleteManualPurchase(
  purchaseId: string,
): Promise<{ success: boolean; statementId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/manual-purchases/${encodeURIComponent(purchaseId)}`,
    {
      method: "DELETE",
    },
  );

  return handleResponse(response);
}

export type CardStatementDraftSummary = {
  id: string;
  status: "preview_ready" | "failed";
  createdAt: string;
  fileName: string;
  errorMessage?: string;
};

export async function listCardStatementDrafts(input?: {
  status?: "preview_ready" | "failed" | "all";
  limit?: number;
  offset?: number;
}): Promise<CardStatementDraftSummary[]> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.limit !== undefined) params.set("limit", String(input.limit));
  if (input?.offset !== undefined) params.set("offset", String(input.offset));
  const qs = params.toString();
  const url = `${API_BASE_URL}/api/card-statements/drafts${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  return handleResponse<CardStatementDraftSummary[]>(response);
}

export async function discardCardStatementDraft(
  draftId: string,
): Promise<{ ok: true; deletedId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
    { method: "DELETE" },
  );
  return handleResponse<{ ok: true; deletedId: string }>(response);
}

export async function deleteCardStatement(
  statementId: string,
): Promise<{ success: true; deletedId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/statements/${encodeURIComponent(statementId)}`,
    { method: "DELETE" },
  );
  return handleResponse<{ success: true; deletedId: string }>(response);
}
