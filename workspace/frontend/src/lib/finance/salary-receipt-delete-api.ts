const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type ReversedSalaryReceipt = {
  id: string;
  status: string;
  employerName: string;
  employeeName: string;
  periodMonthKey: string;
  reversedAt: string | null;
  document: { fileName: string };
};

export type PendingSalaryReceiptDraft = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  document: { fileName: string };
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;

  let message = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    message = body.message || body.error || message;
  } catch {
    // Keep the HTTP fallback when the backend did not return JSON.
  }
  throw new Error(message);
}

export async function listPendingSalaryReceiptDrafts(): Promise<PendingSalaryReceiptDraft[]> {
  const response = await fetch(`${API_BASE_URL}/api/salary-receipts/drafts`, {
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function deletePendingSalaryReceiptDraft(
  draftId: string,
): Promise<{ deleted: true; deletedDraftId: string; deletedDocumentId: string | null }> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts/drafts/${encodeURIComponent(draftId)}`,
    { method: "DELETE" },
  );
  return parseResponse(response);
}

export async function listReversedSalaryReceipts(): Promise<ReversedSalaryReceipt[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts?limit=100&includeReversed=true`,
    { cache: "no-store" },
  );
  const receipts = await parseResponse<ReversedSalaryReceipt[]>(response);
  return receipts.filter((receipt) => receipt.status === "reversed");
}

export async function deleteReversedSalaryReceipt(
  receiptId: string,
): Promise<{ deleted: true; deletedReceiptId: string; deletedDocumentId: string | null }> {
  const response = await fetch(
    `${API_BASE_URL}/api/salary-receipts/${encodeURIComponent(receiptId)}`,
    { method: "DELETE" },
  );
  return parseResponse(response);
}
