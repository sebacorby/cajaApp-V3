import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

test("Movimientos exporta exactamente el filtro activo", async ({
  page,
  request,
}) => {
  const date = today();
  const marker = `UAT Export ${Date.now()}`;
  const createdIds: string[] = [];
  try {
    for (const description of [
      `${marker} incluido`,
      `Otro movimiento ${Date.now()}`,
    ]) {
      const response = await request.post(
        `${API_BASE_URL}/api/movements/manual`,
        {
          data: {
            occurredOn: date,
            type: "expense",
            sourceType: "manual_cash",
            description,
            categoryId: null,
            currency: "ARS",
            amount: "1234.56",
            status: "actual",
            notes: "Playwright export smoke",
          },
        },
      );
      expect(response.ok()).toBeTruthy();
      const movement = (await response.json()) as { sourceId: string };
      createdIds.push(movement.sourceId);
    }

    await page.goto("/");
    await page.getByRole("button", { name: /^Movimientos$/i }).click();
    const section = page.getByTestId("movements-section");
    await section.getByTestId("movement-search").fill(marker);
    await section.getByRole("button", { name: "Buscar" }).click();
    const includedRow = section
      .locator('[data-testid^="movement-row-"]')
      .filter({ hasText: `${marker} incluido` })
      .first();
    await expect(includedRow).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await section.getByTestId("export-movements-csv").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^cajaapp-movimientos-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const path = await download.path();
    expect(path).not.toBeNull();
    const csv = await readFile(path!, "utf8");
    expect(csv).toContain(`${marker} incluido`);
    expect(csv).not.toContain("Otro movimiento");
    expect(csv).toContain('"ARS";"1.234,56"');
  } finally {
    for (const id of createdIds) {
      await request.delete(
        `${API_BASE_URL}/api/movements/manual/${encodeURIComponent(id)}`,
      );
    }
  }
});
