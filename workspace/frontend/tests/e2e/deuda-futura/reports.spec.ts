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

function monthRange(date: string): { from: string; to: string } {
  const [year, month] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

test("Reportes consume datos reales, exporta y abre el detalle en Movimientos", async ({
  page,
  request,
}) => {
  const date = today();
  const range = monthRange(date);
  const marker = `UAT Reportes ${Date.now()}`;
  const createdIds: string[] = [];

  try {
    for (const payload of [
      {
        type: "income",
        sourceType: "manual_income",
        description: `${marker} ingreso`,
        amount: "100000.00",
      },
      {
        type: "expense",
        sourceType: "manual_cash",
        description: `${marker} egreso`,
        amount: "25000.00",
      },
    ]) {
      const response = await request.post(
        `${API_BASE_URL}/api/movements/manual`,
        {
          data: {
            occurredOn: date,
            currency: "ARS",
            status: "actual",
            categoryId: null,
            notes: "Playwright report smoke",
            ...payload,
          },
        },
      );
      expect(response.ok()).toBeTruthy();
      const movement = (await response.json()) as { sourceId: string };
      createdIds.push(movement.sourceId);
    }

    await page.goto("/");
    await page.getByRole("button", { name: /^Reportes$/i }).click();
    const section = page.getByTestId("reports-section");
    await expect(section).toBeVisible();
    await section.getByLabel("Desde").fill(range.from);
    await section.getByLabel("Hasta").fill(range.to);
    await section.getByRole("button", { name: "Actualizar" }).click();
    await expect(
      section.getByText("Evolución mensual real", { exact: true }),
    ).toBeVisible();
    await expect(
      section.getByText("Gastos por categoría", { exact: true }),
    ).toBeVisible();
    await expect(section.getByRole("button", { name: "CSV" })).toBeEnabled();

    const month = section.locator('[data-testid^="report-month-"]').last();
    await month.getByRole("button", { name: /Egresos/i }).click();
    await expect(page.getByTestId("movements-section")).toBeVisible();
    await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
      "Egresos",
    );
    const movementRow = page
      .locator('[data-testid^="movement-row-"]')
      .filter({ hasText: `${marker} egreso` })
      .first();
    await expect(movementRow).toBeVisible();
  } finally {
    for (const id of createdIds) {
      await request.delete(
        `${API_BASE_URL}/api/movements/manual/${encodeURIComponent(id)}`,
      );
    }
  }
});
