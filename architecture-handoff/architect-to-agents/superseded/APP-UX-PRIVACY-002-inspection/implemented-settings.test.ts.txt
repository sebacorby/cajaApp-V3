import { describe, expect, it } from "vitest";
import { updateSettingsSchema } from "../../src/modules/settings/settings.schemas.js";
import {
  DEFAULT_LOCAL_SETTINGS,
  serializeLocalSettings,
} from "../../src/modules/settings/settings.service.js";

describe("local settings contract", () => {
  it("conserva defaults honestos para una instalación local", () => {
    expect(DEFAULT_LOCAL_SETTINGS).toEqual({
      displayName: "Javi",
      locale: "es-AR",
      timezone: "America/Argentina/Tucuman",
      defaultCurrency: "ARS",
      theme: "system",
      hideAmounts: false,
    });
  });

  it("valida únicamente preferencias realmente soportadas", () => {
    const parsed = updateSettingsSchema.parse({
      displayName: "Javier",
      locale: "es-AR",
      timezone: "America/Argentina/Tucuman",
      defaultCurrency: "USD",
      theme: "dark",
      hideAmounts: true,
    });
    expect(parsed.theme).toBe("dark");
    expect(parsed.hideAmounts).toBe(true);
    expect(() =>
      updateSettingsSchema.parse({ ...parsed, locale: "en-US" }),
    ).toThrow();
    expect(() =>
      updateSettingsSchema.parse({ ...parsed, theme: "sepia" }),
    ).toThrow();
    expect(() =>
      updateSettingsSchema.parse({ ...parsed, hideAmounts: "true" }),
    ).toThrow();
  });

  it("serializa updatedAt y privacidad sin alterar las preferencias", () => {
    const updatedAt = new Date("2026-07-12T15:30:00.000Z");
    expect(
      serializeLocalSettings({
        displayName: "Javi",
        locale: "es-AR",
        timezone: "America/Argentina/Tucuman",
        defaultCurrency: "ARS",
        theme: "light",
        hideAmounts: true,
        updatedAt,
      }),
    ).toEqual({
      displayName: "Javi",
      locale: "es-AR",
      timezone: "America/Argentina/Tucuman",
      defaultCurrency: "ARS",
      theme: "light",
      hideAmounts: true,
      updatedAt: updatedAt.toISOString(),
    });
  });
});
