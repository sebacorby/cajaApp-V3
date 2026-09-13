import { expect, test } from "@playwright/test";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


test("crea un objetivo, registra un aporte y limpia los datos UAT", async ({
  page,
  request,
}) => {
  const name = `UAT objetivo ${Date.now()}`;


  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Objetivos", exact: true }).click();
    await expect(page.getByTestId("goals-section")).toBeVisible();
    await expect(
      page.getByText("no descuentan dinero del ledger", { exact: false }),
    ).toBeVisible();


    await page.getByTestId("new-goal").click();
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Importe objetivo").fill("100000");
    await page.getByRole("button", { name: "Crear objetivo" }).click();
    await expect(page.getByText(name)).toBeVisible();


    const goalCard = page
      .locator("[data-goal-name]")
      .filter({ hasText: name })
      .first();
    await goalCard.getByRole("button", { name: "Aporte" }).click();
    await page.getByLabel("Importe (ARS)").fill("25000");
    await page.getByRole("button", { name: "Registrar aporte" }).click();
    await expect(
      page.getByText("No se modificó el saldo general", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("25.00%", { exact: true })).toBeVisible();


    const overviewResponse = await request.get(
      `${API_BASE_URL}/api/goals/overview?status=active&limit=20`,
    );
    const overviewBody = await overviewResponse.text();
    expect(overviewResponse.ok(), overviewBody).toBeTruthy();
    const overview = JSON.parse(overviewBody) as {
      participantCount: number;
      statusCounts: Record<string, number>;
      currencies: {
        ARS: {
          targetAmount: string;
          contributedAmount: string;
          remainingAmount: string;
        };
      };
      featuredGoals: Array<{
        name: string;
        progressPercent: string;
        contributedAmount: string;
      }>;
    };
    expect(overview.participantCount).toBeGreaterThanOrEqual(1);
    expect(overview.statusCounts.active).toBeGreaterThanOrEqual(1);
    expect(
      overview.featuredGoals.some(
        (goal) =>
          goal.name === name
          && goal.progressPercent === "25.00"
          && goal.contributedAmount === "25.000,00",
      ),
    ).toBe(true);


    const summary = page.getByTestId("goals-overview");
    await expect(summary).toBeVisible();
    await expect(summary.getByTestId("goal-overview-ars")).toBeVisible();
    await expect(summary).toContainText("Meta total");
    await expect(summary).toContainText("Aportado");
    await expect(summary).toContainText("Restante");
  } finally {
    const response = await request.get(`${API_BASE_URL}/api/goals`);
    expect(response.ok()).toBeTruthy();
    const goals = (await response.json()) as Array<{
      id: string;
      name: string;
    }>;
    for (const goal of goals.filter((item) => item.name === name)) {
      const cleanup = await request.delete(
        `${API_BASE_URL}/api/goals/${goal.id}`,
      );
      expect(cleanup.ok()).toBeTruthy();
    }


    const verification = await request.get(`${API_BASE_URL}/api/goals`);
    expect(verification.ok()).toBeTruthy();
    const remaining = (await verification.json()) as Array<{ name: string }>;
    expect(remaining.some((item) => item.name === name)).toBe(false);
  }
});