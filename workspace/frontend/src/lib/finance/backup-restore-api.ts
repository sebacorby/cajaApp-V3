const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export interface BackupManifest {
  format: "cajaapp-backup-v1";
  createdAt: string;
  application: "CajaApp V3";
  database: {
    entry: "database.sqlite";
    sha256: string;
    sizeBytes: number;
    integrityCheck: "ok";
    foreignKeyViolations: number;
    tables: string[];
    migrations: string[];
  };
  source: { schemaSha256: string; migrationsSha256: string; nodeVersion: string };
}

export interface BackupItem {
  id: string;
  fileName: string;
  kind: "manual" | "pre_restore" | "restored_upload";
  status: "created" | "validated" | "restored";
  sizeBytes: number;
  sha256: string;
  manifest: BackupManifest;
  createdAt: string;
  validatedAt: string | null;
  restoredAt: string | null;
}

export class BackupRestoreApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "BackupRestoreApiError";
  }
}

async function parseError(response: Response): Promise<BackupRestoreApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = await response.json() as { message?: string; error?: string; code?: string };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new BackupRestoreApiError(message, response.status, code);
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

export async function listBackups() {
  return json<{
    items: BackupItem[];
    activities: Array<{ id: string; backupId: string | null; action: string; status: string; detail: unknown; createdAt: string }>;
    backupDirectory: string;
  }>(await fetch(`${API_BASE_URL}/api/backup-restore`, { cache: "no-store" }));
}

export async function createBackup(label?: string): Promise<BackupItem> {
  return json(await fetch(`${API_BASE_URL}/api/backup-restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  }));
}

export async function validateBackup(id: string) {
  return json<{ valid: true; manifest: BackupManifest; packageSha256: string }>(
    await fetch(`${API_BASE_URL}/api/backup-restore/${encodeURIComponent(id)}/validate`, { method: "POST" }),
  );
}

export async function downloadBackup(id: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetch(`${API_BASE_URL}/api/backup-restore/${encodeURIComponent(id)}/download`);
  if (!response.ok) throw await parseError(response);
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "cajaapp-v3.cajaapp-backup";
  return { blob: await response.blob(), fileName };
}

export async function restoreBackup(file: File) {
  const form = new FormData();
  form.append("file", file);
  return json<{ restored: true; backup: BackupItem; preRestoreBackup: BackupItem }>(
    await fetch(`${API_BASE_URL}/api/backup-restore/restore`, { method: "POST", body: form }),
  );
}
