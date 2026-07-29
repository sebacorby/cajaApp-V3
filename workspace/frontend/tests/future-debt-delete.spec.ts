import { expect, test, type Page, type Route } from "@playwright/test";

const TEST_URL = "/test/future-debt";
const PENDING_ID_A = "c000000000000000000000101";
const PENDING_ID_B = "c000000000000000000000102";

async function installRoutes(page: Page, deletedIds: string[]): Promise<void> {
  await page.route("**/api/settings", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        displayName: "Javi",
        locale: "es-AR",
        timezone: "America/Argentina/Tucuman",
        defaultCurrency: "ARS",
        theme: "system",
        hideAmounts: false,
        updatedAt: "2026-07-25T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/api/future-debt**", async (route: Route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      const id = decodeURIComponent(new URL(request.url()).pathname.split("/").pop() ?? "");
      deletedIds.push(id);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        range: {
          from: "2026-08",
          to: "2027-01",
          months: 6,
          includeCurrentPeriod: false,
          currentPeriodKey: "2026-07",
        },
        summary: { ars: "0.00", usd: "0.00" },
        horizon: { persisted: true, persistedMonths: ["2026-08", "2026-09"] },
        months: [],
        pendientes: {
          diagnostics: ["missing_card_reference:2"],
          rows: [
            {
              id: PENDING_ID_A,
              monthKey: "2026-08",
              description: "Cuota pendiente A",
              installmentNumber: 2,
              installmentTotal: 3,
              installmentLabel: "2/3",
              amount: "2500.00",
              currency: "ARS",
              originType: "card_statement",
              originReference: "statement-legacy",
              sourceLabel: "Visa sin referencia",
              cardId: null,
              cardLast4: null,
              holderName: null,
              cardLabel: null,
              status: "confirmed",
              rowType: "future_installment",
              diagnostic: "missing_card_reference",
              diagnosticDetail: "No se pudo resolver la tarjeta de origen.",
            },
            {
              id: PENDING_ID_B,
              monthKey: "2026-09",
              description: "Cuota pendiente B",
              installmentNumber: 3,
              installmentTotal: 3,
              installmentLabel: "3/3",
              amount: "2500.00",
              currency: "ARS",
              originType: "card_statement",
              originReference: "statement-legacy",
              sourceLabel: "Visa sin referencia",
              cardId: null,
              cardLast4: null,
              holderName: null,
              cardLabel: null,
              status: "confirmed",
              rowType: "future_installment",
              diagnostic: "missing_card_reference",
              diagnosticDetail: "No se pudo resolver la tarjeta de origen.",
            },
          ],
        },
        diagnostics: {
          duplicateOccurrences: 0,
          invalidInstallmentRows: 0,
          missingCurrencyRows: 0,
          missingCardRows: 2,
          warnings: ["missing_card_reference"],
        },
      }),
    });
  });
}

test("bulk delete confirms once and deletes every selected pending projection", async ({ page }) => {
  const deletedIds: string[] = [];
  await installRoutes(page, deletedIds);
  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto(TEST_URL);
  await page
    .getByRole("checkbox", { name: "Seleccionar todas las filas pendientes" })
    .click();

  const deleteButton = page.getByRole("button", { name: "Eliminar 2 filas" });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  await expect.poll(() => [...deletedIds].sort()).toEqual(
    [PENDING_ID_A, PENDING_ID_B].sort(),
  );
  await expect(deleteButton).not.toBeVisible();
});
