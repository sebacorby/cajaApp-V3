declare const Buffer: { from(input: string, encoding?: string): any };
import { expect, test } from "@playwright/test";

function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

test.describe("Importación de débitos CSV", () => {
  test("previsualiza, acepta, deduplica y revierte una importación", async ({ page }) => {
    const suffix = Date.now();
    const description = `Compra débito E2E ${suffix}`;
    const csv = [
      "Fecha;Descripción;Débito;Crédito;Referencia",
      `${today()};${description};1.234,56;;CSV-${suffix}`,
    ].join("\r\n");

    await page.goto("/");
    await page.getByRole("button", { name: /^Movimientos$/ }).click();
    await page.getByTestId("open-debit-csv-import").click();

    await page.getByTestId("debit-csv-file").setInputFiles({
      name: `debitos-e2e-${suffix}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await page.getByTestId("analyze-debit-csv").click();

    const preview = page.getByTestId("debit-csv-preview");
    await expect(preview).toBeVisible();
    await expect(
      preview.getByTestId("debit-row-description").first(),
    ).toHaveValue(description);
    await page.getByTestId("accept-debit-csv").click();
    await expect(preview).toContainText(/Importación aceptada|Aceptada/);

    const historyButton = page.getByRole("button", {
      name: new RegExp(`debitos-e2e-${suffix}\\.csv`),
    });
    await expect(historyButton).toBeVisible();

    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByText(description, { exact: true })).toBeVisible();

    await page.getByTestId("open-debit-csv-import").click();
    await page.getByTestId("debit-csv-file").setInputFiles({
      name: `debitos-e2e-${suffix}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await page.getByTestId("analyze-debit-csv").click();
    await expect(page.getByText("Este archivo ya fue importado y aceptado.")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Revertir" }).first().click();
    await expect(page.getByText(/Importación revertida/)).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByText(description, { exact: true })).toHaveCount(0);

  });
});
