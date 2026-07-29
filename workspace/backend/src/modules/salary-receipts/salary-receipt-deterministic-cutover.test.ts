import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeSalaryAmount,
  recalculateSalaryReceiptPreview,
} from "./salary-receipt-extraction.service.js";

describe("deterministic salary receipt cutover", () => {
  it("keeps the active extraction and persistence flow free of AI dependencies", async () => {
    const moduleDir = path.resolve(process.cwd(), "src/modules/salary-receipts");
    const [extractionSource, serviceSource] = await Promise.all([
      fs.readFile(path.join(moduleDir, "salary-receipt-extraction.service.ts"), "utf8"),
      fs.readFile(path.join(moduleDir, "salary-receipts.service.ts"), "utf8"),
    ]);

    expect(extractionSource).not.toMatch(/modules\/ai|\.\.\/ai\//);
    expect(serviceSource).not.toContain("aiExtractionRun.create");
    expect(serviceSource).toContain("aiRunId: null");
  });

  it("recalculates edited concepts with exact cents", () => {
    const preview = recalculateSalaryReceiptPreview({
      version: "salary-receipt-v1",
      documentType: "salary_receipt_pdf",
      source: {
        employerName: "Empresa SA",
        employerTaxId: null,
        employeeName: "Persona Prueba",
        employeeTaxId: null,
        periodMonthKey: "2026-07",
        payDate: null,
        currency: "ARS",
      },
      summary: {
        grossAmount: "0.00",
        deductionsAmount: "0.00",
        netAmount: "0.00",
      },
      items: [
        {
          id: "earning",
          displayOrder: 8,
          kind: "earning",
          code: null,
          label: "Sueldo",
          amount: "1.234,56",
          sourcePage: 1,
          originalText: "Sueldo 1.234,56",
          confidence: null,
        },
        {
          id: "deduction",
          displayOrder: 4,
          kind: "deduction",
          code: null,
          label: "Descuento",
          amount: "234,56",
          sourcePage: 1,
          originalText: "Descuento 234,56",
          confidence: null,
        },
      ],
      warnings: [],
    });

    expect(preview.summary).toEqual({
      grossAmount: "1234.56",
      deductionsAmount: "234.56",
      netAmount: "1000.00",
    });
    expect(preview.items.map((item) => item.displayOrder)).toEqual([1, 2]);
    expect(normalizeSalaryAmount("$ 1.234,56")).toBe("1234.56");
  });
});
