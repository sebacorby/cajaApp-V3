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


test.describe("Administración de categorías", () => {
  test("crea reglas, recategoriza y archiva sin perder movimientos", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const suffix = Date.now();
    const categoryName = `Categoría E2E ${suffix}`;
    const keyword = `comercioe2e${suffix}`;
    const movementDescription = `Compra ${keyword}`;
    let movementId: string | null = null;
    let categoryId: string | null = null;


    try {
      await page.goto("/");
      await page.getByRole("button", { name: /^Movimientos$/ }).click();
      await expect(page.getByTestId("movements-section")).toBeVisible();


      await page.getByTestId("open-category-management").click();
      await expect(page.getByTestId("category-management-sheet")).toBeVisible();
      await page.getByTestId("create-category").click();
      await expect(page.getByTestId("category-form")).toBeVisible();


      await page.getByLabel("Nombre").fill(categoryName);
      await page.getByLabel("Color hexadecimal").fill("#2563eb");
      await page.getByLabel("Ícono").fill("shopping-bag");
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


      const suggestionResponse = await request.post(
        `${API_BASE_URL}/api/movements/categories/suggest`,
        {
          data: {
            description: `Pago en ${keyword}`,
            sourceType: "debit_csv",
          },
        },
      );
      expect(suggestionResponse.ok()).toBeTruthy();
      const suggestion = (await suggestionResponse.json()) as {
        suggestion: { id: string; matchedKeyword: string } | null;
      };
      expect(suggestion.suggestion?.id).toBe(categoryId);
      expect(suggestion.suggestion?.matchedKeyword).toBe(keyword);


      await page.keyboard.press("Escape");
      await page.getByTestId("add-manual-movement").click();
      await page.getByTestId("movement-description").fill(movementDescription);
      await page.getByTestId("movement-date").fill(today());
      await page.getByTestId("movement-amount").fill("1234,56");
      await page.getByTestId("save-manual-movement").click();


      const movementRow = page
        .locator('[data-testid^="movement-row-"]')
        .filter({ hasText: movementDescription })
        .first();
      await expect(movementRow).toBeVisible();
      movementId = (await movementRow.getAttribute("data-testid"))?.replace(
        "movement-row-",
        "",
      ) ?? null;


      await movementRow
        .getByRole("combobox", { name: `Categoría de ${movementDescription}` })
        .click();
      await page.getByRole("option", { name: categoryName }).click();
      await expect(movementRow).toContainText(categoryName);


      await page.reload();
      await page.getByRole("button", { name: /^Movimientos$/ }).click();
      const persistedRow = page
        .locator('[data-testid^="movement-row-"]')
        .filter({ hasText: movementDescription })
        .first();
      await expect(persistedRow).toContainText(categoryName);


      await page.getByTestId("open-category-management").click();
      const activeCategoryRow = page
        .locator('[data-testid^="category-row-"]')
        .filter({ hasText: categoryName })
        .first();
      page.once("dialog", (dialog) => dialog.accept());
      await activeCategoryRow
        .getByRole("button", { name: "Archivar categoría" })
        .click();
      await expect(activeCategoryRow).toContainText("Archivada");




      const sheetLocator = page.getByTestId("category-management-sheet");
      await page.keyboard.press("Escape");
      await sheetLocator.waitFor({ state: "detached" });
      const overlay = page.locator('[data-radix-portal], [data-state="open"][data-slot="dialog-overlay"]');
      if (await overlay.count()) {
        await overlay.first().waitFor({ state: "detached" });
      }
      const reassignedRow = page
        .locator('[data-testid^="movement-row-"]:visible')
        .filter({ hasText: movementDescription })
        .first();
      await expect(reassignedRow).toBeVisible();
      await expect(reassignedRow).toContainText(movementDescription);




      await page.getByTestId("open-category-management").click();
      await expect(sheetLocator).toBeVisible();
      const archivedCategoryRow = page
        .locator('[data-testid^="category-row-"]')
        .filter({ hasText: categoryName })
        .first();
      const restoreButton = archivedCategoryRow.getByRole("button", {
        name: "Restaurar categoría",
      });
      await restoreButton.waitFor({ state: "visible" });
      await restoreButton.click();
      await expect(archivedCategoryRow).not.toContainText("Archivada");
    } finally {
      if (movementId) {
        await request.delete(
          `${API_BASE_URL}/api/movements/manual/${movementId}`,
        );
      }


      if (categoryId) {
        const categoriesResponse = await request.get(
          `${API_BASE_URL}/api/movements/categories?includeInactive=true`,
        );
        if (categoriesResponse.ok()) {
          const categories = (await categoriesResponse.json()) as Array<{
            id: string;
            active: boolean;
          }>;
          const category = categories.find((item) => item.id === categoryId);
          if (category?.active) {
            await request.delete(
              `${API_BASE_URL}/api/movements/categories/${categoryId}`,
              { data: {} },
            );
          }
        }
      }
    }
  });
});