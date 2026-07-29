const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type AppTheme = "system" | "light" | "dark";

export interface LocalAppSettings {
  displayName: string;
  locale: "es-AR";
  timezone: "America/Argentina/Tucuman";
  defaultCurrency: "ARS" | "USD";
  theme: AppTheme;
  hideAmounts: boolean;
  updatedAt: string;
}

export interface SystemStatus {
  mode: "local";
  backend: string;
  databaseEngine: string;
  storageDirectory: string;
  databaseConfigured: boolean;
  nodeVersion: string;
  environment: string;
  bankConnections: false;
  authentication: false;
  notifications: false;
}

export type SettingsPayload = Omit<LocalAppSettings, "updatedAt">;

export class SettingsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "SettingsApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
      code = body.code;
    } catch {
      message = (await response.text()) || message;
    }
    throw new SettingsApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

export async function getLocalSettings(): Promise<LocalAppSettings> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/settings`, { cache: "no-store" }),
  );
}

export async function updateLocalSettings(
  payload: SettingsPayload,
): Promise<LocalAppSettings> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return handleResponse(
    await fetch(`${API_BASE_URL}/api/settings/system`, { cache: "no-store" }),
  );
}
