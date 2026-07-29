import { expect, test } from "@playwright/test";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

test("Configuración persiste perfil local y tema global", async ({ page, request }) => {
  const originalResponse = await request.get(`${API_BASE_URL}/api/settings`);
  expect(originalResponse.ok()).toBeTruthy();
  const original = await originalResponse.json();
  const displayName = `Javi UAT ${Date.now()}`;

  try {
    await page.goto("/");
    await page.getByRole("button", { name: /^Configuración$/i }).click();

    const section = page.getByTestId("settings-section");
    await expect(section).toBeVisible();
    await section.getByLabel("Nombre visible").fill(displayName);
    await section.getByTestId("settings-theme").click();
    await page.getByRole("option", { name: "Oscuro" }).click();
    await section.getByTestId("save-local-settings").click();

    await expect(section.getByText("Preferencias guardadas en CajaApp.")).toBeVisible();
    await expect(page.getByText(`Así están tus finanzas, ${displayName}`, { exact: true })).toBeVisible();
    await expect.poll(async () => page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(true);

    await page.reload();
    await expect(page.getByText(`Así están tus finanzas, ${displayName}`, { exact: true })).toBeVisible();
    await expect.poll(async () => page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(true);
  } finally {
    await request.put(`${API_BASE_URL}/api/settings`, { data: original });
  }
});
