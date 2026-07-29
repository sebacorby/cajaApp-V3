import { expect, test } from "@playwright/test";


const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";


function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}


test("Dashboard alterna modos visuales sin perder datos equivalentes", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const suffix = Date.now();
  const categoryName = `Gráficos E2E ${suffix}`;
  const keyword = `graficose2e${suffix}`;
  const description = `Compra ${keyword}`;
  let categoryId: string | null = null;
  let movementId: string | null = null;


  try {
    await page.goto("/");
    await page.getByRole("button", { name: /^Movimientos$/ }).click();
    await expect(page.getByTestId("movements-section")).toBeVisible();


    await page.getByTestId("open-category-management").click();
    await page.getByTestId("create-category").click();
    await page.getByLabel("Nombre").fill(categoryName);
    await page.getByLabel("Color hexadecimal").fill("#7c3aed");
    await page.getByLabel("Ícono").fill("chart-pie");
    await page.getByLabel("Palabras clave").fill(keyword);
    await page.getByRole("button", { name: "Guardar categoría" }).click();


    const categoryRow = page
      .locator('[data-testid^="category-row-"]')
      .filter({ hasText: categoryName })
      .first();
    await expect(categoryRow).toBeVisible();
    categoryId = (await categoryRow.getAttribute("data-testid"))?.replace(
      "category-row-",
      "",
    ) ?? null;
    expect(categoryId).toBeTruthy();


    const created = await request.post(`${API_BASE_URL}/api/movements/manual`, {
      data: {
        occurredOn: today(),
        type: "expense",
        sourceType: "manual_unexpected",
        description,
        categoryId,
        currency: "ARS",
        amount: "4321.00",
        status: "actual",
        notes: "Dato controlado para paridad visual",
      },
    });
    expect(created.ok()).toBeTruthy();
    movementId = ((await created.json()) as { id: string }).id;


    const managementSheet = page.getByTestId("category-management-sheet");
    await page.keyboard.press("Escape");
    if (await managementSheet.isVisible()) await page.keyboard.press("Escape");
    await expect(managementSheet).toBeHidden();
    await page.getByRole("button", { name: /^Inicio$/ }).click();
    await expect(page.getByTestId("dashboard-section")).toBeVisible();
    await page.getByTestId("dashboard-section").getByRole("button", { name: "Actualizar" }).click();


    const categoriesCard = page.getByTestId("dashboard-categories-card");
    await expect(categoriesCard).toContainText(categoryName);
    await expect(page.getByTestId("dashboard-category-mode-list")).toHaveAttribute(
      "aria-pressed",
      "true",
    );


    await page.getByTestId("dashboard-category-mode-donut").click();
    await expect(page.getByTestId("dashboard-category-donut-ars")).toBeVisible();
    await expect(page.getByTestId("dashboard-category-donut-ars")).toHaveAttribute(
      "data-source",
      "dashboard.categories",
    );
    await expect(page.getByTestId("dashboard-category-donut-ars")).toContainText(
      categoryName,
    );


    await expect(page.getByTestId("dashboard-evolution-mode-bars")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("dashboard-evolution-bars")).toHaveAttribute(
      "data-source",
      "dashboard.monthlyEvolution",
    );


    await page.getByTestId("dashboard-evolution-mode-area").click();
    await expect(page.getByTestId("dashboard-evolution-area")).toBeVisible();
    await expect(page.getByTestId("dashboard-evolution-area")).toHaveAttribute(
      "data-source",
      "dashboard.monthlyEvolution",
    );


    await page.getByTestId("dashboard-evolution-currency-usd").click();
    await expect(page.getByTestId("dashboard-evolution-currency-usd")).toHaveAttribute(
      "aria-pressed",
      "true",
    );


    const dataTable = page.getByTestId("dashboard-evolution-data-table");
    await dataTable.locator("summary").click();
    await expect(dataTable.getByRole("table")).toBeVisible();
    await expect(dataTable.getByRole("columnheader", { name: "Balance" })).toBeVisible();


    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("dashboard-evolution-card")).toBeVisible();
    await expect(page.getByTestId("dashboard-categories-card")).toBeVisible();
  } finally {
    if (movementId) {
      await request.delete(`${API_BASE_URL}/api/movements/manual/${movementId}`);
    }
    if (categoryId) {
      await request.delete(
        `${API_BASE_URL}/api/movements/categories/${categoryId}`,
        { data: {} },
      );
    }
  }
});