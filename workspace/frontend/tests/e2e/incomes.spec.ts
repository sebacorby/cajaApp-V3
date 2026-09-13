import { expect, test } from "@playwright/test";

const API_BASE_URL =
  process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";

function monthKeyWithOffset(offset: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(): { from: string; to: string } {
  return {
    from: monthKeyWithOffset(-3),
    to: monthKeyWithOffset(12),
  };
}

test.describe("Ingresos", () => {
  test("crea, proyecta y persiste ingresos ARS y USD desde la UI real", async ({
    page,
    request,
  }, testInfo) => {
    const suffix = `${Date.now()}`;
    const sourceName = `Sueldo E2E ${suffix}`;
    const oneOffLabel = `Extra USD E2E ${suffix}`;
    const startMonth = monthKeyWithOffset(0);
    const adjustmentMonth = monthKeyWithOffset(1);
    const overrideMonth = monthKeyWithOffset(2);
    const monthBeforeIncrease = monthKeyWithOffset(3);
    const increasedMonth = monthKeyWithOffset(4);

    test.setTimeout(5 * 60 * 1000);

    try {
      await test.step("abrir la pestaña Ingresos", async () => {
        await page.goto("/");
        await page.getByRole("button", { name: /^Ingresos$/i }).click();
        await expect(page.getByTestId("incomes-section")).toBeVisible();
      });

      await test.step("crear fuente recurrente", async () => {
        await page.getByTestId("add-income-source").click();
        await page.getByTestId("income-source-name").fill(sourceName);
        await page.getByTestId("income-source-currency").selectOption("ARS");
        await page.getByTestId("income-source-amount").fill("1.000.000,00");
        await page.getByTestId("income-source-start-month").fill(startMonth);
        await page.getByTestId("income-source-increase-frequency").fill("3");
        await page.getByTestId("income-source-increase-percent").fill("10");
        await page.getByTestId("save-income-source").click();

        await expect(
          page
            .locator('div[data-testid^="income-source-"]')
            .filter({ hasText: sourceName })
            .first(),
        ).toBeVisible();
      });

      await test.step("verificar el aumento automático", async () => {
        const increasedMonthCard = page.getByTestId(
          `income-month-${increasedMonth}`,
        );
        await expect(increasedMonthCard).toContainText(sourceName);
        await expect(increasedMonthCard).toContainText(/1\.100\.000/);
      });

      await test.step("registrar un cambio permanente", async () => {
        const sourceCard = page
          .locator('div[data-testid^="income-source-"]')
          .filter({ hasText: sourceName })
          .first();

        await sourceCard
          .getByRole("button", { name: /Cambio desde un mes/i })
          .click();
        await page.getByTestId("income-event-month").fill(adjustmentMonth);
        await page.getByTestId("income-event-amount").fill("1.500.000,00");
        await page.getByTestId("save-income-event").click();
        await expect(page.getByTestId("save-income-event")).toBeHidden();

        const increasedAfterAdjustment = page.getByTestId(
          `income-month-${increasedMonth}`,
        );
        await expect(increasedAfterAdjustment).toContainText(sourceName);
        await expect(increasedAfterAdjustment).toContainText(/1\.650\.000/);
      });

      await test.step("registrar un valor real mensual sin alterar el futuro", async () => {
        const sourceCard = page
          .locator('div[data-testid^="income-source-"]')
          .filter({ hasText: sourceName })
          .first();

        await sourceCard
          .getByRole("button", { name: /Valor real de un mes/i })
          .click();
        await page.getByTestId("income-event-month").fill(overrideMonth);
        await page.getByTestId("income-event-amount").fill("1.550.000,00");
        await page.getByTestId("save-income-event").click();
        await expect(page.getByTestId("save-income-event")).toBeHidden();

        await expect(
          page.getByTestId(`income-month-${overrideMonth}`),
        ).toContainText(/1\.550\.000/);
        await expect(
          page.getByTestId(`income-month-${monthBeforeIncrease}`),
        ).toContainText(/1\.500\.000/);
      });

      await test.step("crear un ingreso extraordinario en USD", async () => {
        const addOneOff = page.getByTestId("add-one-off-income");
        await expect(addOneOff).toBeVisible();
        await addOneOff.click();

        const currency = page.getByTestId("income-event-currency");
        await expect(currency).toBeVisible();
        await currency.selectOption("USD");
        await page.getByTestId("income-event-month").fill(startMonth);
        await page.getByTestId("income-event-amount").fill("250.50");
        await page.getByTestId("income-event-label").fill(oneOffLabel);

        const createResponsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            /\/api\/incomes\/events$/.test(response.url()),
        );
        await page.getByTestId("save-income-event").click();
        const createResponse = await createResponsePromise;
        expect(createResponse.ok(), await createResponse.text()).toBeTruthy();
        await expect(page.getByTestId("save-income-event")).toBeHidden();

        const currentMonthCard = page.getByTestId(`income-month-${startMonth}`);
        await expect(currentMonthCard).toContainText(oneOffLabel);
        await expect(currentMonthCard).toContainText(/250[,.]50/);
      });

      await test.step("confirmar persistencia luego de recargar", async () => {
        await page.reload();
        await page.getByRole("button", { name: /^Ingresos$/i }).click();
        await expect(
          page
            .locator('div[data-testid^="income-source-"]')
            .filter({ hasText: sourceName })
            .first(),
        ).toBeVisible();
        await expect(
          page.getByText(oneOffLabel, { exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath("ingresos-persistidos.png"),
          fullPage: true,
        });
      });
    } finally {
      const { from, to } = monthRange();
      const overviewResponse = await request.get(
        `${API_BASE_URL}/api/incomes/overview?from=${from}&to=${to}`,
      );

      if (overviewResponse.ok()) {
        const overview = (await overviewResponse.json()) as {
          sources: Array<{ id: string; name: string }>;
          months: Array<{
            oneOffs: Array<{ id: string; label: string }>;
          }>;
        };

        const oneOffIds = overview.months.flatMap((month) =>
          month.oneOffs
            .filter((event) => event.label === oneOffLabel)
            .map((event) => event.id),
        );

        for (const eventId of new Set(oneOffIds)) {
          await request.delete(`${API_BASE_URL}/api/incomes/events/${eventId}`);
        }

        const source = overview.sources.find(
          (item) => item.name === sourceName,
        );
        if (source) {
          await request.delete(
            `${API_BASE_URL}/api/incomes/sources/${source.id}`,
          );
        }
      }
    }
  });
});
