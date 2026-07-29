import { expect, test } from "@playwright/test";


function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}


test.describe("Movimientos manuales", () => {
  test("crea, edita y anula un movimiento desde la UI", async ({ page }) => {
    const suffix = Date.now();
    const description = `Gasto efectivo E2E ${suffix}`;
    const editedDescription = `${description} editado`;


    await page.goto("/");
    await page.getByRole("button", { name: /^Movimientos$/ }).click();
    await expect(page.getByTestId("movements-section")).toBeVisible();


    await page.getByTestId("add-manual-movement").click();
    await page.getByTestId("movement-description").fill(description);
    await page.getByTestId("movement-date").fill(today());
    await page.getByTestId("movement-currency").click();
    await page.getByRole("option", { name: "ARS" }).click();
    await page.getByTestId("movement-amount").fill("12.345,67");
    await page.getByTestId("save-manual-movement").click();


    const row = page.locator('[data-testid^="movement-row-"]').filter({ hasText: description }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/12\.345,67/);


    await row.getByRole("button", { name: new RegExp(`Editar ${description}`) }).click();
    await page.getByTestId("movement-description").fill(editedDescription);
    await page.getByTestId("save-manual-movement").click();
    const editedRow = page.locator('[data-testid^="movement-row-"]').filter({
      hasText: editedDescription,
    }).first();
    await expect(editedRow).toBeVisible();


    page.once("dialog", (dialog) => dialog.accept());
    await editedRow.getByRole("button", { name: new RegExp(`Eliminar ${editedDescription}`) }).click();
    await expect(
      page.locator('[data-testid^="movement-row-"]').filter({ hasText: editedDescription }),
    ).toHaveCount(0);
  });
});