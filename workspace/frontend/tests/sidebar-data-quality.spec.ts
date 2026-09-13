import { expect, test } from "@playwright/test";




const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";




function tucumanDateParts(): { year: number; month: number; day: number } {
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




function currentMonthRange(): { from: string; to: string; today: string } {
  const { year, month, day } = tucumanDateParts();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { from, to, today };
}




test("Sidebar muestra indicadores determinísticos y navega a su origen", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  const suffix = Date.now();
  const description = `Calidad de datos UAT ${suffix}`;
  const range = currentMonthRange();
  let movementId: string | null = null;




  try {
    const createResponse = await request.post(`${API_BASE_URL}/api/movements/manual`, {
      data: {
        occurredOn: range.today,
        type: "expense",
        sourceType: "manual_cash",
        description,
        categoryId: null,
        currency: "ARS",
        amount: "321,45",
        status: "actual",
        notes: "UAT APP-SIDEBAR-HEALTH-PRECURSOR-001",
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const created = (await createResponse.json()) as { sourceId: string };
    movementId = created.sourceId;




    const dashboardResponse = await request.get(
      `${API_BASE_URL}/api/dashboard?from=${range.from}&to=${range.to}`,
    );
    expect(dashboardResponse.ok()).toBeTruthy();
    const dashboard = (await dashboardResponse.json()) as {
      alerts: unknown[];
      dataQuality: {
        unclassifiedRecords: number;
        lastUpdatedAt: string | null;
      };
    };
    expect(dashboard.dataQuality.unclassifiedRecords).toBeGreaterThan(0);
    expect(dashboard.alerts.length).toBeGreaterThan(0);
    expect(dashboard.dataQuality.lastUpdatedAt).toBeTruthy();




    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const panel = page.locator('[data-testid="sidebar-data-quality"]:visible');
    const sidebarShell = page.locator('aside.lg\\:block > div').first();
    const overflow = await sidebarShell.evaluate((node) => ({
      overflowY: getComputedStyle(node).overflowY,
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
    }));
    expect(["auto", "scroll"]).toContain(overflow.overflowY);
    expect(overflow.scrollHeight).toBeGreaterThanOrEqual(overflow.clientHeight);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-source", "dashboard.dataQuality");




    const unclassified = panel.getByTestId("sidebar-quality-unclassified");
    await expect(unclassified).toHaveAttribute(
      "data-count",
      String(dashboard.dataQuality.unclassifiedRecords),
    );
    const alerts = panel.getByTestId("sidebar-quality-alerts");
    await expect(alerts).toHaveAttribute("data-count", String(dashboard.alerts.length));
    await expect(panel.getByTestId("sidebar-quality-last-updated")).toHaveAttribute(
      "data-value",
      dashboard.dataQuality.lastUpdatedAt ?? "",
    );




    await unclassified.click({ force: false });
    await expect(page.getByTestId("movements-section")).toBeVisible();
    await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
      "Calidad del dato: movimientos sin clasificar",
    );
    await expect(page.getByText(description).first()).toBeVisible();




    await page.getByRole("button", { name: "Inicio" }).first().click();
    await expect(page.getByTestId("dashboard-section")).toBeVisible();
    const dashboardPanel = page.locator('[data-testid="sidebar-data-quality"]:visible');
    const dashboardAlerts = dashboardPanel.getByTestId("sidebar-quality-alerts");
    await dashboardAlerts.click({ force: false });
    await expect(page.getByTestId("dashboard-section")).toBeVisible();




    const refreshedPanel = page.locator('[data-testid="sidebar-data-quality"]:visible');
    const refreshedLastUpdated = refreshedPanel.getByTestId("sidebar-quality-last-updated");
    await refreshedLastUpdated.click({ force: false });
    await expect(page.getByTestId("movements-section")).toBeVisible();




    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const mobilePanel = page.locator('[data-testid="sidebar-data-quality"]:visible');
    await expect(mobilePanel).toBeVisible();
    await expect(mobilePanel).toContainText("Indicadores técnicos, sin puntaje ni diagnóstico financiero");
  } finally {
    if (movementId) {
      await request.delete(`${API_BASE_URL}/api/movements/manual/${movementId}`);
    }
  }
});