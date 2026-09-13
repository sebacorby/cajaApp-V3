const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type SalaryReceiptCurrency = "ARS" | "USD";
export type SalaryReceiptItemKind =
  | "earning"
  | "deduction"
  | "employer_contribution"
  | "information";

export interface SalaryReceiptItem {
  id: string;
  displayOrder: number;
  kind: SalaryReceiptItemKind;
  code: string | null;
  label: string;
  amount: string;
  sourcePage: number | null;
  originalText: string;
  confidence: number | null;
}

export interface SalaryReceiptPreview {
  version: "salary-receipt-v1";
  documentType: "salary_receipt_pdf";
  source: {
    employerName: string;
    employerTaxId: string | null;
    employeeName: string;
    employeeTaxId: string | null;
    periodMonthKey: string;
    payDate: string | null;
    currency: SalaryReceiptCurrency;
  };
  summary: {
    grossAmount: string;
    deductionsAmount: string;
    netAmount: string;
  };
  items: SalaryReceiptItem[];
  warnings: string[];
}

export interface SalaryReceiptDraft {
  id: string;
  status: string;
  preview: SalaryReceiptPreview | null;
  document: {
    id: string;
    fileName: string;
    pageCount: number | null;
    sha256: string;
  };
  aiRun: {
    id: string;
    status: string;
    modelProvider: string;
    modelName: string;
    completedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryReceiptRecord {
  id: string;
  status: "accepted" | "superseded" | "reversed" | string;
  historyKey: string;
  version: number;
  isActiveForPeriod: boolean;
  employerName: string;
  employerTaxId: string | null;
  employeeName: string;
  employeeTaxId: string | null;
  periodMonthKey: string;
  payDate: string | null;
  currency: SalaryReceiptCurrency;
  grossAmount: string;
  deductionsAmount: string;
  netAmount: string;
  sourceId: string | null;
  actualIncomeEventId: string | null;
  projectionIncomeEventId: string | null;
  acceptedAt: string;
  reversedAt: string | null;
  document: {
    id: string;
    fileName: string;
    pageCount: number | null;
    sha256: string;
  };
  items?: SalaryReceiptItem[];
}

export class SalaryReceiptsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "SalaryReceiptsApiError";
  }
}

async function parseError(response: Response): Promise<SalaryReceiptsApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = await response.json() as { message?: string; error?: string; code?: string };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new SalaryReceiptsApiError(message, response.status, code);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

export async function importSalaryReceipt(file: File): Promise<SalaryReceiptDraft> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/salary-receipts/import`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
}

export async function updateSalaryReceiptDraft(
  draftId: string,
  preview: SalaryReceiptPreview,
): Promise<SalaryReceiptDraft> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts/drafts/${encodeURIComponent(draftId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview),
    },
  );
  return handleResponse(response);
}

export async function acceptSalaryReceiptDraft(
  draftId: string,
  input: { sourceId?: string | null; useAsFutureBase: boolean },
): Promise<SalaryReceiptRecord> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts/drafts/${encodeURIComponent(draftId)}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return handleResponse(response);
}

export async function listSalaryReceipts(limit = 20): Promise<SalaryReceiptRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts?limit=${limit}`,
    { cache: "no-store" },
  );
  return handleResponse(response);
}

export async function reverseSalaryReceipt(receiptId: string): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts/${encodeURIComponent(receiptId)}/reverse`,
    { method: "POST" },
  );
  return handleResponse(response);
}
