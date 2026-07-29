import type { CardStatementPreview } from "./card-statements-api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export const CARD_IMPORT_LIVE_EVENT = "cajaapp:card-import-live";

export interface CardImportTelemetry {
  startedAt?: string;
  lastHeartbeatAt?: string;
  model?: {
    provider?: string;
    name?: string;
  };
  providerProgress?: {
    phase?: "connecting" | "streaming" | "completed";
    chunkCount?: number;
    contentCharacters?: number;
    thinkingCharacters?: number;
    elapsedMs?: number;
  };
  rawExtraction?: {
    pageCount?: number;
    characterCount?: number;
    durationMs?: number;
  };
}

export interface CardImportStatus {
  draftId: string;
  status: "processing" | "preview_ready" | "failed";
  progress?: {
    stage?: string;
    message?: string;
    elapsedSeconds?: number;
  };
  telemetry?: CardImportTelemetry;
  preview?: CardStatementPreview;
  error?: {
    stage?: string;
    message?: string;
  };
}

export type CardImportLiveEventDetail =
  | {
      type: "reset";
      fileName: string;
      timestamp: string;
    }
  | {
      type: "started";
      fileName: string;
      draftId: string;
      pageCount: number;
      timestamp: string;
    }
  | {
      type: "status";
      draftId: string;
      status: CardImportStatus;
      timestamp: string;
    }
  | {
      type: "upload_failed";
      fileName: string;
      message: string;
      timestamp: string;
    };

export interface CardImportDraftResponse {
  draftId: string;
  status: string;
  preview: CardStatementPreview;
}

export interface CardImportAcceptResponse {
  statementId: string;
  status: string;
  warnings?: string[];
}

export class CardImportApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "CardImportApiError";
  }
}

function emitCardImportLiveEvent(detail: CardImportLiveEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CardImportLiveEventDetail>(CARD_IMPORT_LIVE_EVENT, {
      detail,
    }),
  );
}

function reportImportFailure(
  draftId: string,
  message: string,
  stage?: string,
): void {
  if (typeof window === "undefined") return;

  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "frontend.card-import.failed",
      message,
      source: stage ? `stage:${stage}` : "card-import-api",
      url: window.location.href,
      timestamp: new Date().toISOString(),
      draftId,
    }),
    keepalive: true,
  }).catch(() => {
    // Diagnostics must never interfere with the import flow.
  });
}

async function parseError(response: Response): Promise<CardImportApiError> {
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
  return new CardImportApiError(message, response.status, code);
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function startCardImport(
  file: File,
  signal?: AbortSignal,
): Promise<{ draftId: string; pageCount: number }> {
  emitCardImportLiveEvent({
    type: "reset",
    fileName: file.name,
    timestamp: new Date().toISOString(),
  });

  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/card-statements/import`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    const error = await parseError(response);
    emitCardImportLiveEvent({
      type: "upload_failed",
      fileName: file.name,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }

  const started = (await response.json()) as {
    draftId: string;
    pageCount: number;
  };

  emitCardImportLiveEvent({
    type: "started",
    fileName: file.name,
    draftId: started.draftId,
    pageCount: started.pageCount,
    timestamp: new Date().toISOString(),
  });

  return started;
}

export async function waitForCardImport(
  draftId: string,
  signal: AbortSignal,
  onProgress?: (status: CardImportStatus) => void,
): Promise<CardStatementPreview> {
  while (!signal.aborted) {
    const response = await fetch(
      `${API_BASE_URL}/api/card-statements/import/${encodeURIComponent(draftId)}/status`,
      { cache: "no-store", signal },
    );
    if (!response.ok) throw await parseError(response);
    const status = (await response.json()) as CardImportStatus;
    onProgress?.(status);
    emitCardImportLiveEvent({
      type: "status",
      draftId,
      status,
      timestamp: new Date().toISOString(),
    });

    if (status.status === "preview_ready") {
      if (!status.preview) {
        const draft = await getCardImportDraft(draftId, signal);
        return draft.preview;
      }
      return status.preview;
    }

    if (status.status === "failed") {
      const rawMessage = status.error?.message?.trim();
      const message =
        rawMessage && rawMessage !== "Unknown error"
          ? rawMessage
          : "La importación falló sin detalle. El diagnóstico quedó registrado en backend.log.";
      reportImportFailure(draftId, message, status.error?.stage);
      throw new CardImportApiError(message, 500);
    }

    await delay(1500, signal);
  }

  throw new DOMException("Aborted", "AbortError");
}

export async function getCardImportDraft(
  draftId: string,
  signal?: AbortSignal,
): Promise<CardImportDraftResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
    { cache: "no-store", signal },
  );
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<CardImportDraftResponse>;
}

export async function acceptCardImport(
  draftId: string,
  preview: CardStatementPreview,
): Promise<CardImportAcceptResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview }),
    },
  );
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<CardImportAcceptResponse>;
}

export async function discardCardImport(draftId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/card-statements/drafts/${encodeURIComponent(draftId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw await parseError(response);
}
