import { expect, test, type Page } from "@playwright/test";

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

function totals(overrides: Partial<Record<string, string | number | null>> = {}) {
  return {
    incomeArs: "0",
    expenseArs: "0",
    resultArs: "0",
    incomeUsd: "0",
    expenseUsd: "0",
    resultUsd: "0",
    savingsRateArs: null,
    savingsRateUsd: null,
    records: 0,
    ...overrides,
  };
}

function reportsFixture() {
  const mayActual = totals({
    incomeArs: "123456",
    expenseArs: "23456",
    resultArs: "100000",
    incomeUsd: "4567",
    expenseUsd: "567",
    resultUsd: "4000",
    savingsRateArs: "81.00",
    savingsRateUsd: "87.59",
    records: 4,
  });
  const juneActual = totals({
    incomeArs: "200000",
    expenseArs: "50000",
    resultArs: "150000",
    incomeUsd: "8000",
    expenseUsd: "1000",
    resultUsd: "7000",
    savingsRateArs: "75.00",
    savingsRateUsd: "87.50",
    records: 4,
  });
  const summaryActual = totals({
    incomeArs: "323456",
    expenseArs: "73456",
    resultArs: "250000",
    incomeUsd: "12567",
    expenseUsd: "1567",
    resultUsd: "11000",
    savingsRateArs: "77.29",
    savingsRateUsd: "87.53",
    records: 8,
  });

  return {
    range: { from: "2026-05-01", to: "2026-06-30" },
    previousRange: { from: "2026-03-01", to: "2026-04-30" },
    monthCount: 2,
    summary: {
      actual: summaryActual,
      pending: totals(),
      projected: totals({ expenseArs: "8456", expenseUsd: "267", records: 2 }),
      expected: totals({
        incomeArs: "323456",
        expenseArs: "81912",
        resultArs: "241544",
        incomeUsd: "12567",
        expenseUsd: "1834",
        resultUsd: "10733",
        records: 10,
      }),
      monthlyAverageActual: totals({
        incomeArs: "161728",
        expenseArs: "36728",
        resultArs: "125000",
        incomeUsd: "6283",
        expenseUsd: "783",
        resultUsd: "5500",
        records: 4,
      }),
    },
    comparison: {
      current: summaryActual,
      previous: totals({
        incomeArs: "300000",
        expenseArs: "70000",
        resultArs: "230000",
        incomeUsd: "12000",
        expenseUsd: "1500",
        resultUsd: "10500",
        records: 7,
      }),
      incomeArs: "7.82",
      expenseArs: "4.94",
      resultArs: "8.70",
      incomeUsd: "4.73",
      expenseUsd: "4.47",
      resultUsd: "4.76",
    },
    monthly: [
      {
        monthKey: "2026-05",
        label: "mayo de 2026",
        range: { from: "2026-05-01", to: "2026-05-31" },
        actual: mayActual,
        pending: totals(),
        projected: totals({ expenseArs: "3456", expenseUsd: "67", records: 1 }),
        expected: totals({
          incomeArs: "123456",
          expenseArs: "26912",
          resultArs: "96544",
          incomeUsd: "4567",
          expenseUsd: "634",
          resultUsd: "3933",
          records: 5,
        }),
        chart: {
          incomeArsPercent: "61.73",
          expenseArsPercent: "46.91",
          incomeUsdPercent: "57.09",
          expenseUsdPercent: "56.70",
        },
      },
      {
        monthKey: "2026-06",
        label: "junio de 2026",
        range: { from: "2026-06-01", to: "2026-06-30" },
        actual: juneActual,
        pending: totals(),
        projected: totals({ expenseArs: "5000", expenseUsd: "200", records: 1 }),
        expected: totals({
          incomeArs: "200000",
          expenseArs: "55000",
          resultArs: "145000",
          incomeUsd: "8000",
          expenseUsd: "1200",
          resultUsd: "6800",
          records: 5,
        }),
        chart: {
          incomeArsPercent: "100",
          expenseArsPercent: "100",
          incomeUsdPercent: "100",
          expenseUsdPercent: "100",
        },
      },
    ],
    categories: [
      {
        id: "cat-food",
        name: "Alimentos",
        amountArs: "50000",
        amountUsd: "1000",
        shareArs: "68.07",
        shareUsd: "63.82",
        records: 4,
      },
      {
        id: "cat-services",
        name: "Servicios",
        amountArs: "23456",
        amountUsd: "567",
        shareArs: "31.93",
        shareUsd: "36.18",
        records: 4,
      },
    ],
    sources: [
      {
        sourceType: "manual_cash",
        label: "Movimientos manuales",
        amountArs: "73456",
        amountUsd: "1567",
        shareArs: "100",
        shareUsd: "100",
        records: 8,
      },
    ],
    cardDebt: [],
    recurringIncome: [],
    dataQuality: {
      totalRecords: 8,
      actualRecords: 8,
      pendingRecords: 0,
      projectedRecords: 2,
      unclassifiedRecords: 0,
      currencies: { arsRecords: 4, usdRecords: 4 },
    },
  };
}

async function openReports(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Reportes$/i }).click();
  const section = page.getByTestId("reports-section");
  await expect(section).toBeVisible();
  return section;
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

    const section = await openReports(page);
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

    const month = section.locator('[data-testid^="reports-month-"]').last();
    await month.getByRole("button", { name: /Abrir egresos/i }).click();
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

test("Reportes mantiene paridad exacta entre payload, gráficos y tablas ARS/USD", async ({
  page,
}) => {
  const fixture = reportsFixture();
  await page.route("**/api/reports?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    });
  });

  const section = await openReports(page);

  await expect(section.getByTestId("reports-currency-ars")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const mayBars = section.getByTestId("reports-month-2026-05");
  await expect(mayBars).toHaveAttribute("data-currency", "ARS");
  await expect(mayBars).toHaveAttribute("data-income-raw", "123456");
  await expect(mayBars).toHaveAttribute("data-expense-raw", "23456");
  await expect(mayBars).toHaveAttribute("data-projected-raw", "3456");
  await expect(mayBars).toHaveAttribute("data-balance-raw", "100000");

  await section
    .getByTestId("reports-evolution-data-table")
    .locator("summary")
    .click();
  const mayTable = section.getByTestId("reports-table-month-2026-05");
  await expect(mayTable).toHaveAttribute("data-currency", "ARS");
  await expect(mayTable).toHaveAttribute("data-income-raw", "123456");
  await expect(mayTable).toHaveAttribute("data-expense-raw", "23456");
  await expect(mayTable).toHaveAttribute("data-projected-raw", "3456");
  await expect(mayTable).toHaveAttribute("data-balance-raw", "100000");

  const categoryList = section.getByTestId("reports-category-cat-food");
  await expect(categoryList).toHaveAttribute("data-currency", "ARS");
  await expect(categoryList).toHaveAttribute("data-amount-raw", "50000");
  await expect(categoryList).toHaveAttribute("data-share-raw", "68.07");
  const categoryTable = section.getByTestId(
    "reports-category-table-row-cat-food",
  );
  await expect(categoryTable).toHaveAttribute("data-currency", "ARS");
  await expect(categoryTable).toHaveAttribute("data-amount-raw", "50000");
  await expect(categoryTable).toHaveAttribute("data-share-raw", "68.07");

  await section.getByTestId("reports-currency-usd").click();
  await expect(section.getByTestId("reports-currency-usd")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(mayBars).toHaveAttribute("data-currency", "USD");
  await expect(mayBars).toHaveAttribute("data-income-raw", "4567");
  await expect(mayBars).toHaveAttribute("data-expense-raw", "567");
  await expect(mayBars).toHaveAttribute("data-projected-raw", "67");
  await expect(mayBars).toHaveAttribute("data-balance-raw", "4000");
  await expect(mayTable).toHaveAttribute("data-currency", "USD");
  await expect(mayTable).toHaveAttribute("data-income-raw", "4567");
  await expect(categoryList).toHaveAttribute("data-currency", "USD");
  await expect(categoryList).toHaveAttribute("data-amount-raw", "1000");
  await expect(categoryList).toHaveAttribute("data-share-raw", "63.82");
  await expect(categoryTable).toHaveAttribute("data-currency", "USD");
  await expect(categoryTable).toHaveAttribute("data-amount-raw", "1000");
  await expect(categoryTable).toHaveAttribute("data-share-raw", "63.82");

  await section.getByTestId("reports-evolution-mode-area").click();
  await expect(
    section.getByRole("img", {
      name: /Evolución mensual de ingresos, egresos y compromisos proyectados en USD/,
    }),
  ).toBeVisible();

  await section.getByTestId("reports-category-mode-donut").click();
  await expect(
    section.getByTestId("reports-category-donut-usd"),
  ).toBeVisible();
  await expect(
    section.getByTestId("reports-category-donut-ars"),
  ).toHaveCount(0);

  await section.getByTestId("reports-currency-ars").click();
  await expect(
    section.getByTestId("reports-category-donut-ars"),
  ).toBeVisible();
  await expect(
    section.getByTestId("reports-category-donut-usd"),
  ).toHaveCount(0);

  await section.getByTestId("reports-evolution-mode-bars").click();
  await section
    .getByTestId("reports-month-2026-05")
    .getByRole("button", { name: "Abrir egresos de mayo de 2026" })
    .click();
  await expect(page.getByTestId("movements-section")).toBeVisible();
  await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
    "mayo de 2026 · Egresos",
  );
});
