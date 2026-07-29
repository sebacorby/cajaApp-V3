import { expect, test } from "@playwright/test";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}


test("centro de alertas: contador, evidencia, actualización, acción y mobile", async ({ page, request }) => {
  test.setTimeout(120_000);
  const description = `UAT centro alertas ${Date.now()}`;
  const created = await request.post(`${API_BASE_URL}/api/movements/manual`, {
    data: {
      occurredOn: today(),
      type: "expense",
      sourceType: "manual_unexpected",
      description,
      categoryId: null,
      currency: "ARS",
      amount: "1234.56",
      status: "actual",
      notes: "Prueba controlada del centro de alertas",
    },
  });
  expect(created.ok()).toBeTruthy();
  const movement = (await created.json()) as { id: string };


  try {
    await page.goto("/");
    const trigger = page.getByTestId("header-alert-center");
    await expect(trigger).toBeVisible();
    await expect(page.getByTestId("alert-center-count")).toBeVisible();
    await trigger.click();


    const panel = page.getByTestId("alert-center-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Centro de alertas");
    const item = page.locator('[data-testid^="alert-center-item-"]').filter({ hasText: "Sin clasificar" }).first();
    await expect(item).toBeVisible();
    await expect(item).toContainText("Regla:");
    await expect(item.locator("li").first()).toBeVisible();


    await page.getByTestId("alert-center-refresh").click();
    await expect(page.getByTestId("alert-center-refresh")).toBeEnabled();


    await item.getByRole("button").click();
    await expect(page.getByTestId("movements-section")).toBeVisible();


    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const mobileTrigger = page.getByTestId("header-alert-center");
    await expect(mobileTrigger).toBeVisible();
    await mobileTrigger.click();
    await expect(page.getByTestId("alert-center-panel")).toBeVisible();
    await page.keyboard.press("Escape");
  } finally {
    await request.delete(`${API_BASE_URL}/api/movements/manual/${movement.id}`);
  }
});