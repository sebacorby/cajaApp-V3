import path from "node:path";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { UpdateSettingsInput } from "./settings.schemas.js";

const SETTINGS_ID = "local";
export const DEFAULT_LOCAL_SETTINGS = {
  displayName: "Javi",
  locale: "es-AR",
  timezone: "America/Argentina/Tucuman",
  defaultCurrency: "ARS",
  theme: "system",
  hideAmounts: false,
} as const;

export function serializeLocalSettings(value: {
  displayName: string;
  locale: string;
  timezone: string;
  defaultCurrency: string;
  theme: string;
  hideAmounts: boolean;
  updatedAt: Date;
}) {
  return {
    displayName: value.displayName,
    locale: value.locale,
    timezone: value.timezone,
    defaultCurrency: value.defaultCurrency,
    theme: value.theme,
    hideAmounts: value.hideAmounts,
    updatedAt: value.updatedAt.toISOString(),
  };
}

export class SettingsService {
  async getSettings() {
    const settings = await prisma.localAppSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_LOCAL_SETTINGS },
      update: {},
    });
    return serializeLocalSettings(settings);
  }

  async updateSettings(input: UpdateSettingsInput) {
    const settings = await prisma.localAppSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...input },
      update: input,
    });
    return serializeLocalSettings(settings);
  }

  getSystemStatus() {
    return {
      mode: "local",
      backend: "available",
      databaseEngine: "SQLite",
      storageDirectory: path.resolve(env.STORAGE_DIR),
      databaseConfigured: Boolean(env.DATABASE_URL),
      nodeVersion: process.version,
      environment: env.NODE_ENV,
      bankConnections: false,
      authentication: false,
      notifications: false,
    };
  }
}

export const settingsService = new SettingsService();
