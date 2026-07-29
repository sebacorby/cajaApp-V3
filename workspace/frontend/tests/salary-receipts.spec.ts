import { expect, test } from "@playwright/test";

const preview = {
  version: "salary-receipt-v1" as const,
  documentType: "salary_receipt_pdf" as const,
  source: {
    employerName: "Empresa E2E SA",
    employerTaxId: "30-00000000-0",
    employeeName: "Persona E2E",
    employeeTaxId: "20-00000000-0",
    periodMonthKey: "2026-06",
    payDate: "2026-07-04",
    currency: "ARS" as const,
  },
  summary: {
    grossAmount: "1450000.00",
    deductionsAmount: "246500.00",
    netAmount: "1203500.00",
  },
  items: [
    {
      id: "concept-1",
      displayOrder: 1,
      kind: "earning" as const,
      code: "001",
      label: "Sueldo básico",
      amount: "1450000.00",
      sourcePage: 1,
      originalText: "Sueldo básico 1.450.000,00",
      confidence: 0.99,
    },
    {
      id: "concept-2",
      displayOrder: 2,
      kind: "deduction" as const,
      code: "501",
      label: "Descuentos",
      amount: "246500.00",
      sourcePage: 1,
      originalText: "Descuentos 246.500,00",
      confidence: 0.99,
    },
  ],
  warnings: [],
};

function emptyOverview() {
  const current = new Date();
  const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  return {
    range: { from: monthKey, to: monthKey },
    currentMonthKey: monthKey,
    summary: {
      totalArs: "0", totalUsd: "0", recurringArs: "0", recurringUsd: "0",
      oneOffArs: "0", oneOffUsd: "0", recurringSources: 0, oneOffCount: 0,
    },
    sources: [],
    months: [],
  };
}

test("Recibos de sueldo permite revisar y aceptar un borrador desde Ingresos", async ({ page }) => {
  let accepted = false;
  const draft = {
    id: "11111111-1111-4111-8111-111111111111",
    status: "preview_ready",
    preview,
    document: {
      id: "22222222-2222-4222-8222-222222222222",
      fileName: "recibo-e2e.pdf",
      pageCount: 1,
      sha256: "a".repeat(64),
    },
    aiRun: {
      id: "33333333-3333-4333-8333-333333333333",
      status: "completed",
      modelProvider: "ollama",
      modelName: "test-model",
      completedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.route("**/api/incomes/overview?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyOverview()) });
  });
  await page.route("**/api/salary-receipts?limit=12", async (route) => {
    const records = accepted ? [{
      id: "44444444-4444-4444-8444-444444444444",
      status: "accepted",
      historyKey: "e2e",
      version: 1,
      isActiveForPeriod: true,
      employerName: preview.source.employerName,
      employerTaxId: preview.source.employerTaxId,
      employeeName: preview.source.employeeName,
      employeeTaxId: preview.source.employeeTaxId,
      periodMonthKey: preview.source.periodMonthKey,
      payDate: preview.source.payDate,
      currency: preview.source.currency,
      grossAmount: preview.summary.grossAmount,
      deductionsAmount: preview.summary.deductionsAmount,
      netAmount: preview.summary.netAmount,
      sourceId: null,
      actualIncomeEventId: "55555555-5555-4555-8555-555555555555",
      projectionIncomeEventId: "66666666-6666-4666-8666-666666666666",
      acceptedAt: new Date().toISOString(),
      reversedAt: null,
      document: draft.document,
    }] : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(records) });
  });
  await page.route("**/api/salary-receipts/import", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(draft) });
  });
  await page.route(`**/api/salary-receipts/drafts/${draft.id}`, async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...draft, preview: body }) });
  });
  await page.route(`**/api/salary-receipts/drafts/${draft.id}/accept`, async (route) => {
    accepted = true;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "44444444-4444-4444-8444-444444444444",
        status: "accepted",
        historyKey: "e2e",
        version: 1,
        isActiveForPeriod: true,
        employerName: preview.source.employerName,
        employerTaxId: preview.source.employerTaxId,
        employeeName: preview.source.employeeName,
        employeeTaxId: preview.source.employeeTaxId,
        periodMonthKey: preview.source.periodMonthKey,
        payDate: preview.source.payDate,
        currency: preview.source.currency,
        grossAmount: preview.summary.grossAmount,
        deductionsAmount: preview.summary.deductionsAmount,
        netAmount: preview.summary.netAmount,
        sourceId: null,
        actualIncomeEventId: "55555555-5555-4555-8555-555555555555",
        projectionIncomeEventId: "66666666-6666-4666-8666-666666666666",
        acceptedAt: new Date().toISOString(),
        reversedAt: null,
        document: draft.document,
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /^Ingresos$/i }).click();
  await expect(page.getByTestId("salary-receipts-panel")).toBeVisible();

  await page.getByTestId("salary-receipt-file").setInputFiles({
    name: "recibo-e2e.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 E2E"),
  });
  await expect(page.getByTestId("salary-receipt-preview")).toContainText("Empresa E2E SA");
  await expect(page.getByTestId("salary-receipt-preview")).toContainText("Sueldo básico");
  await page.getByTestId("accept-salary-receipt").click();
  await expect(page.getByText(/Recibo 2026-06 aceptado/i)).toBeVisible();
  await expect(page.getByText(/Empresa E2E SA/).last()).toBeVisible();
});
