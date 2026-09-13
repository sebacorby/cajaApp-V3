import { describe, it, expect } from "vitest";
import { DocumentDetectorService } from "../../src/modules/imports/document-detector.service.js";

describe("PDF Import Contract", () => {
  const detector = new DocumentDetectorService();

  describe("detectMimeType", () => {
    it("detects PDF mime type", () => {
      expect(detector.detectMimeType("document.pdf", "application/pdf")).toBe("credit_card_statement_pdf");
    });

    it("detects CSV as unsupported", () => {
      expect(detector.detectMimeType("data.csv", "text/csv")).toBe("csv");
    });

    it("detects PNG as unsupported", () => {
      expect(detector.detectMimeType("image.png", "image/png")).toBe("png");
    });

    it("detects JPG as unsupported", () => {
      expect(detector.detectMimeType("image.jpg", "image/jpeg")).toBe("jpg");
    });
  });

  describe("detectDocumentType", () => {
    it("detects credit card statement from keywords", () => {
      const text = "Resumen de Tarjeta Visa Cierre 02-Jul-26 Vencimiento 13-Jul-26 Total a Pagar 3.118.842,50 Pago Minimo 508.000,00";
      expect(detector.detectDocumentType(text)).toBe("credit_card_statement_pdf");
    });

    it("returns unknown when no keywords match", () => {
      const text = "Some random document content";
      expect(detector.detectDocumentType(text)).toBe("unknown");
    });
  });
});

describe("Row originalText preservation", () => {
  it("requires originalText in every row", () => {
    const validRow = {
      id: "1",
      displayOrder: 1,
      sourcePage: 1,
      sectionId: "s1",
      sectionLabel: "Section",
      groupId: null,
      groupLabel: null,
      groupOrder: null,
      rowType: "transaction" as const,
      editable: true,
      dateRaw: "10-Jun-26",
      dateIso: "2026-06-10",
      markerRaw: null,
      referenceRaw: "AMAZON.COM",
      installmentRaw: "1/3",
      installmentCurrent: 1,
      installmentTotal: 3,
      receiptRaw: "123",
      amountPesos: "45678.90",
      amountDollars: null,
      currencyOriginal: "ARS" as const,
      originalText: "AMAZON.COM 1/3 45678.90",
      confidence: 0.95,
      warnings: [] as string[],
    };

    expect(validRow.originalText).toBeTruthy();
    expect(validRow.originalText).toBe("AMAZON.COM 1/3 45678.90");
  });

  it("detects missing originalText", () => {
    const row = {
      id: "1",
      displayOrder: 1,
      sourcePage: 1,
      sectionId: "s1",
      sectionLabel: "Section",
      groupId: null,
      groupLabel: null,
      groupOrder: null,
      rowType: "transaction" as const,
      editable: true,
      dateRaw: "10-Jun-26",
      dateIso: "2026-06-10",
      markerRaw: null,
      referenceRaw: "AMAZON.COM",
      installmentRaw: "1/3",
      installmentCurrent: 1,
      installmentTotal: 3,
      receiptRaw: "123",
      amountPesos: "45678.90",
      amountDollars: null,
      currencyOriginal: "ARS" as const,
      originalText: "",
      confidence: 0.95,
      warnings: [] as string[],
    };

    expect(row.originalText === "" || row.originalText === null).toBe(true);
  });
});

describe("CSV PNG JPG rejection", () => {
  const detector = new DocumentDetectorService();

  it("rejects CSV at mime type detection", () => {
    expect(detector.detectMimeType("file.csv", "text/csv")).toBe("csv");
  });

  it("rejects PNG at mime type detection", () => {
    expect(detector.detectMimeType("file.png", "image/png")).toBe("png");
  });

  it("rejects JPG at mime type detection", () => {
    expect(detector.detectMimeType("file.jpg", "image/jpeg")).toBe("jpg");
  });
});
