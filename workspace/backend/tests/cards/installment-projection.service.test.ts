import { describe, it, expect } from "vitest";
import { InstallmentProjectionService } from "../../src/modules/projections/installment-projection.service.js";
import type { CardStatementRow } from "../../src/modules/cards/cards.types.js";

describe("InstallmentProjectionService", () => {
  const service = new InstallmentProjectionService();

  describe("parseInstallment", () => {
    it("parses 01/03 format", () => {
      const result = service.parseInstallment("01/03");
      expect(result.current).toBe(1);
      expect(result.total).toBe(3);
    });

    it("parses 02/03 format", () => {
      const result = service.parseInstallment("02/03");
      expect(result.current).toBe(2);
      expect(result.total).toBe(3);
    });

    it("parses 11/12 format", () => {
      const result = service.parseInstallment("11/12");
      expect(result.current).toBe(11);
      expect(result.total).toBe(12);
    });

    it("handles empty string as 1/1", () => {
      const result = service.parseInstallment("");
      expect(result.current).toBe(1);
      expect(result.total).toBe(1);
    });

    it("handles invalid format as 1/1", () => {
      const result = service.parseInstallment("invalid");
      expect(result.current).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getStatementMonthKey", () => {
    it("extracts month from latest transaction date", () => {
      const rows: CardStatementRow[] = [
        { id: "1", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "10-Jun-26", dateIso: "2026-06-10", markerRaw: null, referenceRaw: "A", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "100", amountDollars: null, currencyOriginal: "ARS", originalText: "A", confidence: null, warnings: [] },
        { id: "2", displayOrder: 2, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "25-Jun-26", dateIso: "2026-06-25", markerRaw: null, referenceRaw: "B", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "200", amountDollars: null, currencyOriginal: "ARS", originalText: "B", confidence: null, warnings: [] },
      ];
      expect(service.getStatementMonthKey(rows)).toBe("2026-06");
    });

    it("returns current month if no dates", () => {
      const rows: CardStatementRow[] = [
        { id: "1", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: null, dateIso: null, markerRaw: null, referenceRaw: "A", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "100", amountDollars: null, currencyOriginal: "ARS", originalText: "A", confidence: null, warnings: [] },
      ];
      const result = service.getStatementMonthKey(rows);
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe("calculateProjections", () => {
    it("does not project when installment is 01/01", () => {
      const rows: CardStatementRow[] = [
        { id: "1", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "15-Jun-26", dateIso: "2026-06-15", markerRaw: null, referenceRaw: "A", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "1000.00", amountDollars: null, currencyOriginal: "ARS", originalText: "A", confidence: null, warnings: [] },
      ];
      const projections = service.calculateProjections(rows, "2026-06");
      expect(projections).toHaveLength(0);
    });

    it("projects remaining installments for 01/03", () => {
      const rows: CardStatementRow[] = [
        { id: "1", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "15-Jun-26", dateIso: "2026-06-15", markerRaw: null, referenceRaw: "A", installmentRaw: "1/3", installmentCurrent: 1, installmentTotal: 3, receiptRaw: null, amountPesos: "3000.00", amountDollars: null, currencyOriginal: "ARS", originalText: "A", confidence: null, warnings: [] },
      ];
      const projections = service.calculateProjections(rows, "2026-06");
      expect(projections).toHaveLength(2);
      expect(projections[0].monthKey).toBe("2026-07");
      expect(projections[1].monthKey).toBe("2026-08");
    });

    it("projects USD transactions with installments", () => {
      const rows: CardStatementRow[] = [
        { id: "1", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "15-Jun-26", dateIso: "2026-06-15", markerRaw: null, referenceRaw: "A", installmentRaw: "1/3", installmentCurrent: 1, installmentTotal: 3, receiptRaw: null, amountPesos: null, amountDollars: "100.00", currencyOriginal: "USD", originalText: "A", confidence: null, warnings: [] },
      ];
      const projections = service.calculateProjections(rows, "2026-06");
      expect(projections).toHaveLength(2);
      expect(projections[0].currencyOriginal).toBe("USD");
      expect(projections[0].amountDollars).toBe("100.00");
    });

    it("does not project tax or charge rows", () => {
      const rows: CardStatementRow[] = [
        { id: "1", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "tax", editable: true, dateRaw: null, dateIso: null, markerRaw: null, referenceRaw: "IVA", installmentRaw: "1/3", installmentCurrent: 1, installmentTotal: 3, receiptRaw: null, amountPesos: "1000.00", amountDollars: null, currencyOriginal: "ARS", originalText: "IVA", confidence: null, warnings: [] },
      ];
      const projections = service.calculateProjections(rows, "2026-06");
      expect(projections).toHaveLength(0);
    });
  });
});
