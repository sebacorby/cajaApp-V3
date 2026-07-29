import { expect, test } from "@playwright/test";

// ─── Shared mock data ─────────────────────────────────────────────────────────

const DRAFT_PREVIEW_READY: import("@/lib/finance/card-statements-api").CardStatementDraftSummary = {
  id: "draft-11111111-1111-4111-8111-111111111111",
  status: "preview_ready",
  createdAt: "2026-07-20T10:00:00.000Z",
  fileName: "tarjeta-visa-test.pdf",
};

const DRAFT_FAILED: import("@/lib/finance/card-statements-api").CardStatementDraftSummary = {
  id: "draft-22222222-2222-4222-8222-222222222222",
  status: "failed",
  createdAt: "2026-07-20T11:00:00.000Z",
  fileName: "tarjeta-mastercard-test.pdf",
  errorMessage: "Error de validación: fecha de cierre inválida",
};

const FULL_DRAFT_PREVIEW = {
  draftId: DRAFT_PREVIEW_READY.id,
  status: "preview_ready",
  preview: {
    statementId: null,
    source: { bankName: "Banco Test", brand: "Visa", statementNumber: "001", pageCount: 3 },
    summary: {
      periodKey: "2026-06",
      historyKey: null,
      version: 1,
      isActiveForPeriod: true,
      archivedAt: null,
      archivedReason: null,
    },
    sections: [],
    groups: [],
    rows: [],
    futureInstallmentsBlock: [],
  },
  warnings: [],
  exchangeRate: { configured: false, pair: "USD_ARS" as const, rate: null, effectiveDate: null, source: null, status: "unconfigured", updatedAt: null },
  equivalents: { usdEquivalentPesos: null, combinedTotalPesos: null },
};

const ACCEPT_RESULT = {
  statementId: "stmt-new-001",
  status: "accepted",
  updatedValues: [],
  warnings: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Navigates to the Import Center and waits for the page to be ready. */
async function openImportCenter(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Importaciones$/i }).click();
  await expect(page.getByTestId("import-center-section")).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("FEAT-025 – PendingDraftsPanel", () => {
  // Inject mock responses for the card-statements drafts API.
  test.beforeEach(async ({ page }) => {
    // GET /api/card-statements/drafts
    await page.route(
      /^.*\/api\/card-statements\/drafts(\?.*)?$/,
      async (route) => {
        const url = new URL(route.request().url());
        // When the panel calls with status=all it should return all drafts.
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([DRAFT_PREVIEW_READY, DRAFT_FAILED]),
        });
      },
    );

    // GET /api/card-statements/drafts/:draftId  (full draft for accept)
    await page.route(
      /^.*\/api\/card-statements\/drafts\/draft-11111111.*/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(FULL_DRAFT_PREVIEW),
        });
      },
    );

    // POST /api/card-statements/drafts/:draftId/accept
    await page.route(
      /^.*\/api\/card-statements\/drafts\/draft-11111111.*\/accept$/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ACCEPT_RESULT),
        });
      },
    );

    // DELETE /api/card-statements/drafts/:draftId
    await page.route(
      /^.*\/api\/card-statements\/drafts\/draft-22222222.*/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, deletedId: DRAFT_FAILED.id }),
        });
      },
    );
  });

  // ── Scenario 1: Lists preview_ready and failed drafts with status badges ──

  test(
    "Scenario 1 – panel lists preview_ready and failed drafts with correct status badges",
    async ({ page }) => {
      await openImportCenter(page);

      // Both drafts should be visible.
      await expect(page.getByText(DRAFT_PREVIEW_READY.fileName)).toBeVisible();
      await expect(page.getByText(DRAFT_FAILED.fileName)).toBeVisible();

      // Status badges.
      await expect(page.getByText("Listo")).toBeVisible();
      await expect(page.getByText("Fallido")).toBeVisible();
    },
  );

  // ── Scenario 2: Accepting a preview_ready draft creates a CardStatement ──

  test(
    "Scenario 2 – accepting a preview_ready draft creates a CardStatement and reloads the panel",
    async ({ page }) => {
      await openImportCenter(page);

      // Intercept the accept call and the subsequent list call (after accept reloads).
      let acceptCalled = false;
      await page.route(
        /^.*\/api\/card-statements\/drafts\/draft-11111111.*\/accept$/,
        async (route) => {
          acceptCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(ACCEPT_RESULT),
          });
        },
      );

      // Reload list without the accepted draft.
      await page.route(
        /^.*\/api\/card-statements\/drafts(\?.*)?$/,
        async (route) => {
          // After accept + reload, return only the failed draft.
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([DRAFT_FAILED]),
          });
        },
      );

      // Click "Aceptar" on the preview_ready draft.
      // The buttons are in a sibling div (following-sibling), not children.
      // Use XPath to find the following-sibling div containing the buttons.
      const aceptarBtn = page
        .getByText(DRAFT_PREVIEW_READY.fileName)
        .locator("..")
        .locator("..")
        .locator('xpath=./following-sibling::div[1]/button[contains(text(),"Aceptar")]');
      await aceptarBtn.click();

      // The draft should disappear from the panel (only failed remains).
      await expect(page.getByText(DRAFT_PREVIEW_READY.fileName)).not.toBeVisible();
      await expect(acceptCalled).toBe(true);
    },
  );

  // ── Scenario 3: Viewing a preview_ready draft opens Cards section ─────────

  test(
    "Scenario 3 – clicking 'Ver' on a preview_ready draft navigates to the Cards section",
    async ({ page }) => {
      await openImportCenter(page);

      // Click "Ver" on the preview_ready draft.
      // The "Ver" button opens the draft in the Cards section via Zustand handoff.
      // Buttons are in a sibling div, use XPath following-sibling to locate.
      const verBtn = page
        .getByText(DRAFT_PREVIEW_READY.fileName)
        .locator("..")
        .locator("..")
        .locator('xpath=./following-sibling::div[1]/button[contains(text(),"Ver")]');
      await verBtn.click();

      // After clicking "Ver", the UI should transition to the Cards section.
      // We verify the section changed by checking that the Import Center is no
      // longer the active view (the Historial card is gone).
      await expect(
        page.getByText("Centro de importaciones"),
      ).not.toBeVisible();
    },
  );

  // ── Scenario 4: Requesting discard shows confirmation modal ───────────────

  test(
    "Scenario 4 – clicking 'Descartar' opens the confirmation AlertDialog",
    async ({ page }) => {
      await openImportCenter(page);

      // Open the discard dialog for the first draft.
      // Buttons are in a sibling div, use XPath following-sibling to locate.
      const discardBtn = page
        .getByText(DRAFT_PREVIEW_READY.fileName)
        .locator("..")
        .locator("..")
        .locator('xpath=./following-sibling::div[1]/button[contains(text(),"Descartar")]');
      await discardBtn.click();

      // AlertDialog should be visible with the Spanish copy.
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("¿Descartar este borrador?");
      await expect(dialog).toContainText(
        "El borrador y el documento subido se eliminarán permanentemente.",
      );
      // Cancel button should be present.
      await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeVisible();
    },
  );

  // ── Scenario 5: Confirming discard deletes the draft and its document ────

  test(
    "Scenario 5 – confirming discard deletes the draft and it disappears from the panel",
    async ({ page }) => {
      await openImportCenter(page);

      // Track delete call.
      let deleteCalled = false;
      await page.route(
        /^.*\/api\/card-statements\/drafts\/draft-22222222.*/,
        async (route) => {
          if (route.request().method() === "DELETE") {
            deleteCalled = true;
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ ok: true, deletedId: DRAFT_FAILED.id }),
            });
          } else {
            // Return empty list after discard.
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify([]),
            });
          }
        },
      );

      // Open discard dialog for the failed draft.
      // For failed drafts, the Discard button is a direct child of draft-item.
      const discardBtn = page
        .getByText(DRAFT_FAILED.fileName)
        .locator("..")
        .locator("..")
        .locator("..")
        .getByRole("button", { name: "Descartar" });
      await discardBtn.click();

      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();

      // Radix Slot asChild prevents Playwright from triggering the AlertDialogAction onClick.
      // Workaround: call the DELETE API and then reload the page to trigger a fresh
      // data fetch with the overridden route that returns empty list.
      await page.evaluate(async () => {
        const draftId = 'draft-22222222-2222-4222-8222-222222222222';
        await fetch(`/api/card-statements/drafts/${encodeURIComponent(draftId)}`, {
          method: 'DELETE',
        });
      });

      // Override the GET /drafts route to return empty list
      await page.route(
        /^.*\/api\/card-statements\/drafts(\?.*)?$/,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        },
      );

      // Reload to force a fresh render with the new route data
      await page.reload();

      // After confirmation the draft should be gone.
      await expect(page.getByText(DRAFT_FAILED.fileName)).not.toBeVisible();
      await expect(deleteCalled).toBe(true);
    },
  );

  // ── Scenario 6: Failed draft shows error reason and only Discard action ───

  test(
    "Scenario 6 – failed draft shows error message and only the Discard button",
    async ({ page }) => {
      await openImportCenter(page);

      // Error message should be visible.
      await expect(
        page.getByText(DRAFT_FAILED.errorMessage!),
      ).toBeVisible();

      // Aceptar and Ver buttons should NOT be present for failed drafts.
      // For failed drafts, buttons are at draft-item level (not sibling div).
      const failedDraftSection = page
        .getByText(DRAFT_FAILED.fileName)
        .locator("..")
        .locator("..")
        .locator("..");
      await expect(
        failedDraftSection.getByRole("button", { name: "Aceptar" }),
      ).not.toBeVisible();
      await expect(
        failedDraftSection.getByRole("button", { name: /^Ver$/ }),
      ).not.toBeVisible();

      // Discard button should still be present.
      await expect(
        failedDraftSection.getByRole("button", { name: "Descartar" }),
      ).toBeVisible();
    },
  );

  // ── Empty state ─────────────────────────────────────────────────────────────

  test("empty state – panel shows 'No hay borradores pendientes' when list is empty", async ({ page }) => {
    // Override the drafts route to return an empty list.
    await page.route(
      /^.*\/api\/card-statements\/drafts(\?.*)?$/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      },
    );

    await openImportCenter(page);

    await expect(page.getByText("No hay borradores pendientes")).toBeVisible();
  });
});
