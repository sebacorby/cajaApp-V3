import { expect, test, type Page, type Route } from "@playwright/test";

const TEST_URL = "/test/future-debt";

function row(input: {
  id: string;
  sourceId: string;
  monthKey: string;
  description: string;
  dateIso: string;
  amount: string;
  installmentNumber: number;
  installmentTotal: number;
}) {
  return {
    id: input.id,
    sourceId: input.sourceId,
    dateIso: input.dateIso,
    monthKey: input.monthKey,
    description: input.description,
    installmentNumber: input.installmentNumber,
    installmentTotal: input.installmentTotal,
    installmentLabel: `${input.installmentNumber}/${input.installmentTotal}`,
    amount: input.amount,
    currency: "ARS",
    originType: "card_statement",
    originReference: "statement-1",
    sourceLabel: "MASTERCARD BLACK",
    cardId: "mastercard-black",
    cardLast4: "",
    holderName: "JAVI",
    cardLabel: "MASTERCARD BLACK",
    status: "confirmed",
    rowType: "future_installment",
  };
}

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
        updatedAt: "2026-07-26T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/api/future-debt**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        range: {
          from: "2027-01",
          to: "2027-06",
          months: 6,
          includeCurrentPeriod: false,
          currentPeriodKey: "2026-12",
        },
        summary: { ars: "80000.00", usd: "0.00" },
        horizon: {
          persisted: true,
          persistedMonths: ["2027-01", "2027-02", "2027-03"],
        },
        months: [
          {
            monthKey: "2027-01",
            label: "Enero 2027",
            totals: { ars: "10000.00", usd: "0.00" },
            dataQuality: { status: "complete", warnings: [] },
            cards: [
              {
                cardId: "mastercard-black",
                cardLast4: "",
                holderName: "JAVI",
                cardLabel: "MASTERCARD BLACK",
                totals: { ars: "10000.00", usd: "0.00" },
                rows: [
                  row({
                    id: "projection-a-1",
                    sourceId: "purchase-a",
                    monthKey: "2027-01",
                    description: "Compra A",
                    dateIso: "2026-11-15",
                    amount: "10000.00",
                    installmentNumber: 1,
                    installmentTotal: 3,
                  }),
                ],
              },
            ],
          },
          {
            monthKey: "2027-02",
            label: "Febrero 2027",
            totals: { ars: "35000.00", usd: "0.00" },
            dataQuality: { status: "complete", warnings: [] },
            cards: [
              {
                cardId: "mastercard-black",
                cardLast4: "",
                holderName: "JAVI",
                cardLabel: "MASTERCARD BLACK",
                totals: { ars: "35000.00", usd: "0.00" },
                rows: [
                  row({
                    id: "projection-a-2",
                    sourceId: "purchase-a",
                    monthKey: "2027-02",
                    description: "Compra A",
                    dateIso: "2026-11-15",
                    amount: "10000.00",
                    installmentNumber: 2,
                    installmentTotal: 3,
                  }),
                  row({
                    id: "projection-b-1",
                    sourceId: "purchase-b",
                    monthKey: "2027-02",
                    description: "Compra B",
                    dateIso: "2026-12-02",
                    amount: "25000.00",
                    installmentNumber: 1,
                    installmentTotal: 2,
                  }),
                ],
              },
            ],
          },
          {
            monthKey: "2027-03",
            label: "Marzo 2027",
            totals: { ars: "35000.00", usd: "0.00" },
            dataQuality: { status: "complete", warnings: [] },
            cards: [
              {
                cardId: "mastercard-black",
                cardLast4: "",
                holderName: "JAVI",
                cardLabel: "MASTERCARD BLACK",
                totals: { ars: "35000.00", usd: "0.00" },
                rows: [
                  row({
                    id: "projection-a-3",
                    sourceId: "purchase-a",
                    monthKey: "2027-03",
                    description: "Compra A",
                    dateIso: "2026-11-15",
                    amount: "10000.00",
                    installmentNumber: 3,
                    installmentTotal: 3,
                  }),
                  row({
                    id: "projection-b-2",
                    sourceId: "purchase-b",
                    monthKey: "2027-03",
                    description: "Compra B",
                    dateIso: "2026-12-02",
                    amount: "25000.00",
                    installmentNumber: 2,
                    installmentTotal: 2,
                  }),
                ],
              },
            ],
          },
        ],
        pendientes: { rows: [], diagnostics: [] },
        diagnostics: {
          duplicateOccurrences: 0,
          invalidInstallmentRows: 0,
          missingCurrencyRows: 0,
          missingCardRows: 0,
          warnings: [],
        },
      }),
    });
  });
}

test("renders one collapsible card matrix with movements as rows and months as columns", async ({
  page,
}) => {
  await installRoutes(page);
  await page.goto(TEST_URL);

  const card = page.getByTestId("future-debt-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("MASTERCARD BLACK");

  const matrix = card.getByTestId("future-debt-card-matrix");
  await expect(matrix).toBeVisible();
  await expect(matrix.getByRole("columnheader", { name: "Fecha" })).toBeVisible();
  await expect(
    matrix.getByRole("columnheader", { name: "Descripción" }),
  ).toBeVisible();
  await expect(matrix.getByRole("columnheader", { name: "Ene 2027" })).toBeVisible();
  await expect(matrix.getByRole("columnheader", { name: "Feb 2027" })).toBeVisible();
  await expect(matrix.getByRole("columnheader", { name: "Mar 2027" })).toBeVisible();

  const movements = matrix.getByTestId("future-debt-row");
  await expect(movements).toHaveCount(2);

  const purchaseA = matrix.locator('tr[data-source-id="purchase-a"]');
  await expect(purchaseA).toContainText("15/11/2026");
  await expect(purchaseA).toContainText("Compra A");
  await expect(purchaseA).toContainText(/10[\.\s]?000,00/);
  await expect(purchaseA).not.toContainText("1/3");
  await expect(purchaseA).not.toContainText("2/3");
  await expect(purchaseA).not.toContainText("3/3");

  await expect(matrix.getByText("Total mensual")).toBeVisible();

  await page.getByRole("button", { name: "Colapsar MASTERCARD BLACK" }).click();
  await expect(matrix).not.toBeVisible();

  await page.getByRole("button", { name: "Expandir MASTERCARD BLACK" }).click();
  await expect(card.getByTestId("future-debt-card-matrix")).toBeVisible();
});
