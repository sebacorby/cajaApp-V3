import { expect, test } from "@playwright/test";


const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";


type CreatedMovement = { sourceId: string };


function datePartsInTucuman(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}


function monthInfo(offset = 0): { monthKey: string; first: string; last: string; sample: string } {
  const current = datePartsInTucuman();
  const date = new Date(Date.UTC(current.year, current.month - 1 + offset, 1));
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    monthKey,
    first: `${monthKey}-01`,
    last: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
    sample: `${monthKey}-${String(Math.min(10, lastDay)).padStart(2, "0")}`,
  };
}


test("Salud financiera conserva fórmula, evidencia, navegación e historial", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const current = monthInfo(0);
  const previous = monthInfo(-1);
  const suffix = Date.now();
  const movementIds: string[] = [];
  let snapshotId: string | null = null;


  async function createMovement(input: {
    occurredOn: string;
    type: "income" | "expense";
    amount: string;
    label: string;
  }): Promise<void> {
    const response = await request.post(`${API_BASE_URL}/api/movements/manual`, {
      data: {
        occurredOn: input.occurredOn,
        type: input.type,
        sourceType: "manual_cash",
        description: `Salud financiera UAT ${input.label} ${suffix}`,
        categoryId: null,
        currency: "ARS",
        amount: input.amount,
        status: "actual",
        notes: "UAT APP-FINANCIAL-HEALTH-001",
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const created = (await response.json()) as CreatedMovement;
    movementIds.push(created.sourceId);
  }


  try {
    await createMovement({ occurredOn: current.sample, type: "income", amount: "100.000,00", label: "ingreso-principal" });
    await createMovement({ occurredOn: current.sample, type: "income", amount: "25.000,00", label: "ingreso-secundario" });
    await createMovement({ occurredOn: current.sample, type: "expense", amount: "30.000,00", label: "egreso-uno" });
    await createMovement({ occurredOn: current.sample, type: "expense", amount: "15.000,00", label: "egreso-dos" });
    await createMovement({ occurredOn: previous.sample, type: "expense", amount: "60.000,00", label: "egreso-anterior" });


    const snapshotResponse = await request.post(`${API_BASE_URL}/api/financial-health/snapshots`, {
      data: { from: current.first, to: current.last },
    });
    expect(snapshotResponse.status(), await snapshotResponse.text()).toBe(201);
    const health = (await snapshotResponse.json()) as {
      snapshotId: string;
      snapshotCreated: boolean;
      evaluation: {
        formula: { version: string };
        currencies: {
          ARS: { status: string; score: number | null; factors: Array<{ id: string; points: number | null }> };
          USD: { status: string; score: number | null };
        };
      };
      history: Array<{ id: string }>;
    };
    snapshotId = health.snapshotId;


    expect(health.snapshotCreated).toBeTruthy();
    expect(health.evaluation.formula.version).toBe("fh-v1.0.0");
    expect(health.evaluation.currencies.ARS.status).toBe("calculated");
    expect(health.evaluation.currencies.ARS.score).not.toBeNull();
    expect(["calculated", "insufficient_data"]).toContain(
      health.evaluation.currencies.USD.status,
    );
    if (health.evaluation.currencies.USD.status === "insufficient_data") {
      expect(health.evaluation.currencies.USD.score).toBeNull();
    } else {
      expect(health.evaluation.currencies.USD.score).not.toBeNull();
    }
    expect(health.history.some((item) => item.id === snapshotId)).toBeTruthy();


    const duplicateResponse = await request.post(`${API_BASE_URL}/api/financial-health/snapshots`, {
      data: { from: current.first, to: current.last },
    });
    expect(duplicateResponse.status(), await duplicateResponse.text()).toBe(201);
    const duplicate = (await duplicateResponse.json()) as {
      snapshotId: string;
      snapshotCreated: boolean;
    };
    expect(duplicate.snapshotId).toBe(snapshotId);
    expect(duplicate.snapshotCreated).toBeFalsy();


    await page.goto("/");
    await page.getByRole("button", { name: "Salud financiera" }).first().click();
    const section = page.getByTestId("financial-health-section");
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute("data-formula-version", "fh-v1.0.0");
    await expect(page.getByTestId("financial-health-score-ars")).toHaveAttribute(
      "data-score",
      String(health.evaluation.currencies.ARS.score),
    );
    await expect(page.getByTestId("financial-health-score-usd")).toHaveAttribute(
      "data-score",
      health.evaluation.currencies.USD.score === null
        ? "not-calculated"
        : String(health.evaluation.currencies.USD.score),
    );
    await expect(page.getByTestId("financial-health-methodology")).toContainText("Requisitos mínimos");
    await expect(page.getByTestId("financial-health-history")).toContainText("Historial de evaluaciones");


    const actualFactor = page.getByTestId("financial-health-factor-ars-actual_balance");
    await expect(actualFactor).toHaveAttribute(
      "data-points",
      String(health.evaluation.currencies.ARS.factors.find((factor) => factor.id === "actual_balance")?.points),
    );
    await actualFactor.getByRole("button", { name: "Ver movimientos realizados" }).click();
    await expect(page.getByTestId("movements-section")).toBeVisible();
    await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
      "Salud financiera: balance realizado ARS",
    );


    await page.getByRole("button", { name: "Inicio" }).first().click();
    const dashboardHealth = page.getByTestId("dashboard-financial-health");
    await expect(dashboardHealth).toBeVisible();
    await expect(page.getByTestId("dashboard-financial-health-ars")).toHaveAttribute(
      "data-score",
      String(health.evaluation.currencies.ARS.score),
    );
    await page.getByTestId("dashboard-open-financial-health").click();
    await expect(section).toBeVisible();


    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.locator('button:has-text("Salud financiera"):visible')).toBeVisible();
  } finally {
    if (snapshotId) {
      await request.delete(`${API_BASE_URL}/api/financial-health/snapshots/${snapshotId}`);
    }
    for (const movementId of movementIds.reverse()) {
      await request.delete(`${API_BASE_URL}/api/movements/manual/${movementId}`);
    }
  }
});