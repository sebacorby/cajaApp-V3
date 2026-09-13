import { expect, test } from "@playwright/test";




const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";




function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return { from: toIso(first), to: toIso(last) };
}




function formatRate(value: string): string {
  return `${value.replace(".", ",")}%`;
}




test.describe("Dashboard real", () => {
  test("muestra movimientos reales del ledger y separa compromisos", async ({ page, request }) => {
    const suffix = Date.now();
    const range = currentMonthRange();
    const occurredOn = range.to;
    const incomeDescription = `Ingreso dashboard E2E ${suffix}`;
    const projectedDescription = `Compromiso dashboard E2E ${suffix}`;
    const createdIds: string[] = [];




    try {
      const incomeResponse = await request.post(`${API_BASE_URL}/api/movements/manual`, {
        data: {
          occurredOn,
          type: "income",
          sourceType: "manual_income",
          description: incomeDescription,
          currency: "ARS",
          amount: "12345,67",
          status: "actual",
          notes: "Prueba Dashboard",
        },
      });
      expect(incomeResponse.ok()).toBeTruthy();
      const income = await incomeResponse.json() as { sourceId: string };
      createdIds.push(income.sourceId);




      const commitmentResponse = await request.post(`${API_BASE_URL}/api/movements/manual`, {
        data: {
          occurredOn,
          type: "expense",
          sourceType: "manual_unexpected",
          description: projectedDescription,
          currency: "USD",
          amount: "25.50",
          status: "pending",
          notes: "Prueba Dashboard",
        },
      });
      expect(commitmentResponse.ok()).toBeTruthy();
      const commitment = await commitmentResponse.json() as { sourceId: string };
      createdIds.push(commitment.sourceId);




      const dashboardResponse = await request.get(
        `${API_BASE_URL}/api/dashboard?from=${range.from}&to=${range.to}`,
      );
      const dashboardBody = await dashboardResponse.text();
      expect(dashboardResponse.ok(), dashboardBody).toBeTruthy();
      const dashboard = JSON.parse(dashboardBody) as {
        summary: {
          actual: {
            balanceArs: string;
            savingsRateArs: string | null;
          };
        };
      };
      expect(dashboard.summary.actual.savingsRateArs).not.toBeNull();




      await page.goto("/");
      await expect(page.getByTestId("dashboard-section")).toBeVisible();
      await expect(page.getByText("Resumen financiero", { exact: true })).toBeVisible();
      await expect(page.getByText(incomeDescription, { exact: true })).toBeVisible();
      await expect(page.getByText(projectedDescription, { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Balance realizado", { exact: true })).toBeVisible();
      await expect(page.getByText("Balance esperado", { exact: true })).toBeVisible();




      const savings = page.getByTestId("dashboard-savings");
      await expect(savings).toBeVisible();
      await expect(savings.getByText("Resultado realizado y tasa de ahorro", { exact: true })).toBeVisible();
      await expect(savings.getByTestId("dashboard-savings-ars-amount")).not.toHaveText("");
      await expect(savings.getByTestId("dashboard-savings-ars-rate")).toHaveText(
        `Tasa de ahorro: ${formatRate(dashboard.summary.actual.savingsRateArs!)}`,
      );




      const budgetSummary = page.getByTestId("dashboard-budgets");
      await expect(budgetSummary).toBeVisible();
      await expect(
        budgetSummary.getByText("Presupuestos activos", { exact: true }),
      ).toBeVisible();
      await budgetSummary
        .getByRole("button", { name: /presupuesto/i })
        .click();
      await expect(page.getByTestId("budgets-section")).toBeVisible();




      await page.getByRole("button", { name: /^Inicio$/i }).click();
      const goalsSummary = page.getByTestId("dashboard-goals");
      await expect(goalsSummary).toBeVisible();
      await expect(
        goalsSummary.getByText("Objetivos activos", { exact: true }),
      ).toBeVisible();
      await goalsSummary
        .getByRole("button", { name: /objetivo/i })
        .click();
      await expect(page.getByTestId("goals-section")).toBeVisible();


      await page.getByRole("button", { name: /^Inicio$/i }).click();
      await expect(page.getByTestId("dashboard-savings")).toBeVisible();
      await page
        .getByTestId("dashboard-savings")
        .getByRole("button", { name: "Ver movimientos del período" })
        .click();
      await expect(page.getByTestId("movements-section")).toBeVisible();
      await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
        "Resultado realizado del período",
      );
    } finally {
      for (const movementId of createdIds) {
        await request.delete(`${API_BASE_URL}/api/movements/manual/${movementId}`);
      }
    }
  });
});