import { expect, test, type Page, type Route } from "@playwright/test";
import type { MonthCloseItem } from "../src/lib/finance/month-close-api";

const CLOSE_ID = "22222222-2222-4222-8222-222222222222";

function closeFixture(status: "closed" | "reopened" = "closed"): MonthCloseItem {
  const summary = {
    monthKey: "2026-06",
    movements: 3,
    income: {
      all: { ARS: "200000", USD: "2050" },
      actual: { ARS: "180000", USD: "0" },
      pending: { ARS: "0", USD: "2050" },
      projected: { ARS: "20000", USD: "0" },
    },
    expense: {
      all: { ARS: "123456", USD: "0" },
      actual: { ARS: "123456", USD: "0" },
      pending: { ARS: "0", USD: "0" },
      projected: { ARS: "0", USD: "0" },
    },
    balance: {
      all: { ARS: "76544", USD: "2050" },
      actual: { ARS: "56544", USD: "0" },
      pending: { ARS: "0", USD: "2050" },
      projected: { ARS: "20000", USD: "0" },
    },
    sources: { manual_cash: 1, salary_receipt: 2 },
    openReconciliations: 0,
  };

  return {
    id: CLOSE_ID,
    monthKey: "2026-06",
    version: 1,
    status,
    active: status === "closed",
    summary,
    sourceFingerprint: "a".repeat(64),
    canReopen: status === "closed",
    closedAt: "2026-07-17T12:00:00.000Z",
    reopenedAt:
      status === "reopened" ? "2026-07-17T12:05:00.000Z" : null,
    createdAt: "2026-07-17T12:00:00.000Z",
    updatedAt: "2026-07-17T12:00:00.000Z",
    snapshot: {
      version: "month-close-v1",
      monthKey: "2026-06",
      range: { from: "2026-06-01", to: "2026-06-30" },
      generatedAt: "2026-07-17T12:00:00.000Z",
      summary,
      movements: [
        { id: "manual:1" },
        { id: "salary:1" },
        { id: "salary:2" },
      ],
      settings: { timezone: "America/Argentina/Tucuman" },
      goals: [{ id: "goal-1" }],
      budgets: [{ id: "budget-1" }],
      cardStatements: [{ id: "card-1" }],
      salaryReceipts: [{ id: "salary-1" }],
    },
    activities: [],
  };
}

async function openDesktopSection(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: /^Cierres$/i }).click();
  await expect(page.getByTestId("month-close-section")).toBeVisible();
}

async function openMobileSection(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: /^Cierres$/i }).click();
  await expect(page.getByTestId("month-close-section")).toBeVisible();
}

test("Cierres crea un snapshot, muestra ARS/USD y reabre sólo la versión autorizada", async ({
  page,
}: {
  page: Page;
}) => {
  let item: MonthCloseItem | null = null;
  let createBody: unknown = null;

  await page.route("**/api/month-close**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "POST" && url.pathname === "/api/month-close") {
      createBody = request.postDataJSON();
      item = closeFixture();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith(`/${CLOSE_ID}/reopen`)
    ) {
      item = closeFixture("reopened");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    if (url.pathname.endsWith(`/${CLOSE_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item ?? closeFixture()),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: item ? [item] : [],
        pagination: {
          limit: 100,
          offset: 0,
          total: item ? 1 : 0,
          hasMore: false,
        },
      }),
    });
  });

  await openDesktopSection(page);

  const table = page.getByRole("table", {
    name: "Historial de cierres mensuales",
  });
  await expect(table).toContainText("Todavía no hay cierres mensuales.");

  await page.getByLabel("Mes a cerrar").fill("2026-06");
  await page.getByTestId("create-month-close").click();
  await expect.poll(() => createBody).toEqual({ monthKey: "2026-06" });
  await expect(
    page.getByRole("status").filter({ hasText: "Cierre 2026-06 v1 creado" }),
  ).toBeVisible();

  const row = page.getByTestId("month-close-row-2026-06");
  await expect(row).toContainText("$ 765,44");
  await expect(row).toContainText("US$ 20,50");
  await expect(row).toContainText("3");
  await expect(page.getByTestId("month-close-detail")).toContainText(
    "Objetivos",
  );
  await expect(page.getByTestId("month-close-detail")).toContainText(
    "Huella aaaaaaaaaaaaaaaa",
  );

  let confirmation = "";
  page.once("dialog", async (dialog) => {
    confirmation = dialog.message();
    await dialog.accept();
  });
  await page.getByTestId("reopen-2026-06").click();
  await expect.poll(() => confirmation).toContain("¿Reabrir 2026-06 v1?");
  await expect(
    page.getByRole("status").filter({ hasText: "fue reabierto" }),
  ).toBeVisible();
  await expect(row).toContainText("Reabierto");
  await expect(page.getByTestId("reopen-2026-06")).toHaveCount(0);
});

test("Cierres recupera errores y conserva acciones por teclado en mobile", async ({
  page,
}: {
  page: Page;
}) => {
  let item = closeFixture();
  let listAttempts = 0;
  let confirmation = "";

  await page.route("**/api/month-close**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (
      request.method() === "POST" &&
      url.pathname.endsWith(`/${CLOSE_ID}/reopen`)
    ) {
      item = closeFixture("reopened");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    if (url.pathname.endsWith(`/${CLOSE_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    listAttempts += 1;
    if (listAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [item],
        pagination: { limit: 100, offset: 0, total: 1, hasMore: false },
      }),
    });
  });

  await openMobileSection(page);

  await expect(
    page
      .getByTestId("month-close-section")
      .getByRole("alert")
      .filter({ hasText: "Servicio temporalmente no disponible" }),
  ).toBeVisible();
  const retry = page.getByRole("button", {
    name: "Reintentar carga de cierres",
  });
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");

  const card = page.getByTestId(`month-close-card-${CLOSE_ID}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText("Saldo ARS");
  await expect(card).toContainText("Saldo USD");

  const detailButton = page.getByRole("button", {
    name: "Ver detalle del cierre 2026-06 versión 1",
  });
  await detailButton.focus();
  await expect(detailButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("month-close-detail")).toContainText(
    "Detalle histórico",
  );

  page.once("dialog", async (dialog) => {
    confirmation = dialog.message();
    await dialog.accept();
  });
  const reopenButton = page.getByRole("button", {
    name: "Reabrir cierre 2026-06 versión 1",
  });
  await reopenButton.focus();
  await expect(reopenButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect.poll(() => confirmation).toContain("snapshot queda en el historial");
  await expect(card).toContainText("Reabierto");
});
