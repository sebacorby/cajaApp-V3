import { expect, test } from "@playwright/test";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

function currentMonthRange(): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

test("Dashboard muestra tendencia real, accesible y enlazada a Reportes", async ({
  page,
  request,
}) => {
  const range = currentMonthRange();
  const response = await request.get(
    `${API_BASE_URL}/api/dashboard?from=${range.from}&to=${range.to}`,
  );
  expect(response.ok()).toBeTruthy();
  const overview = (await response.json()) as {
    monthlyEvolution: Array<{
      monthKey: string;
      label: string;
      balanceArs: string;
      balanceUsd: string;
    }>;
  };

  await page.goto("/");
  await expect(page.getByTestId("dashboard-section")).toBeVisible();

  const trend = page.getByTestId("dashboard-balance-trend");
  await expect(trend).toBeVisible();
  await expect(trend).toContainText("Balance mensual realizado informado por el backend");

  const ars = page.getByTestId("dashboard-balance-trend-ars");
  const usd = page.getByTestId("dashboard-balance-trend-usd");
  await expect(ars).toHaveAttribute(
    "data-point-count",
    String(overview.monthlyEvolution.length),
  );
  await expect(usd).toHaveAttribute(
    "data-point-count",
    String(overview.monthlyEvolution.length),
  );
  await expect(ars).toHaveAttribute("data-source", "dashboard.monthlyEvolution");
  await expect(usd).toHaveAttribute("data-source", "dashboard.monthlyEvolution");

  if (overview.monthlyEvolution.length >= 2) {
    await expect(ars.locator("svg")).toBeVisible();
    await expect(usd.locator("svg")).toBeVisible();
    const latest = overview.monthlyEvolution.at(-1)!;
    await expect(ars).toContainText(latest.label);
    await expect(usd).toContainText(latest.label);
  } else {
    await expect(trend).toContainText("Se necesitan al menos dos meses reales");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(trend).toBeVisible();
  await page.getByTestId("dashboard-balance-trend-reports").click();
  await expect(page.getByTestId("reports-section")).toBeVisible();
});
