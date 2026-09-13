const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type DebitImportStatus = "draft" | "accepted" | "reversed";
export type DebitImportRowStatus =
  | "draft"
  | "accepted"
  | "omitted"
  | "rejected";

export interface DebitImportSummary {
  id: string;
  fileName: string;
  sha256: string;
  bankName: string | null;
  status: DebitImportStatus;
  rowCount: number;
  acceptedCount: number;
  omittedCount: number;
  rejectedCount: number;
  createdAt: string;
  acceptedAt: string | null;
  reversedAt: string | null;
}

export interface DebitImportRow {
  id: string;
  rowNumber: number;
  occurredOn: string | null;
  description: string;
  reference: string | null;
  movementType: "income" | "expense";
  currency: "ARS" | "USD";
  amount: string;
  category: { id: string | null; name: string };
  included: boolean;
  status: DebitImportRowStatus;
  validationError: string | null;
  duplicateExisting: boolean;
  editable: boolean;
  original: string[];
}

export interface DebitImportPreview extends DebitImportSummary {
  delimiter: string;
  encoding: "utf8" | "latin1";
  headerRow: number;
  headers: string[];
  mapping: {
    date: number;
    description: number;
    amount: number | null;
    debit: number | null;
    credit: number | null;
    currency: number | null;
    reference: number | null;
  };
  duplicateFile: boolean;
  rows: DebitImportRow[];
  result?: {
    acceptedCount: number;
    omittedCount: number;
    rejectedCount: number;
  };
}

export interface DebitImportRowUpdate {
  occurredOn: string;
  description: string;
  reference?: string | null;
  movementType: "income" | "expense";
  currency: "ARS" | "USD";
  amount: string;
  categoryId?: string | null;
  included?: boolean;
}

export class DebitImportsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "DebitImportsApiError";
  }
}

async function parseError(response: Response): Promise<DebitImportsApiError> {
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
  return new DebitImportsApiError(message, response.status, code);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

export async function previewDebitCsv(
  file: File,
): Promise<DebitImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/debit-imports/preview`, {
      method: "POST",
      body: formData,
    }),
  );
}

export async function listDebitImports(
  limit = 20,
): Promise<DebitImportSummary[]> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/debit-imports?limit=${limit}`, {
      cache: "no-store",
    }),
  );
}

export async function getDebitImport(
  importId: string,
): Promise<DebitImportPreview> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/debit-imports/${encodeURIComponent(importId)}`,
      { cache: "no-store" },
    ),
  );
}

export async function updateDebitImportRow(
  importId: string,
  rowId: string,
  payload: DebitImportRowUpdate,
): Promise<DebitImportPreview> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/debit-imports/${encodeURIComponent(importId)}/rows/${encodeURIComponent(rowId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  );
}

export async function acceptDebitImport(
  importId: string,
  rowIds: string[],
): Promise<DebitImportPreview> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/debit-imports/${encodeURIComponent(importId)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIds }),
      },
    ),
  );
}

export async function deleteDebitImportDraft(
  importId: string,
): Promise<{ success: true }> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/debit-imports/${encodeURIComponent(importId)}`,
      { method: "DELETE" },
    ),
  );
}

export async function reverseDebitImport(
  importId: string,
): Promise<{ success: true }> {
  return handleResponse(
    await fetch(
      `${API_BASE_URL}/api/debit-imports/${encodeURIComponent(importId)}/reverse`,
      { method: "POST" },
    ),
  );
}
