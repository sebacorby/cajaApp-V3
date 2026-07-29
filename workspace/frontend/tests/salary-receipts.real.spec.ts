import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";




const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";




const BASE_FIXTURE = path.resolve(
  __dirname,
  "../../../contracts/examples/salary-receipts/salary-receipt.sanitized.base.pdf",
);




test("Recibos de sueldo importa, acepta y anula un PDF real", async ({
  page,
  request,
}) => {
  test.setTimeout(480_000);




  let acceptedReceiptId: string | null = null;
  let reversed = false;




  try {
    await page.goto("/");
    await expect(page.getByText("CajaApp", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /^Ingresos$/i }).click();
    await expect(page.getByTestId("salary-receipts-panel")).toBeVisible();




    const fixtureBytes = await readFile(BASE_FIXTURE);
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const uniqueFixture = Buffer.concat([
      fixtureBytes,
      Buffer.from(`\n% CajaApp salary receipt E2E ${runId}\n`, "utf8"),
    ]);




    const importResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${BACKEND_BASE_URL}/api/salary-receipts/import` &&
        response.request().method() === "POST",
      { timeout: 420_000 },
    );




    await page.getByTestId("salary-receipt-file").setInputFiles({
      name: `salary-receipt-e2e-${runId}.pdf`,
      mimeType: "application/pdf",
      buffer: uniqueFixture,
    });




    const importResponse = await importResponsePromise;
    const importBody = await importResponse.text();
    expect(
      importResponse.status(),
      `POST /api/salary-receipts/import devolvió ${importResponse.status()}: ${importBody}`,
    ).toBe(201);




    const draft = JSON.parse(importBody) as {
      id: string;
      preview?: {
        source?: {
          employerName?: string;
          employeeName?: string;
          periodMonthKey?: string;
        };
      };
    };




    expect(draft.id).toBeTruthy();
    expect(draft.preview?.source?.periodMonthKey).toBe("2026-06");




    const preview = page.getByTestId("salary-receipt-preview");
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview.locator("input").nth(0)).toHaveValue(/EMPRESA DEMO S\.A\./i);
    await expect(preview.locator("input").nth(2)).toHaveValue(/PERSONA DE PRUEBA/i);
    await expect(preview.locator('input[type="month"]')).toHaveValue("2026-06");
    await expect.poll(
      async () =>
        preview.locator("input").evaluateAll((inputs) =>
          inputs.some((input) =>
            /Sueldo b[aá]sico/i.test((input as HTMLInputElement).value),
          ),
        ),
      {
        message: "El preview debe renderizar el concepto Sueldo básico en un campo editable",
        timeout: 15_000,
      },
    ).toBe(true);
    await expect(preview).toContainText("Neto a cobrar");
    await expect(preview.getByRole("checkbox")).toBeChecked();




    const acceptResponsePromise = page.waitForResponse(
      (response) =>
        response.url() ===
          `${BACKEND_BASE_URL}/api/salary-receipts/drafts/${draft.id}/accept` &&
        response.request().method() === "POST",
      { timeout: 60_000 },
    );




    await page.getByTestId("accept-salary-receipt").click();




    const acceptResponse = await acceptResponsePromise;
    const acceptBody = await acceptResponse.text();
    expect(
      acceptResponse.status(),
      `POST /accept devolvió ${acceptResponse.status()}: ${acceptBody}`,
    ).toBe(201);




    const accepted = JSON.parse(acceptBody) as {
      id: string;
      periodMonthKey: string;
      employerName: string;
      actualIncomeEventId: string | null;
      projectionIncomeEventId: string | null;
    };




    acceptedReceiptId = accepted.id;
    expect(accepted.periodMonthKey).toBe("2026-06");
    expect(accepted.employerName).toMatch(/EMPRESA DEMO S\.A\./i);
    expect(accepted.actualIncomeEventId).toBeTruthy();
    expect(accepted.projectionIncomeEventId).toBeTruthy();




    await expect(page.getByText(/Recibo 2026-06 aceptado/i)).toBeVisible();
    await expect(page.getByText(/2026-06 · EMPRESA DEMO S\.A\./i)).toBeVisible();




    page.once("dialog", (dialog) => dialog.accept());




    const reverseResponsePromise = page.waitForResponse(
      (response) =>
        response.url() ===
          `${BACKEND_BASE_URL}/api/salary-receipts/${acceptedReceiptId}/reverse` &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );




    await page.getByRole("button", { name: /^Anular$/i }).click();




    const reverseResponse = await reverseResponsePromise;
    const reverseBody = await reverseResponse.text();
    expect(
      reverseResponse.status(),
      `POST /reverse devolvió ${reverseResponse.status()}: ${reverseBody}`,
    ).toBe(200);




    reversed = true;
    await expect(
      page.getByText("Recibo anulado y movimientos vinculados eliminados."),
    ).toBeVisible();
  } finally {
    if (acceptedReceiptId && !reversed) {
      await request.post(
        `${BACKEND_BASE_URL}/api/salary-receipts/${acceptedReceiptId}/reverse`,
      );
    }
  }
});