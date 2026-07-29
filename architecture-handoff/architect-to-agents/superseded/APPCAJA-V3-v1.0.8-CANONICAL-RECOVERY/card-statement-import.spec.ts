import { test, expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parseFinancialAmount } from "../../src/lib/finance/financial-amount";


const pdfPath = path.resolve(
  __dirname,
  "../../../../docs/08-artifacts/visa-galicia-julio2026.pdf",
);


async function createUniquePdf(testInfo: TestInfo): Promise<string> {
  const targetPath = testInfo.outputPath(
    `visa-galicia-e2e-${Date.now()}-${randomUUID()}.pdf`,
  );
  const source = await readFile(pdfPath);
  const marker = Buffer.from(
    `\n% CajaApp E2E ${new Date().toISOString()} ${randomUUID()}\n`,
    "utf8",
  );
  await writeFile(targetPath, Buffer.concat([source, marker]));
  return targetPath;
}


type BrowserEvidence = {
  console: Array<{ type: string; text: string }>;
  pageErrors: string[];
  failedRequests: Array<{ method: string; url: string; failure?: string }>;
  importResponses: Array<{
    method: string;
    url: string;
    status: number;
    body?: unknown;
  }>;
};


function collectEvidence(page: Page): BrowserEvidence {
  const evidence: BrowserEvidence = {
    console: [],
    pageErrors: [],
    failedRequests: [],
    importResponses: [],
  };


  page.on("console", (message) => {
    evidence.console.push({
      type: message.type(),
      text: message.text(),
    });
  });


  page.on("pageerror", (error) => {
    evidence.pageErrors.push(error.stack ?? error.message);
  });


  page.on("requestfailed", (request) => {
    evidence.failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  });


  page.on("response", async (response) => {
    if (!response.url().includes("/api/card-statements/import")) {
      return;
    }


    let body: unknown;


    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }


    evidence.importResponses.push({
      method: response.request().method(),
      url: response.url(),
      status: response.status(),
      body,
    });
  });


  return evidence;
}


async function attachEvidence(
  testInfo: TestInfo,
  evidence: BrowserEvidence,
): Promise<void> {
  await testInfo.attach("browser-evidence.json", {
    body: Buffer.from(JSON.stringify(evidence, null, 2), "utf8"),
    contentType: "application/json",
  });
}


test.describe("card statement import", () => {
  test("imports Galicia Visa PDF and renders the real preview", async ({
    page,
  }, testInfo) => {
    test.setTimeout(12 * 60 * 1000);
    const evidence = collectEvidence(page);
    const uniquePdfPath = await createUniquePdf(testInfo);


    try {
      await test.step("open card statements", async () => {
        await page.goto("/");
        await page.getByRole("button", { name: /tarjetas/i }).click();
        await expect(
          page.getByTestId("card-statement-file-input"),
        ).toBeAttached();
      });


      await test.step("select PDF and start import", async () => {
        await page
          .getByTestId("card-statement-file-input")
          .setInputFiles(uniquePdfPath);


        const importResponsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            /\/api\/card-statements\/import$/.test(response.url()),
        );
        await page.getByTestId("card-statement-import-submit").click();
        const importResponse = await importResponsePromise;
        expect(importResponse.ok(), await importResponse.text()).toBeTruthy();


        await expect(
          page.getByTestId("card-statement-import-state"),
        ).toContainText(/procesando|analizando|extrayendo/i, {
          timeout: 10_000,
        });


        await page.screenshot({
          path: testInfo.outputPath("01-processing.png"),
          fullPage: true,
        });
      });


      await test.step("wait for real preview", async () => {
        await expect(page.getByTestId("card-statement-preview")).toBeVisible({
          timeout: 9 * 60 * 1000,
        });


        await expect(
          page.getByTestId("card-statement-import-state"),
        ).toHaveCount(0);
      });


      await test.step("validate extracted content", async () => {
        const bankNameText = await page
          .getByTestId("card-statement-bank-name")
          .innerText();
        const brandText = await page
          .getByTestId("card-statement-brand")
          .innerText();


        expect(bankNameText.toLowerCase()).toContain("galicia");
        expect(brandText.toLowerCase()).toContain("visa");


        const pesosText = await page
          .getByTestId("card-statement-total-pesos")
          .innerText();


        const dollarsText = await page
          .getByTestId("card-statement-total-dollars")
          .innerText();


        expect(parseFinancialAmount(pesosText)).toBeCloseTo(3_118_842.5, 2);
        expect(parseFinancialAmount(dollarsText)).toBeCloseTo(161.84, 2);


        const groupCount = await page
          .getByTestId("card-statement-group")
          .count();
        expect(groupCount).toBe(4);


        const rowCount = await page.getByTestId("card-statement-row").count();
        expect(rowCount).toBeGreaterThanOrEqual(125);


        const erroneousValue = await page.getByText(/311\.884\.250,00/).count();
        expect(erroneousValue).toBe(0);
      });


      await page.screenshot({
        path: testInfo.outputPath("02-preview-ready.png"),
        fullPage: true,
      });


      expect(evidence.pageErrors).toEqual([]);
      expect(
        evidence.importResponses.some(
          (item) =>
            item.status === 200 &&
            typeof item.body === "object" &&
            item.body !== null &&
            (item.body as Record<string, unknown>).status === "preview_ready",
        ),
      ).toBe(true);
    } finally {
      await attachEvidence(testInfo, evidence);
    }
  });


  test("stops polling and offers retry when extraction fails", async ({
    page,
  }, testInfo) => {
    const evidence = collectEvidence(page);
    let statusRequests = 0;


    await page.route("**/api/card-statements/import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }


      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-failed-draft",
          pageCount: 8,
        }),
      });
    });


    await page.route(
      "**/api/card-statements/import/e2e-failed-draft/status",
      async (route) => {
        statusRequests += 1;


        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            draftId: "e2e-failed-draft",
            status: "failed",
            error: {
              stage: "extracting",
              message: "No se pudo procesar el resumen de prueba.",
            },
          }),
        });
      },
    );


    try {
      await page.goto("/");
      await page.getByRole("button", { name: /tarjetas/i }).click();
      await page
        .getByTestId("card-statement-file-input")
        .setInputFiles(pdfPath);
      await page.getByTestId("card-statement-import-submit").click();


      await expect(page.getByTestId("card-statement-error")).toContainText(
        "No se pudo procesar el resumen de prueba.",
      );


      await expect(page.getByTestId("card-statement-retry")).toBeVisible();


      const requestsWhenFailed = statusRequests;
      await page.waitForTimeout(5_000);
      expect(statusRequests).toBe(requestsWhenFailed);
      expect(statusRequests).toBe(1);


      await page.screenshot({
        path: testInfo.outputPath("03-failed-with-retry.png"),
        fullPage: true,
      });


      expect(evidence.pageErrors).toEqual([]);
    } finally {
      await attachEvidence(testInfo, evidence);
    }
  });
});