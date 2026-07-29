import { expect, test, type Page, type Route } from "@playwright/test";

type CurrencyStatus = "calculated" | "insufficient_data";
type CurrencyBand =
  | "favorable"
  | "stable"
  | "exposed"
  | "compromised"
  | "not_calculated";

function currentMonthRange(): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(last).padStart(2, "0")}`,
  };
}

function healthPayload(input: {
  from: string;
  to: string;
  arsScore: number | null;
  arsStatus: CurrencyStatus;
  arsBand: CurrencyBand;
  arsBandLabel: string;
}) {
  return {
    evaluation: {
      formula: {
        version: "fh-v1.0.0",
        title: "Salud financiera determinística",
        description: "Evaluación calculada exclusivamente por backend.",
        scoreRange: { minimum: 0, maximum: 100 },
        weights: [],
        minimumRequirements: ["Datos reales suficientes"],
      },
      period: { from: input.from, to: input.to },
      evaluatedAt: "2026-07-18T12:00:00.000Z",
      sourceFingerprint: `compact-${input.from}-${input.to}`,
      currencies: {
        ARS: {
          currency: "ARS",
          status: input.arsStatus,
          score: input.arsScore,
          band: input.arsBand,
          bandLabel: input.arsBandLabel,
          confidence: {
            label: input.arsScore === null ? "insufficient" : "high",
            labelText:
              input.arsScore === null
                ? "Confianza insuficiente"
                : "Confianza alta",
            basisPoints: input.arsScore === null ? 0 : 9500,
            availableWeight: input.arsScore === null ? 0 : 100,
            recordEvidence: input.arsScore === null ? 0 : 12,
            historyMonths: input.arsScore === null ? 0 : 3,
            classifiedBasisPoints: input.arsScore === null ? 0 : 10000,
          },
          availableWeight: input.arsScore === null ? 0 : 100,
          earnedPoints: input.arsScore ?? 0,
          factors: [],
          blockers: input.arsScore === null ? ["Sin evidencia suficiente"] : [],
        },
        USD: {
          currency: "USD",
          status: "insufficient_data",
          score: null,
          band: "not_calculated",
          bandLabel: "No calculado",
          confidence: {
            label: "insufficient",
            labelText: "Confianza insuficiente",
            basisPoints: 0,
            availableWeight: 0,
            recordEvidence: 0,
            historyMonths: 0,
            classifiedBasisPoints: 0,
          },
          availableWeight: 0,
          earnedPoints: 0,
          factors: [],
          blockers: ["Sin movimientos USD suficientes"],
        },
      },
      goalsContext: {
        note: "Los objetivos no representan reservas de saldo.",
        activeGoals: 0,
        nearestActiveTargetDate: null,
        currencies: {
          ARS: {
            targetAmount: "0",
            contributedAmount: "0",
            remainingAmount: "0",
            progressPercent: "0",
          },
          USD: {
            targetAmount: "0",
            contributedAmount: "0",
            remainingAmount: "0",
            progressPercent: "0",
          },
        },
      },
      comparison: null,
      disclaimer: "Indicador informativo basado en datos locales.",
    },
    history: [],
    snapshotId: null,
    snapshotCreated: false,
  };
}

async function mockFinancialHealth(
  page: Page,
  resolve: (from: string, to: string) => ReturnType<typeof healthPayload>,
): Promise<void> {
  await page.route("**/api/financial-health?**", async (route: Route) => {
    const url = new URL(route.request().url());
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(resolve(from, to)),
    });
  });
}

test("Indicador compacto refleja score, banda, confianza, fórmula y período del payload", async ({
  page,
}) => {
  const month = currentMonthRange();

  await mockFinancialHealth(page, (from, to) =>
    healthPayload({
      from,
      to,
      arsScore: from === month.from && to === month.to ? 73 : 61,
      arsStatus: "calculated",
      arsBand:
        from === month.from && to === month.to ? "stable" : "exposed",
      arsBandLabel:
        from === month.from && to === month.to ? "Estable" : "Expuesta",
    }),
  );

  await page.goto("/");

  let compact = page.locator('[data-testid="sidebar-financial-health"]:visible');
  await expect(compact).toHaveAttribute("data-status", "ready");
  await expect(compact).toHaveAttribute("data-formula-version", "fh-v1.0.0");
  await expect(compact).toHaveAttribute("data-period-from", month.from);
  await expect(compact).toHaveAttribute("data-period-to", month.to);

  const ars = compact.getByTestId("sidebar-financial-health-ars");
  await expect(ars).toHaveAttribute("data-score", "73");
  await expect(ars).toHaveAttribute("data-band", "stable");
  await expect(ars).toHaveAttribute("data-confidence", "high");
  await expect(ars).toContainText("73/100");
  await expect(ars).toContainText("Estable");
  await expect(ars).toContainText("Confianza alta");

  const usd = compact.getByTestId("sidebar-financial-health-usd");
  await expect(usd).toHaveAttribute("data-score", "not-calculated");
  await expect(usd).toHaveAttribute("data-status", "insufficient_data");
  await expect(usd).toContainText("Sin datos suficientes");
  await expect(usd).toContainText("Confianza insuficiente");
  await expect(compact).toContainText(
    "No reemplaza alertas ni calidad de datos",
  );

  await page.getByLabel("Seleccionar período").click();
  await page.getByRole("option", { name: "Trimestre actual" }).click();

  compact = page.locator('[data-testid="sidebar-financial-health"]:visible');
  await expect(compact.getByTestId("sidebar-financial-health-ars")).toHaveAttribute(
    "data-score",
    "61",
  );
  await expect(compact.getByTestId("sidebar-financial-health-ars")).toHaveAttribute(
    "data-band",
    "exposed",
  );

  await compact.getByTestId("sidebar-financial-health-open").click();
  await expect(page.getByTestId("financial-health-section")).toBeVisible();
  await expect(page.getByTestId("financial-health-section")).toHaveAttribute(
    "data-formula-version",
    "fh-v1.0.0",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const mobileCompact = page.locator(
    '[data-testid="sidebar-financial-health"]:visible',
  );
  await expect(mobileCompact).toBeVisible();
  await expect(mobileCompact.getByTestId("sidebar-financial-health-ars")).toHaveAttribute(
    "data-score",
    "61",
  );
});

test("Indicador compacto muestra un estado explícito cuando ninguna moneda es calculable", async ({
  page,
}) => {
  await mockFinancialHealth(page, (from, to) =>
    healthPayload({
      from,
      to,
      arsScore: null,
      arsStatus: "insufficient_data",
      arsBand: "not_calculated",
      arsBandLabel: "No calculado",
    }),
  );

  await page.goto("/");

  const compact = page.locator('[data-testid="sidebar-financial-health"]:visible');
  await expect(compact).toHaveAttribute("data-status", "insufficient_data");
  await expect(compact).toContainText(
    "Sin datos suficientes para calcular el indicador",
  );
  await expect(compact.getByTestId("sidebar-financial-health-ars")).toContainText(
    "Sin datos suficientes",
  );
  await expect(compact.getByTestId("sidebar-financial-health-usd")).toContainText(
    "Sin datos suficientes",
  );
  await expect(compact.getByTestId("sidebar-financial-health-open")).toBeEnabled();
});
