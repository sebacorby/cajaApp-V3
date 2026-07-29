import { describe, expect, it } from "vitest";
import type { PdfRawExtractionResult } from "../documents/pdf-raw-extractor.service.js";
import {
  DeterministicSalaryReceiptImportService,
  type SalaryReceiptRawExtractor,
} from "./deterministic-salary-receipt-import.service.js";
import {
  SalaryReceiptParserIncompleteError,
  SalaryReceiptPreviewValidationError,
  SalaryReceiptTextExtractionEmptyError,
} from "./salary-receipt-parser.errors.js";
import type { SalaryReceiptParser } from "./salary-receipt-parser.types.js";

function extraction(rawText: string): PdfRawExtractionResult {
  return {
    ok: true,
    engine: "pdfplumber",
    engineVersion: "test",
    pageCount: 1,
    textPageCount: rawText ? 1 : 0,
    emptyPageCount: rawText ? 0 : 1,
    characterCount: rawText.length,
    rawSha256: "abc123",
    rawText,
    durationMs: 5,
  };
}

function extractor(rawText: string): SalaryReceiptRawExtractor {
  return {
    extract: async () => extraction(rawText),
  };
}

function parser(overrides: Partial<SalaryReceiptParser> = {}): SalaryReceiptParser {
  return {
    id: "fixture-v1",
    version: "1.0.0",
    supports: () => true,
    parse: () => ({
      preview: {
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
          grossAmount: "1000.00",
          deductionsAmount: "200.00",
          netAmount: "800.00",
        },
        items: [
          {
            id: "basic",
            displayOrder: 1,
            kind: "earning",
            code: "001",
            label: "Sueldo básico",
            amount: "1000.00",
            sourcePage: 1,
            originalText: "001 Sueldo básico 1.000,00",
            confidence: null,
          },
        ],
        warnings: [],
      },
      diagnostics: {
        parserId: "fixture-v1",
        parserVersion: "1.0.0",
        pageCount: 1,
        sourceLineCount: 1,
        candidateConceptLineCount: 1,
        parsedConceptCount: 1,
        unexplainedMonetaryLineCount: 0,
        requiredFieldsFound: ["employerName", "employeeName", "periodMonthKey"],
        requiredFieldsMissing: [],
        warnings: [],
        totals: {
          printedGrossCents: 100000,
          calculatedGrossCents: 100000,
          printedDeductionsCents: 20000,
          calculatedDeductionsCents: 20000,
          printedNetCents: 80000,
          calculatedNetCents: 80000,
        },
        durationMs: 1,
      },
      parser: { id: "fixture-v1", version: "1.0.0" },
    }),
    ...overrides,
  };
}

describe("DeterministicSalaryReceiptImportService", () => {
  it("extracts, normalizes and parses a supported receipt", async () => {
    let receivedRawText = "";
    const service = new DeterministicSalaryReceiptImportService(
      [
        parser({
          supports: (input) => {
            receivedRawText = input.rawText;
            return true;
          },
        }),
      ],
      extractor(" EMPRESA   SA\r\nSUELDO  1.000,00 "),
    );

    const result = await service.import({
      pdfPath: "receipt.pdf",
      sourceFileName: "receipt.pdf",
    });

    expect(receivedRawText).toBe("EMPRESA SA\nSUELDO 1.000,00");
    expect(result.parser).toEqual({ id: "fixture-v1", version: "1.0.0" });
    expect(result.extraction.rawSha256).toBe("abc123");
  });

  it("fails when the PDF has no usable text", async () => {
    const service = new DeterministicSalaryReceiptImportService(
      [parser()],
      extractor("  \r\n\t "),
    );

    await expect(service.import({ pdfPath: "scan.pdf" })).rejects.toBeInstanceOf(
      SalaryReceiptTextExtractionEmptyError,
    );
  });

  it("fails closed when monetary lines remain unexplained", async () => {
    const base = parser();
    const service = new DeterministicSalaryReceiptImportService(
      [
        parser({
          parse: (input) => {
            const result = base.parse(input);
            return {
              ...result,
              diagnostics: {
                ...result.diagnostics,
                unexplainedMonetaryLineCount: 1,
              },
            };
          },
        }),
      ],
      extractor("receipt"),
    );

    await expect(service.import({ pdfPath: "receipt.pdf" })).rejects.toBeInstanceOf(
      SalaryReceiptParserIncompleteError,
    );
  });

  it("rejects a parser result that violates the canonical preview schema", async () => {
    const base = parser();
    const service = new DeterministicSalaryReceiptImportService(
      [
        parser({
          parse: (input) => {
            const result = base.parse(input);
            return {
              ...result,
              preview: {
                ...result.preview,
                source: {
                  ...result.preview.source,
                  periodMonthKey: "07-2026",
                },
              },
            };
          },
        }),
      ],
      extractor("receipt"),
    );

    await expect(service.import({ pdfPath: "receipt.pdf" })).rejects.toBeInstanceOf(
      SalaryReceiptPreviewValidationError,
    );
  });
});
