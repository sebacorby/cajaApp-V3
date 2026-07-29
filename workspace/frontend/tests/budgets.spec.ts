import { expect, test } from "@playwright/test";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


test("crea un presupuesto real, muestra el resumen autoritativo y limpia los datos UAT", async ({
  page,
  request,
}) => {
  const period = "2099-12";


  const cleanupPeriod = async (): Promise<void> => {
    const response = await request.get(
      `${API_BASE_URL}/api/budgets?from=${period}&to=${period}`,
    );
    if (!response.ok()) return;
    const budgets = (await response.json()) as Array<{
      id: string;
      periodStart: string;
      periodEnd: string;
    }>;
    for (const item of budgets.filter(
      (budget) => budget.periodStart === period && budget.periodEnd === period,
    )) {
      const cleanup = await request.delete(
        `${API_BASE_URL}/api/budgets/${item.id}`,
      );
      expect(cleanup.ok()).toBeTruthy();
    }
  };


  await cleanupPeriod();


  try {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Presupuestos", exact: true })
      .click();
    const section = page.getByTestId("budgets-section");
    await expect(section).toBeVisible();
    await expect(
      section.getByText("atención desde 80%", { exact: false }),
    ).toBeVisible();


    await section.getByTestId("new-budget").click();
    const editor = section.getByTestId("budget-editor");
    await expect(editor).toBeVisible();


    await editor.getByRole("combobox").nth(0).click();
    await page.getByRole("option").first().click();
    await editor.getByLabel("Desde").fill(period);
    await editor.getByLabel("Hasta").fill(period);
    await editor.getByLabel("Límite").fill("100000");
    await editor.getByRole("button", { name: "Crear presupuesto" }).click();
    await expect(section.getByText("Presupuesto creado.")).toBeVisible();


    const overviewResponse = await request.get(
      `${API_BASE_URL}/api/budgets/overview?from=${period}&to=${period}&status=active`,
    );
    expect(
      overviewResponse.ok(),
      await overviewResponse.text(),
    ).toBeTruthy();
    const overview = (await overviewResponse.json()) as {
      participantCount: number;
      currencies: {
        ARS: {
          budgetCount: number;
          effectiveLimit: string;
          spent: string;
          available: string;
          exceeded: string;
        };
        USD: { budgetCount: number };
      };
    };
    expect(overview.participantCount).toBe(1);
    expect(overview.currencies.ARS.budgetCount).toBe(1);
    expect(overview.currencies.USD.budgetCount).toBe(0);


    await section.getByTestId("budget-summary-month").fill(period);
    await section.getByTestId("budget-status-filter").click();
    await page.getByRole("option", { name: "Activos" }).click();


    const summary = section.getByTestId("budget-overview");
    await expect(summary).toBeVisible();
    await expect(
      summary.getByTestId("budget-overview-ars"),
    ).toContainText("100.000,00");
    await expect(summary).toContainText("1 participantes");
    await expect(summary).toContainText("0 excedidos");


    const response = await request.get(
      `${API_BASE_URL}/api/budgets?from=${period}&to=${period}`,
    );
    expect(response.ok()).toBeTruthy();
    const budgets = (await response.json()) as Array<{
      id: string;
      periodStart: string;
      periodEnd: string;
    }>;
    expect(
      budgets.some(
        (item) => item.periodStart === period && item.periodEnd === period,
      ),
    ).toBe(true);
  } finally {
    await cleanupPeriod();
    const verification = await request.get(
      `${API_BASE_URL}/api/budgets?from=${period}&to=${period}`,
    );
    expect(verification.ok()).toBeTruthy();
    const remaining = (await verification.json()) as Array<{
      periodStart: string;
      periodEnd: string;
    }>;
    expect(
      remaining.some(
        (item) => item.periodStart === period && item.periodEnd === period,
      ),
    ).toBe(false);
  }
});