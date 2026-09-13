import { expect, test } from "@playwright/test";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

test("Privacidad oculta y vuelve a mostrar los importes de toda la app", async ({ page, request }) => {
  const originalResponse = await request.get(`${API_BASE_URL}/api/settings`);
  expect(originalResponse.ok()).toBeTruthy();
  const original = await originalResponse.json();

  try {
    await page.goto("/");

    const amount = page.getByTestId("dashboard-savings-ars-amount");
    await expect(amount).toBeVisible();
    await expect(amount).toContainText("$");

    await page.getByRole("button", { name: /^Ingresos$/i }).click();
    const incomeTotal = page.getByTestId("income-total-summary");
    await expect(incomeTotal).toBeVisible();
    await expect(incomeTotal).toContainText("$");

    await page.getByRole("button", { name: /^Configuración$/i }).click();
    const settingsSection = page.getByTestId("settings-section");
    await expect(settingsSection).toBeVisible();

    const toggle = settingsSection.getByTestId("settings-hide-amounts");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(settingsSection.getByText("Importes ocultos en toda la app.")).toBeVisible();

    await page.getByRole("button", { name: /^Inicio$/i }).click();
    await expect(amount).toBeVisible();
    await expect(amount).not.toContainText("$");
    await expect(amount.getByLabel(/Importe oculto/)).toBeVisible();

    await page.getByRole("button", { name: /^Ingresos$/i }).click();
    await expect(incomeTotal).toBeVisible();
    await expect(incomeTotal).not.toContainText("$");

    await page.getByRole("button", { name: /^Configuración$/i }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(settingsSection.getByText("Importes visibles en toda la app.")).toBeVisible();

    await page.getByRole("button", { name: /^Inicio$/i }).click();
    await expect(amount).toBeVisible();
    await expect(amount).toContainText("$");

    await page.getByRole("button", { name: /^Ingresos$/i }).click();
    await expect(incomeTotal).toBeVisible();
    await expect(incomeTotal).toContainText("$");
  } finally {
    await request.put(`${API_BASE_URL}/api/settings`, { data: original });
  }
});
