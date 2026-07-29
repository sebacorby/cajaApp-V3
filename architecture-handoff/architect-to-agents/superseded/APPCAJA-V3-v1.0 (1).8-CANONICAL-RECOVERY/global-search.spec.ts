import { expect, test } from "@playwright/test";


function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}


test("búsqueda global: teclado, navegación por registro y mobile", async ({ page }) => {
  const description = `Búsqueda global UAT ${Date.now()}`;


  try {
    await page.goto("/");
    await page.getByRole("button", { name: /^Movimientos$/ }).click();
    await page.getByTestId("add-manual-movement").click();
    await page.getByTestId("movement-description").fill(description);
    await page.getByTestId("movement-date").fill(today());
    await page.getByTestId("movement-currency").click();
    await page.getByRole("option", { name: "ARS" }).click();
    await page.getByTestId("movement-amount").fill("1234,56");
    await page.getByTestId("save-manual-movement").click();
    await expect(
      page.locator('[data-testid^="movement-row-"]:visible').filter({ hasText: description }).first(),
    ).toBeVisible();


    await page.keyboard.press("Control+K");
    const input = page.getByTestId("global-search-input");
    await expect(input).toBeFocused();
    await input.fill(description);


    const result = page.getByTestId("global-search-result-movement").filter({
      hasText: description,
    });
    await expect(result).toBeVisible();
    await result.click();


    await expect(page.getByTestId("movements-section")).toBeVisible();
    const target = page.getByTestId("global-search-target");
    await expect(target).toContainText(description);
    await expect(target).toHaveAttribute("data-record-type", "movement");


    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("header-global-search").click();
    await expect(page.getByRole("dialog", { name: "Buscar en CajaApp" })).toBeVisible();
    await expect(page.getByTestId("global-search-input")).toBeVisible();
    await page.keyboard.press("Escape");
  } finally {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: /^Movimientos$/ }).click();
    const row = page.locator('[data-testid^="movement-row-"]').filter({
      hasText: description,
    }).first();
    if (await row.count()) {
      page.once("dialog", (dialog) => dialog.accept());
      await row.getByRole("button", { name: new RegExp(`Eliminar ${description}`) }).click();
      await expect(
        page.locator('[data-testid^="movement-row-"]:visible').filter({ hasText: description }),
      ).toHaveCount(0);
    }
  }
});