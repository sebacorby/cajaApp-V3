import { expect, test, type Page, type Route } from "@playwright/test";

const TEST_URL = "/test/future-debt";

async function installRoutes(page: Page): Promise<void> {
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
        summary: { ars: "10000.00", usd: "0.00" },
        horizon: { persisted: true, persistedMonths: ["2026-08"] },
        months: [
          {
            monthKey: "2026-08",
            label: "Agosto 2026",
            totals: { ars: "10000.00", usd: "0.00" },
            dataQuality: { status: "complete", warnings: [] },
            cards: [
              {
                cardId: "card-1",
                cardLast4: "1234",
                holderName: "JAVI",
                cardLabel: "Visa •••• 1234",
                totals: { ars: "10000.00", usd: "0.00" },
                rows: [
                  {
                    id: "confirmed-1",
                    monthKey: "2026-08",
                    description: "Compra confirmada",
                    installmentNumber: 2,
                    installmentTotal: 3,
                    installmentLabel: "2/3",
                    amount: "10000.00",
                    currency: "ARS",
                    originType: "card_statement",
                    originReference: "statement-1",
                    sourceLabel: "Visa •••• 1234",
                    cardId: "card-1",
                    cardLast4: "1234",
                    holderName: "JAVI",
                    cardLabel: "Visa •••• 1234",
                    status: "confirmed",
                    rowType: "future_installment",
                  },
                ],
              },
            ],
          },
        ],
        pendientes: {
          diagnostics: ["missing_card_reference:2"],
          rows: [
            {
              id: "pending-1",
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
              id: "pending-2",
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

test("pending select-all affects only pending rows", async ({ page }) => {
  await installRoutes(page);
  await page.goto(TEST_URL);

  const confirmed = page.getByRole("checkbox", { name: "Seleccionar fila Compra confirmada" });
  const pendingAll = page.getByRole("checkbox", { name: "Seleccionar todas las filas pendientes" });

  await expect(confirmed).not.toBeChecked();
  await pendingAll.click();

  await expect(page.getByRole("button", { name: "Eliminar 2 filas" })).toBeVisible();
  await expect(confirmed).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Seleccionar fila pendiente Cuota pendiente A" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Seleccionar fila pendiente Cuota pendiente B" })).toBeChecked();
});

test("card select-all affects only rows from that card", async ({ page }) => {
  await installRoutes(page);
  await page.goto(TEST_URL);

  const cardAll = page.getByRole("checkbox", { name: "Seleccionar filas de Visa •••• 1234" });
  await cardAll.click();

  await expect(page.getByRole("button", { name: "Eliminar 1 fila" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Seleccionar fila Compra confirmada" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Seleccionar fila pendiente Cuota pendiente A" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Seleccionar fila pendiente Cuota pendiente B" })).not.toBeChecked();
});
