import { expect, test, type Page, type Route } from "@playwright/test";

// ─── FEAT-029 — Bulk delete future debt rows (E2E)
//
// These tests cover the 5 UI scenarios for FEAT-029:
//   1. Each future debt row displays a checkbox
//   2. User can select an individual row
//   3. User can select all rows at once
//   4. User clicks delete and sees inline confirmation
//   5. User cancels the deletion
//
// Tests use route interception (no real backend) and mount the FutureDebtView
// via the test fixture page at /test/future-debt, which keeps the production
// section router untouched.

const TEST_URL = "/test/future-debt";

// ─── Shared mock data ─────────────────────────────────────────────────────────

function buildRow(overrides: Partial<import("@/lib/finance/future-debt-api").FutureDebtRow> = {}) {
  return {
    id: "row-1",
    monthKey: "2026-08",
    description: "Compra en restaurante",
    installmentNumber: 1,
    installmentTotal: 1,
    installmentLabel: "1/1",
    amount: "5000.00",
    currency: "ARS" as const,
    originType: "card_statement" as const,
    originReference: "stmt-001",
    sourceLabel: "Visa Galicia •••• 1234",
    cardId: "stmt-1:group-1",
    cardLast4: "1234",
    holderName: "JAVI",
    cardLabel: "Visa Galicia •••• 1234",
    status: "confirmed" as const,
    rowType: "future_installment" as const,
    ...overrides,
  };
}

function buildCard(overrides: Partial<import("@/lib/finance/future-debt-api").FutureDebtCard> = {}) {
  return {
    cardId: "stmt-1:group-1",
    cardLast4: "1234",
    holderName: "JAVI",
    cardLabel: "Visa Galicia •••• 1234",
    rows: [buildRow()],
    totals: { ars: "5000.00", usd: "0.00" },
    ...overrides,
  };
}

function buildMonth(overrides: Partial<import("@/lib/finance/future-debt-api").FutureDebtMonth> = {}) {
  return {
    monthKey: "2026-08",
    label: "Agosto 2026",
    totals: { ars: "5000.00", usd: "0.00" },
    cards: [buildCard()],
    dataQuality: { status: "complete" as const, warnings: [] },
    ...overrides,
  };
}

function buildResponse(overrides: Partial<import("@/lib/finance/future-debt-api").FutureDebtResponse> = {}) {
  return {
    range: {
      from: "2026-08",
      to: "2027-01",
      months: 6,
      includeCurrentPeriod: false,
      currentPeriodKey: "2026-07",
    },
    summary: { ars: "5000.00", usd: "0.00" },
    horizon: { persisted: true, persistedMonths: ["2026-08", "2026-09"] },
    months: [buildMonth()],
    pendientes: { rows: [], diagnostics: [] },
    diagnostics: {
      duplicateOccurrences: 0,
      invalidInstallmentRows: 0,
      missingCurrencyRows: 0,
      missingCardRows: 0,
      warnings: [],
    },
    ...overrides,
  };
}

function buildPendingRow(
  overrides: Partial<import("@/lib/finance/future-debt-api").FutureDebtPendingRow> = {},
) {
  return {
    id: "pending-1",
    monthKey: "2026-08",
    description: "Compra sin clasificar",
    installmentNumber: null,
    installmentTotal: null,
    installmentLabel: "—",
    amount: "100.00",
    currency: "ARS" as const,
    originType: "manual_card_purchase" as const,
    originReference: "manual-1",
    sourceLabel: "Manual",
    cardId: null,
    cardLast4: null,
    holderName: null,
    cardLabel: null,
    status: "estimated" as const,
    rowType: "future_installment" as const,
    diagnostic: "missing_card_reference" as const,
    diagnosticDetail: "Sin tarjeta asignada",
    ...overrides,
  };
}

function buildPendientes(
  rows: ReturnType<typeof buildPendingRow>[],
): import("@/lib/finance/future-debt-api").FutureDebtPendientes {
  return { rows, diagnostics: [] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function interceptSettings(page: Page): Promise<void> {
  await page.route("**/api/settings", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        displayName: "Javi",
        locale: "es-AR",
        timezone: "America/Argentina/Tucuman",
        defaultCurrency: "ARS",
        theme: "system",
        hideAmounts: false,
        updatedAt: "2026-07-24T00:00:00.000Z",
      }),
    });
  });
}

async function interceptFutureDebt(
  page: Page,
  build: () => ReturnType<typeof buildResponse>,
): Promise<void> {
  await interceptSettings(page);
  await page.route("**/api/future-debt**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(build()),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("FEAT-029 – Bulk delete future debt rows", () => {

  // Scenario 1: Each future debt row displays a checkbox
  test("Scenario 1 – each row displays a checkbox", async ({ page }) => {
    const row1 = buildRow({ id: "row-1", description: "Fila primera" });
    const row2 = buildRow({ id: "row-2", description: "Fila segunda" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [
        buildMonth({
          cards: [
            buildCard({ rows: [row1, row2] }),
          ],
        }),
      ],
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // Each row should have a checkbox (the Checkbox component renders an input[type=checkbox])
    const rowCheckboxes = page.getByTestId("future-debt-row").getByRole("checkbox");
    await expect(rowCheckboxes).toHaveCount(2);
  });

  // Scenario 2: User can select an individual row
  test("Scenario 2 – clicking a row checkbox selects it and shows the delete button", async ({ page }) => {
    const row1 = buildRow({ id: "row-1", description: "Fila seleccionable" });
    const row2 = buildRow({ id: "row-2", description: "Fila no seleccionada" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [
        buildMonth({
          cards: [
            buildCard({ rows: [row1, row2] }),
          ],
        }),
      ],
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // The delete button should not be visible yet (nothing selected)
    await expect(page.getByRole("button", { name: /Eliminar 0 filas/ })).not.toBeVisible();

    // Click the checkbox on row-1
    const row1Checkbox = page
      .getByTestId("future-debt-row")
      .filter({ has: page.getByText("Fila seleccionable") })
      .getByRole("checkbox");
    await row1Checkbox.click();

    // Now the delete button should appear with count 1
    await expect(page.getByRole("button", { name: /Eliminar 1 fila/ })).toBeVisible();

    // Row 2 should still be unchecked
    const row2Checkbox = page
      .getByTestId("future-debt-row")
      .filter({ has: page.getByText("Fila no seleccionada") })
      .getByRole("checkbox");
    await expect(row2Checkbox).not.toBeChecked();
  });

  // Scenario 3: User can select all rows at once (card-level select-all)
  test("Scenario 3 – card select-all checkbox selects all rows in that card", async ({ page }) => {
    const row1 = buildRow({ id: "row-1", description: "Primera" });
    const row2 = buildRow({ id: "row-2", description: "Segunda" });
    const row3 = buildRow({ id: "row-3", description: "Tercera" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [
        buildMonth({
          cards: [
            buildCard({ cardId: "card-1", rows: [row1, row2, row3] }),
          ],
        }),
      ],
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // Initially no selection
    await expect(page.getByRole("button", { name: /Eliminar 0 filas/ })).not.toBeVisible();

    // Click the card-level select-all checkbox
    const cardSelectAll = page
      .getByTestId("future-debt-card")
      .getByRole("checkbox")
      .first();
    await cardSelectAll.click();

    // All 3 rows should now be selected — delete button shows count 3
    await expect(page.getByRole("button", { name: /Eliminar 3 filas/ })).toBeVisible();

    // All row checkboxes should be checked
    const allCheckboxes = page.getByTestId("future-debt-row").getByRole("checkbox");
    await expect(allCheckboxes).toHaveCount(3);
    for (const cb of await allCheckboxes.all()) {
      await expect(cb).toBeChecked();
    }
  });

  // Scenario 4: User clicks delete and sees inline confirmation
  test("Scenario 4 – clicking 'Eliminar N filas' shows inline Confirmar/Cancelar", async ({ page }) => {
    const row1 = buildRow({ id: "row-1", description: "Para eliminar" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [
        buildMonth({
          cards: [
            buildCard({ rows: [row1] }),
          ],
        }),
      ],
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // Select the row first
    const rowCheckbox = page
      .getByTestId("future-debt-row")
      .getByRole("checkbox");
    await rowCheckbox.click();

    // Click "Eliminar 1 fila"
    const deleteBtn = page.getByRole("button", { name: /Eliminar 1 fila/ });
    await deleteBtn.click();

    // Should now show inline confirmation
    await expect(page.getByRole("button", { name: "Confirmar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar" })).toBeVisible();
    // The original button label should be replaced with the confirmation prompt
    await expect(page.getByText(/¿Eliminar 1 fila\?/)).toBeVisible();
  });

  // Scenario 5: User cancels the deletion
  test("Scenario 5 – clicking Cancelar returns to idle state and preserves selection", async ({ page }) => {
    const row1 = buildRow({ id: "row-1", description: "Fila a cancelar" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [
        buildMonth({
          cards: [
            buildCard({ rows: [row1] }),
          ],
        }),
      ],
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // Select the row
    const rowCheckbox = page
      .getByTestId("future-debt-row")
      .getByRole("checkbox");
    await rowCheckbox.click();
    await expect(page.getByRole("button", { name: /Eliminar 1 fila/ })).toBeVisible();

    // Click "Eliminar 1 fila" to enter confirming state
    await page.getByRole("button", { name: /Eliminar 1 fila/ }).click();
    await expect(page.getByRole("button", { name: "Confirmar" })).toBeVisible();

    // Click "Cancelar"
    await page.getByRole("button", { name: "Cancelar" }).click();

    // Should be back to idle — show the "Eliminar 1 fila" button again
    await expect(page.getByRole("button", { name: /Eliminar 1 fila/ })).toBeVisible();
    // Confirmar/Cancelar should be gone
    await expect(page.getByRole("button", { name: "Confirmar" })).not.toBeVisible();

    // Selection should still be active (count = 1)
    await expect(page.getByRole("button", { name: /Eliminar 1 fila/ })).toBeVisible();
  });

  // Scenario 6 (optional, requires server): User confirms and rows are deleted from DB
  test("Scenario 6 – confirming deletion calls DELETE API and rows disappear (server required)", async ({ page }) => {
    const row1 = buildRow({ id: "row-to-delete", description: "Fila a borrar" });
    const row2 = buildRow({ id: "row-to-keep", description: "Fila a mantener" });

    let deleteCalled = false;
    await interceptSettings(page);

    // Intercept future-debt GET
    await page.route("**/api/future-debt**", async (route: Route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildResponse({
            months: [
              buildMonth({
                cards: [
                  buildCard({ rows: [row1, row2] }),
                ],
              }),
            ],
          })),
        });
      } else {
        await route.continue();
      }
    });

    // Intercept DELETE /api/future-debt/rows/:id
    await page.route(
      /^.*\/api\/future-debt\/rows\/.*/,
      async (route: Route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true;
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      },
    );

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // Select row1
    const row1Checkbox = page
      .getByTestId("future-debt-row")
      .filter({ has: page.getByText("Fila a borrar") })
      .getByRole("checkbox");
    await row1Checkbox.click();
    await expect(page.getByRole("button", { name: /Eliminar 1 fila/ })).toBeVisible();

    // Enter confirming state and confirm
    await page.getByRole("button", { name: /Eliminar 1 fila/ }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    // DELETE should have been called
    expect(deleteCalled).toBe(true);
  });

});

// ─── Rebound 2 — UI polish ────────────────────────────────────────────────────
//
// Four visual/behavioural fixes applied to FutureDebtView.tsx:
//   Fix 1 — Visible checkboxes on light backgrounds (explicit bg + border-2)
//   Fix 2 — Select-all includes pendientes rows
//   Fix 3 — Reduce faded text in pendientes (main labels use text-foreground)
//   Fix 4 — Pendientes section header has a select-all checkbox

test.describe("Rebound 2 – UI polish", () => {

  // Fix 1 — Checkboxes have explicit background class
  test("Fix 1 – row checkboxes have explicit bg-background and border-2 classes", async ({ page }) => {
    const row1 = buildRow({ id: "row-1", description: "Fila primera" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [buildMonth({ cards: [buildCard({ rows: [row1] })] })],
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    const rowCheckbox = page
      .getByTestId("future-debt-row")
      .getByRole("checkbox")
      .first();
    await expect(rowCheckbox).toHaveClass(/bg-background/);
    await expect(rowCheckbox).toHaveClass(/border-2/);
  });

  // Fix 2 — Select-all includes pendientes
  test("Fix 2 – card select-all also selects pendientes rows", async ({ page }) => {
    const row1 = buildRow({ id: "row-confirmed", description: "Fila confirmada" });
    const pending1 = buildPendingRow({ id: "pending-1", description: "Pendiente uno" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [buildMonth({ cards: [buildCard({ rows: [row1] })] })],
      pendientes: buildPendientes([pending1]),
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // Click the card-level select-all (first checkbox inside the card test-id)
    const cardSelectAll = page
      .getByTestId("future-debt-card")
      .getByRole("checkbox")
      .first();
    await cardSelectAll.click();

    // The pendientes row checkbox should be checked (Fix 2 makes allRowIds include pendientes)
    const pendingCheckbox = page
      .getByTestId("future-debt-pending-row")
      .getByRole("checkbox")
      .first();
    await expect(pendingCheckbox).toBeChecked();

    // Delete button shows combined count = 2 (1 confirmed + 1 pendiente)
    await expect(page.getByRole("button", { name: /Eliminar 2 filas/ })).toBeVisible();
  });

  // Fix 3 — Pendientes description uses text-foreground (not muted)
  test("Fix 3 – pendientes description and amount use text-foreground; diagnostic detail stays muted", async ({ page }) => {
    const pending1 = buildPendingRow({
      id: "pending-1",
      description: "Compra sin clasificar",
      diagnosticDetail: "Sin tarjeta asignada",
    });
    await interceptFutureDebt(page, () => buildResponse({
      months: [],
      pendientes: buildPendientes([pending1]),
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    const pendingRow = page.getByTestId("future-debt-pending-row").first();

    // Main label (description) uses text-foreground, NOT muted
    const descSpan = pendingRow.locator("span.font-medium");
    await expect(descSpan).toHaveClass(/text-foreground/);
    await expect(descSpan).not.toHaveClass(/text-muted-foreground/);

    // Amount uses text-foreground
    const amountDiv = pendingRow.locator("div.text-right");
    await expect(amountDiv).toHaveClass(/text-foreground/);

    // Diagnostic detail (the <p>) stays muted by design
    const detailP = pendingRow.locator("p.text-xs");
    await expect(detailP).toHaveClass(/text-muted-foreground/);
  });

  // Fix 4 — Pendientes header has a select-all checkbox
  test("Fix 4 – pendientes section header has a select-all checkbox that selects pendientes rows", async ({ page }) => {
    const pending1 = buildPendingRow({ id: "pending-1", description: "Compra pendiente" });
    await interceptFutureDebt(page, () => buildResponse({
      months: [],
      pendientes: buildPendientes([pending1]),
    }));

    await page.goto(TEST_URL);
    await expect(page.getByTestId("future-debt-section")).toBeVisible();

    // The pendientes header has a select-all checkbox with the expected aria-label
    const headerCheckbox = page
      .getByTestId("future-debt-pendientes")
      .getByRole("checkbox", { name: "Seleccionar todas las filas pendientes" });
    await expect(headerCheckbox).toBeVisible();

    // Click it
    await headerCheckbox.click();

    // The pendientes row is now selected
    const pendingCheckbox = page
      .getByTestId("future-debt-pending-row")
      .getByRole("checkbox")
      .first();
    await expect(pendingCheckbox).toBeChecked();

    // Delete button appears
    await expect(page.getByRole("button", { name: /Eliminar 1 fila/ })).toBeVisible();
  });

});
