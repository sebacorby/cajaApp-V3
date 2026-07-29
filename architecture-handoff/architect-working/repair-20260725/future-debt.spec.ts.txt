import { expect, test, type Page, type Route } from "@playwright/test";

// Future-debt BDD smoke tests for the frontend slice.
// These tests cover the locked contract surfaced by GET /api/future-debt.
// Each test uses route interception (no real backend) and mounts the
// FutureDebtView via the test fixture page at /test/future-debt, which
// keeps the production section router untouched.

const TEST_URL = "/test/future-debt";

interface FutureDebtRow {
  id: string;
  monthKey: string;
  description: string;
  installmentNumber: number;
  installmentTotal: number;
  installmentLabel: string;
  amount: string;
  currency: "ARS" | "USD";
  originType: "card_statement" | "manual_card_purchase";
  originReference: string;
  sourceLabel: string;
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  status: "confirmed" | "estimated";
  rowType: "future_installment";
}

interface FutureDebtCard {
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  rows: FutureDebtRow[];
  totals: { ars: string; usd: string };
}

interface FutureDebtMonth {
  monthKey: string;
  label: string;
  totals: { ars: string; usd: string };
  cards: FutureDebtCard[];
  dataQuality: { status: "complete" | "partial"; warnings: string[] };
}

interface FutureDebtResponse {
  range: {
    from: string;
    to: string;
    months: number;
    includeCurrentPeriod: boolean;
    currentPeriodKey: string | null;
  };
  summary: { ars: string; usd: string };
  horizon: { persisted: boolean; persistedMonths: string[] };
  months: FutureDebtMonth[];
  pendientes: {
    rows: Array<{
      id: string;
      monthKey: string;
      description: string;
      installmentNumber: number | null;
      installmentTotal: number | null;
      installmentLabel: string;
      amount: string;
      currency: "ARS" | "USD" | null;
      originType: "card_statement" | "manual_card_purchase";
      originReference: string;
      sourceLabel: string;
      cardId: string | null;
      cardLast4: string | null;
      holderName: string | null;
      cardLabel: string | null;
      status: "confirmed" | "estimated";
      rowType: "future_installment";
      diagnostic: string;
      diagnosticDetail: string;
    }>;
    diagnostics: string[];
  };
  diagnostics: {
    duplicateOccurrences: number;
    invalidInstallmentRows: number;
    missingCurrencyRows: number;
    missingCardRows: number;
    warnings: string[];
  };
}

function buildResponse(overrides: Partial<FutureDebtResponse> = {}): FutureDebtResponse {
  return {
    range: {
      from: "2026-08",
      to: "2027-01",
      months: 6,
      includeCurrentPeriod: false,
      currentPeriodKey: "2026-07",
    },
    summary: { ars: "95000.00", usd: "40.00" },
    horizon: {
      persisted: true,
      persistedMonths: ["2026-08", "2026-09", "2026-10"],
    },
    months: [],
    pendientes: { rows: [], diagnostics: [] },
    diagnostics: {
      duplicateOccurrences: 0,
      invalidInstallmentRows: 0,
      missingCurrencyRows: 0,
      missingCardRows: 0,
      warnings: [],
    },
    ...overrides,
  };
}

function buildRow(overrides: Partial<FutureDebtRow> = {}): FutureDebtRow {
  return {
    id: "row-1",
    monthKey: "2026-08",
    description: "Compra presencial",
    installmentNumber: 2,
    installmentTotal: 3,
    installmentLabel: "2/3",
    amount: "10000.00",
    currency: "ARS",
    originType: "card_statement",
    originReference: "stmt-1",
    sourceLabel: "Visa Galicia •••• 1234",
    cardId: "stmt-1:group-1",
    cardLast4: "1234",
    holderName: "JAVI",
    cardLabel: "Visa Galicia •••• 1234",
    status: "confirmed",
    rowType: "future_installment",
    ...overrides,
  };
}

function buildCard(overrides: Partial<FutureDebtCard> = {}): FutureDebtCard {
  return {
    cardId: "stmt-1:group-1",
    cardLast4: "1234",
    holderName: "JAVI",
    cardLabel: "Visa Galicia •••• 1234",
    rows: [buildRow()],
    totals: { ars: "10000.00", usd: "0.00" },
    ...overrides,
  };
}

function buildMonth(overrides: Partial<FutureDebtMonth> = {}): FutureDebtMonth {
  return {
    monthKey: "2026-08",
    label: "Agosto 2026",
    totals: { ars: "10000.00", usd: "0.00" },
    cards: [buildCard()],
    dataQuality: { status: "complete", warnings: [] },
    ...overrides,
  };
}

async function interceptSettings(page: Page): Promise<void> {
  // AppPreferencesProvider fetches /api/settings on mount. Provide a fixture
  // payload so the provider does not block the test page with a loading state.
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
        updatedAt: "2026-07-24T00:00:00.000Z",
      }),
    });
  });
}

interface TrackedRequests {
  futureDebt: string[];
}

function startTrackingRequests(page: Page): TrackedRequests {
  const tracked: TrackedRequests = { futureDebt: [] };
  page.on("request", (request) => {
    if (request.url().includes("/api/future-debt")) {
      tracked.futureDebt.push(request.url());
    }
  });
  return tracked;
}

async function interceptFutureDebt(
  page: Page,
  build: () => FutureDebtResponse,
): Promise<TrackedRequests> {
  const tracked = startTrackingRequests(page);
  await interceptSettings(page);
  await page.route("**/api/future-debt**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(build()),
    });
  });
  return tracked;
}

test("FEAT-016 — renders horizon selector and defaults to 6 months", async ({ page }) => {
  const tracked = await interceptFutureDebt(page, () => buildResponse({
    months: [
      buildMonth({
        monthKey: "2026-08",
        label: "Agosto 2026",
        totals: { ars: "10000.00", usd: "0.00" },
      }),
    ],
  }));

  await page.goto(TEST_URL);

  const section = page.getByTestId("future-debt-section");
  await expect(section).toBeVisible();

  const horizon = page.getByTestId("future-debt-horizon");
  await expect(horizon).toBeVisible();
  await expect(horizon).toContainText("6 meses");

  // The first request to the endpoint must include the locked parameters
  // (months=6, includeCurrentPeriod=false) — never a "horizon" alias.
  expect(tracked.futureDebt.length).toBeGreaterThan(0);
  const firstUrl = new URL(tracked.futureDebt[0]);
  expect(firstUrl.searchParams.get("months")).toBe("6");
  expect(firstUrl.searchParams.get("includeCurrentPeriod")).toBe("false");
  expect(firstUrl.searchParams.has("horizon")).toBe(false);
});

test("FEAT-018 — renders ARS and USD totals separately, never combined", async ({ page }) => {
  await interceptFutureDebt(page, () => buildResponse({
    summary: { ars: "10000.00", usd: "40.00" },
    months: [
      buildMonth({
        monthKey: "2026-08",
        label: "Agosto 2026",
        totals: { ars: "10000.00", usd: "40.00" },
        cards: [
          buildCard({
            cardId: "stmt-1:group-1",
            cardLast4: "1234",
            cardLabel: "Visa Galicia •••• 1234",
            holderName: "JAVI",
            totals: { ars: "10000.00", usd: "0.00" },
            rows: [buildRow({ amount: "10000.00", currency: "ARS" })],
          }),
          buildCard({
            cardId: "stmt-2:group-1",
            cardLast4: "5678",
            cardLabel: "Mastercard •••• 5678",
            holderName: "JAVI",
            totals: { ars: "0.00", usd: "40.00" },
            rows: [
              buildRow({
                id: "row-usd",
                amount: "40.00",
                currency: "USD",
                originReference: "stmt-2",
                cardId: "stmt-2:group-1",
                cardLast4: "5678",
                cardLabel: "Mastercard •••• 5678",
              }),
            ],
          }),
        ],
      }),
    ],
  }));

  await page.goto(TEST_URL);
  await expect(page.getByTestId("future-debt-section")).toBeVisible();

  // Summary chips must each carry a single currency and never combine.
  const summaryArs = page.getByTestId("future-debt-summary-ars");
  const summaryUsd = page.getByTestId("future-debt-summary-usd");
  await expect(summaryArs).toHaveAttribute("data-currency", "ARS");
  await expect(summaryUsd).toHaveAttribute("data-currency", "USD");

  // The month panel must expose each currency separately.
  const month = page.getByTestId("future-debt-month");
  await expect(month.getByTestId("future-debt-month-total-ars")).toBeVisible();
  await expect(month.getByTestId("future-debt-month-total-usd")).toBeVisible();

  // ARS and USD cards must each render their own row count.
  const cards = page.getByTestId("future-debt-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).getByTestId("future-debt-card-total-ars")).toHaveAttribute(
    "data-currency-ars",
    "10000.00",
  );
  await expect(cards.nth(0).getByTestId("future-debt-card-total-usd")).toHaveAttribute(
    "data-currency-usd",
    "0.00",
  );
  await expect(cards.nth(1).getByTestId("future-debt-card-total-ars")).toHaveAttribute(
    "data-currency-ars",
    "0.00",
  );
  await expect(cards.nth(1).getByTestId("future-debt-card-total-usd")).toHaveAttribute(
    "data-currency-usd",
    "40.00",
  );

  // The rendered text must never show a combined "10040.00" total.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("10040");
});

test("FEAT-016 — shows empty state when no debt exists", async ({ page }) => {
  await interceptFutureDebt(page, () => buildResponse({
    range: {
      from: "2026-08",
      to: "2027-01",
      months: 6,
      includeCurrentPeriod: false,
      currentPeriodKey: null,
    },
    summary: { ars: "0.00", usd: "0.00" },
    horizon: { persisted: false, persistedMonths: [] },
    months: [],
    pendientes: { rows: [], diagnostics: [] },
    diagnostics: {
      duplicateOccurrences: 0,
      invalidInstallmentRows: 0,
      missingCurrencyRows: 0,
      missingCardRows: 0,
      warnings: [],
    },
  }));

  await page.goto(TEST_URL);
  await expect(page.getByTestId("future-debt-section")).toBeVisible();

  const empty = page.getByTestId("future-debt-empty");
  await expect(empty).toBeVisible();
  await expect(empty).toContainText(
    "No hay deuda futura confirmada para el horizonte seleccionado",
  );
  // The wire payload carries the zero decimals; the rendered summary must
  // mirror them as formatted currency strings. The summary panels include
  // both the label ("Total ARS"/"Total USD") and the formatted value.
  await expect(page.getByTestId("future-debt-summary-ars")).toContainText("$ 0,00");
  await expect(page.getByTestId("future-debt-summary-usd")).toContainText("0,00");
  await expect(page.getByTestId("future-debt-months")).toHaveCount(0);
});

test("FEAT-020 — renders pendientes section separately from main list", async ({ page }) => {
  await interceptFutureDebt(page, () => buildResponse({
    summary: { ars: "10000.00", usd: "0.00" },
    months: [
      buildMonth({
        monthKey: "2026-08",
        label: "Agosto 2026",
        totals: { ars: "10000.00", usd: "0.00" },
      }),
    ],
    pendientes: {
      rows: [
        {
          id: "pending-1",
          monthKey: "2026-08",
          description: "Fila sin tarjeta",
          installmentNumber: 2,
          installmentTotal: 3,
          installmentLabel: "2/3",
          amount: "5000.00",
          currency: "ARS",
          originType: "card_statement",
          originReference: "stmt-orphan",
          sourceLabel: "Resumen aceptado",
          cardId: null,
          cardLast4: null,
          holderName: null,
          cardLabel: null,
          status: "confirmed",
          rowType: "future_installment",
          diagnostic: "missing_card_reference",
          diagnosticDetail: "El resumen aceptado no tiene un grupo-tarjeta identificable.",
        },
      ],
      diagnostics: ["missing_card_reference"],
    },
    diagnostics: {
      duplicateOccurrences: 0,
      invalidInstallmentRows: 0,
      missingCurrencyRows: 0,
      missingCardRows: 1,
      warnings: [],
    },
  }));

  await page.goto(TEST_URL);
  await expect(page.getByTestId("future-debt-section")).toBeVisible();

  // Pending rows must be visually distinct from the visible months.
  const pendientes = page.getByTestId("future-debt-pendientes");
  await expect(pendientes).toBeVisible();
  await expect(pendientes.getByTestId("future-debt-pending-row")).toHaveCount(1);
  await expect(pendientes.getByTestId("future-debt-pending-diagnostic")).toHaveText(
    "missing_card_reference",
  );

  // The pending amount must not contaminate the ARS summary.
  const summaryArs = page.getByTestId("future-debt-summary-ars");
  await expect(summaryArs).toContainText("10.000,00");

  // Diagnostics panel must show the missing-card counter.
  const diagnostics = page.getByTestId("future-debt-diagnostics");
  await expect(diagnostics).toBeVisible();
  await expect(
    page.getByTestId("future-debt-diagnostics-missing-card"),
  ).toContainText("1");
});

test("FEAT-021 — include-current-period toggle shows current period rows", async ({ page }) => {
  let currentRequest: URL | null = null;
  let includeCurrentPeriodInResponse = false;
  let requestCount = 0;

  await interceptSettings(page);
  await page.route("**/api/future-debt**", async (route: Route) => {
    currentRequest = new URL(route.request().url());
    requestCount += 1;
    const months: FutureDebtMonth[] = includeCurrentPeriodInResponse
      ? [
          buildMonth({
            monthKey: "2026-07",
            label: "Julio 2026",
            totals: { ars: "5000.00", usd: "0.00" },
          }),
          buildMonth({
            monthKey: "2026-08",
            label: "Agosto 2026",
            totals: { ars: "10000.00", usd: "0.00" },
          }),
        ]
      : [
          buildMonth({
            monthKey: "2026-08",
            label: "Agosto 2026",
            totals: { ars: "10000.00", usd: "0.00" },
          }),
        ];
    const response = buildResponse({
      range: {
        from: "2026-07",
        to: "2026-12",
        months: 6,
        includeCurrentPeriod: includeCurrentPeriodInResponse,
        currentPeriodKey: "2026-07",
      },
      summary: {
        ars: includeCurrentPeriodInResponse ? "15000.00" : "10000.00",
        usd: "0.00",
      },
      horizon: { persisted: true, persistedMonths: ["2026-07", "2026-08"] },
      months,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  // Initial request: current period hidden. The route handler above uses the
  // `includeCurrentPeriodInResponse` flag (false on first call) to render a
  // single month. After we click the toggle, the flag flips and the next
  // request returns the second-month response.
  await page.goto(TEST_URL);
  await expect(page.getByTestId("future-debt-section")).toBeVisible();
  await expect(page.getByTestId("future-debt-month")).toHaveCount(1);
  await expect(page.getByTestId("future-debt-month").first()).toHaveAttribute(
    "data-month-key",
    "2026-08",
  );

  // Flip the response flag so the next request renders the current period.
  includeCurrentPeriodInResponse = true;
  const requestsBeforeToggle = requestCount;

  // Toggle the include-current-period checkbox and verify the next request
  // sends includeCurrentPeriod=true and the current period row appears.
  await page.getByTestId("future-debt-include-current-period").click();
  await expect(page.getByTestId("future-debt-month")).toHaveCount(2);

  expect(requestCount).toBeGreaterThan(requestsBeforeToggle);
  expect(currentRequest?.searchParams.get("includeCurrentPeriod")).toBe("true");
  expect(currentRequest?.searchParams.get("months")).toBe("6");

  const monthKeys = await page
    .getByTestId("future-debt-month")
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).getAttribute("data-month-key")));
  expect(monthKeys).toEqual(["2026-07", "2026-08"]);
});
