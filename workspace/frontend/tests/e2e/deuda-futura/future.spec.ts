import { expect, test } from "@playwright/test";


const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";


function futureDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 12);
  return date.toISOString().slice(0, 10);
}


test.describe("Deuda y compromisos futuros", () => {
  test("muestra un compromiso confirmado y permite abrir su origen", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const description = `Compromiso E2E ${suffix}`;
    const commitmentDate = futureDate();
    const commitmentMonth = commitmentDate.slice(0, 7);
    let movementId: string | null = null;


    try {
      const createResponse = await request.post(
        `${API_BASE_URL}/api/movements/manual`,
        {
          data: {
            occurredOn: commitmentDate,
            type: "expense",
            sourceType: "manual_unexpected",
            description,
            categoryId: null,
            currency: "ARS",
            amount: "12345,67",
            status: "pending",
            notes: "Creado para validar deuda futura",
          },
        },
      );
      expect(createResponse.ok()).toBeTruthy();
      const created = (await createResponse.json()) as { sourceId: string };
      movementId = created.sourceId;


      await page.goto("/");
      await page.getByRole("button", { name: /^Deuda futura$/i }).click();
      await expect(page.getByTestId("future-section")).toBeVisible();
      const monthPanel = page.getByTestId(`future-month-${commitmentMonth}`);
      await expect(monthPanel).toBeVisible();
      if ((await monthPanel.getAttribute("open")) === null) {
        await monthPanel.locator("summary").click();
      }
      await expect(monthPanel.getByText(description, { exact: true })).toBeVisible();
      const futureGroup = monthPanel.getByTestId(`future-group-${movementId}`);
      await expect(futureGroup).toBeVisible();
      await expect(
        futureGroup.locator("span", { hasText: /^Confirmado$/ }).first(),
      ).toBeVisible();
      await expect(
        futureGroup.getByText(/12\.345,67/).first(),
      ).toBeVisible();


      const originButton = page
        .getByRole("button", { name: new RegExp(`Abrir origen`, "i") })
        .first();
      await originButton.click();
      await expect(page.getByTestId("movements-section")).toBeVisible();
    } finally {
      if (movementId) {
        await request.delete(
          `${API_BASE_URL}/api/movements/manual/${movementId}`,
        );
      }
    }
  });
});