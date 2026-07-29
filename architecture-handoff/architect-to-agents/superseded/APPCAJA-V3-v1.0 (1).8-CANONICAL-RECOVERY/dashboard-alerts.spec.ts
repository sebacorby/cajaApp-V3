import { expect, test } from "@playwright/test";

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

test("Dashboard muestra una alerta determinística y abre su origen", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const description = `UAT alerta sin clasificar ${Date.now()}`;
  const created = await request.post(`${API_BASE_URL}/api/movements/manual`, {
    data: {
      occurredOn: today(),
      type: "expense",
      sourceType: "manual_unexpected",
      description,
      categoryId: null,
      currency: "ARS",
      amount: "1234.56",
      status: "actual",
      notes: "Prueba controlada de alerta determinística",
    },
  });
  expect(created.ok()).toBeTruthy();
  const movement = await created.json();

  try {
    const date = today();
    const [year, month] = date.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const apiResponse = await request.get(
      `${API_BASE_URL}/api/dashboard?from=${from}&to=${to}`,
    );
    expect(apiResponse.ok(), await apiResponse.text()).toBeTruthy();
    const apiDashboard = (await apiResponse.json()) as {
      alerts: Array<{ id: string }>;
    };
    expect(
      apiDashboard.alerts.some(
        (alert) => alert.id === "unclassified-movements",
      ),
    ).toBe(true);

    await page.goto("/");
    await page.getByRole("button", { name: /^Inicio$/i }).click();
    const dashboard = page.getByTestId("dashboard-section");
    await expect(dashboard).toBeVisible();
    const refreshResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        /\/api\/dashboard\?/.test(response.url()),
    );
    await dashboard.getByRole("button", { name: "Actualizar" }).click();
    expect((await refreshResponse).ok()).toBeTruthy();
    const alert = dashboard.getByTestId(
      "dashboard-alert-unclassified-movements",
    );
    await expect(alert).toBeVisible();
    await expect(
      alert.getByText("Regla: category = Sin clasificar"),
    ).toBeVisible();
    await alert.getByRole("button", { name: "Clasificar movimientos" }).click();
    await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
      "movimientos sin clasificar",
    );
  } finally {
    await request.delete(
      `${API_BASE_URL}/api/movements/manual/${encodeURIComponent(movement.sourceId ?? movement.id)}`,
    );
  }
});
