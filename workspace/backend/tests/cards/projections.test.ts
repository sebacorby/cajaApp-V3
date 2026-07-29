import { describe, it, expect, beforeEach } from "vitest";
import { installmentProjectionService } from "../../src/modules/projections/installment-projection.service.js";
import type { CardStatementRow } from "../../src/modules/cards/cards.types.js";

describe("installmentProjectionService", () => {
  const service = installmentProjectionService;

  describe("calculateProjections", () => {
    it("creates projections for installments with remaining payments", () => {
      const rows: CardStatementRow[] = [
        {
          id: "r1",
          displayOrder: 1,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-6792",
          groupLabel: "TARJETA 6792",
          groupOrder: 1,
          rowType: "transaction",
          editable: true,
          dateRaw: "15-Jun-26",
          dateIso: "2026-06-15",
          markerRaw: null,
          referenceRaw: "AMAZON.COM",
          installmentRaw: "1/3",
          installmentCurrent: 1,
          installmentTotal: 3,
          receiptRaw: "123",
          amountPesos: "10000.00",
          amountDollars: null,
          currencyOriginal: "ARS",
          originalText: "AMAZON.COM 1/3 10000.00",
          confidence: 0.95,
          warnings: [],
        },
      ];

      const projections = service.calculateProjections(rows, "2026-06");

      expect(projections).toHaveLength(2);
      expect(projections[0].monthKey).toBe("2026-07");
      expect(projections[0].installmentCurrent).toBe(2);
      expect(projections[1].monthKey).toBe("2026-08");
      expect(projections[1].installmentCurrent).toBe(3);
    });

    it("does not create projections when current >= total", () => {
      const rows: CardStatementRow[] = [
        {
          id: "r1",
          displayOrder: 1,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-6792",
          groupLabel: "TARJETA 6792",
          groupOrder: 1,
          rowType: "transaction",
          editable: true,
          dateRaw: "15-Jun-26",
          dateIso: "2026-06-15",
          markerRaw: null,
          referenceRaw: "AMAZON.COM",
          installmentRaw: "3/3",
          installmentCurrent: 3,
          installmentTotal: 3,
          receiptRaw: "123",
          amountPesos: "10000.00",
          amountDollars: null,
          currencyOriginal: "ARS",
          originalText: "AMAZON.COM 3/3 10000.00",
          confidence: 0.95,
          warnings: [],
        },
      ];

      const projections = service.calculateProjections(rows, "2026-06");

      expect(projections).toHaveLength(0);
    });

    it("projects USD amounts as USD without conversion", () => {
      const rows: CardStatementRow[] = [
        {
          id: "r1",
          displayOrder: 1,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-6792",
          groupLabel: "TARJETA 6792",
          groupOrder: 1,
          rowType: "transaction",
          editable: true,
          dateRaw: "15-Jun-26",
          dateIso: "2026-06-15",
          markerRaw: null,
          referenceRaw: "AMAZON.COM",
          installmentRaw: "1/3",
          installmentCurrent: 1,
          installmentTotal: 3,
          receiptRaw: "123",
          amountPesos: null,
          amountDollars: "100.00",
          currencyOriginal: "USD",
          originalText: "AMAZON.COM 1/3 USD 100.00",
          confidence: 0.95,
          warnings: [],
        },
      ];

      const projections = service.calculateProjections(rows, "2026-06");

      expect(projections).toHaveLength(2);
      expect(projections[0].currencyOriginal).toBe("USD");
      expect(projections[0].amountDollars).toBe("100.00");
      expect(projections[0].amountPesos).toBeNull();
    });

    it("does not project group_total rows", () => {
      const rows: CardStatementRow[] = [
        {
          id: "r1",
          displayOrder: 1,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-6792",
          groupLabel: "TARJETA 6792",
          groupOrder: 1,
          rowType: "group_total",
          editable: false,
          dateRaw: null,
          dateIso: null,
          markerRaw: null,
          referenceRaw: "Total TARJETA 6792",
          installmentRaw: null,
          installmentCurrent: null,
          installmentTotal: null,
          receiptRaw: null,
          amountPesos: "50000.00",
          amountDollars: "50.00",
          currencyOriginal: "MIXED",
          originalText: "Total TARJETA 6792",
          confidence: null,
          warnings: [],
        },
      ];

      const projections = service.calculateProjections(rows, "2026-06");

      expect(projections).toHaveLength(0);
    });

    it("projects 01/06 into 5 future months", () => {
      const rows: CardStatementRow[] = [
        {
          id: "r1",
          displayOrder: 1,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-5884",
          groupLabel: "TARJETA 5884",
          groupOrder: 2,
          rowType: "transaction",
          editable: true,
          dateRaw: "28-Jun-26",
          dateIso: "2026-06-28",
          markerRaw: null,
          referenceRaw: "MERCADOLIBRE",
          installmentRaw: "01/06",
          installmentCurrent: 1,
          installmentTotal: 6,
          receiptRaw: "123",
          amountPesos: "30000.00",
          amountDollars: null,
          currencyOriginal: "ARS",
          originalText: "MERCADOLIBRE 01/06 30000.00",
          confidence: 0.9,
          warnings: [],
        },
      ];

      const projections = service.calculateProjections(rows, "2026-06");

      expect(projections).toHaveLength(5);
      expect(projections[0].monthKey).toBe("2026-07");
      expect(projections[4].monthKey).toBe("2026-11");
    });
  });

  describe("getStatementMonthKey", () => {
    it("extracts month from latest transaction date", () => {
      const rows: CardStatementRow[] = [
        {
          id: "r1",
          displayOrder: 1,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-6792",
          groupLabel: "TARJETA 6792",
          groupOrder: 1,
          rowType: "transaction",
          editable: true,
          dateRaw: "15-Jun-26",
          dateIso: "2026-06-15",
          markerRaw: null,
          referenceRaw: "AMAZON.COM",
          installmentRaw: null,
          installmentCurrent: null,
          installmentTotal: null,
          receiptRaw: "123",
          amountPesos: "10000.00",
          amountDollars: null,
          currencyOriginal: "ARS",
          originalText: "AMAZON.COM 10000.00",
          confidence: 0.95,
          warnings: [],
        },
        {
          id: "r2",
          displayOrder: 2,
          sourcePage: 1,
          sectionId: "consumption-detail",
          sectionLabel: "Consumo",
          groupId: "g-6792",
          groupLabel: "TARJETA 6792",
          groupOrder: 1,
          rowType: "transaction",
          editable: true,
          dateRaw: "28-Jun-26",
          dateIso: "2026-06-28",
          markerRaw: null,
          referenceRaw: "UBER",
          installmentRaw: null,
          installmentCurrent: null,
          installmentTotal: null,
          receiptRaw: "124",
          amountPesos: "5000.00",
          amountDollars: null,
          currencyOriginal: "ARS",
          originalText: "UBER 5000.00",
          confidence: 0.95,
          warnings: [],
        },
      ];

      const monthKey = service.getStatementMonthKey(rows);

      expect(monthKey).toBe("2026-06");
    });
  });

  describe("aggregateByMonth", () => {
    it("aggregates projections by month using BigInt cents", () => {
      const projections = [
        {
          rowId: "r1",
          monthKey: "2026-07",
          label: "Julio-2026",
          installmentCurrent: 2,
          installmentTotal: 3,
          amountPesos: "10.000,00",
          amountDollars: null,
          currencyOriginal: "ARS",
        },
        {
          rowId: "r2",
          monthKey: "2026-07",
          label: "Julio-2026",
          installmentCurrent: 3,
          installmentTotal: 5,
          amountPesos: "15.000,00",
          amountDollars: null,
          currencyOriginal: "ARS",
        },
        {
          rowId: "r3",
          monthKey: "2026-08",
          label: "Agosto-2026",
          installmentCurrent: 3,
          installmentTotal: 3,
          amountPesos: "10.000,00",
          amountDollars: null,
          currencyOriginal: "ARS",
        },
      ];

      const aggregated = service.aggregateByMonth(projections);

      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].monthKey).toBe("2026-07");
      expect(aggregated[0].totalPesos).toBe("25.000,00");
      expect(aggregated[1].monthKey).toBe("2026-08");
      expect(aggregated[1].totalPesos).toBe("10.000,00");
    });
  });
});
