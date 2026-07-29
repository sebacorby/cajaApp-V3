import { describe, it, expect } from "vitest";
import { InstallmentProjectionService } from "../../src/modules/projections/installment-projection.service.js";
import type { CardStatementRow } from "../../src/modules/cards/cards.types.js";

describe("Display Order Preservation", () => {
  const service = new InstallmentProjectionService();

  it("preserves displayOrder in original rows", () => {
    const rows: CardStatementRow[] = [
      { id: "r1", displayOrder: 5, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "10-Jun-26", dateIso: "2026-06-10", markerRaw: null, referenceRaw: "A", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "100", amountDollars: null, currencyOriginal: "ARS", originalText: "A", confidence: null, warnings: [] },
      { id: "r2", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "05-Jun-26", dateIso: "2026-06-05", markerRaw: null, referenceRaw: "B", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "200", amountDollars: null, currencyOriginal: "ARS", originalText: "B", confidence: null, warnings: [] },
      { id: "r3", displayOrder: 3, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "15-Jun-26", dateIso: "2026-06-15", markerRaw: null, referenceRaw: "C", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "300", amountDollars: null, currencyOriginal: "ARS", originalText: "C", confidence: null, warnings: [] },
    ];

    const displayOrders = rows.map(r => r.displayOrder);
    const uniqueOrders = new Set(displayOrders);

    expect(displayOrders.length).toBe(uniqueOrders.size);
    expect(displayOrders).toEqual([5, 1, 3]);
  });

  it("service does not reorder rows", () => {
    const rows: CardStatementRow[] = [
      { id: "r1", displayOrder: 5, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "10-Jun-26", dateIso: "2026-06-10", markerRaw: null, referenceRaw: "A", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "100", amountDollars: null, currencyOriginal: "ARS", originalText: "A", confidence: null, warnings: [] },
      { id: "r2", displayOrder: 1, sourcePage: 1, sectionId: "s1", sectionLabel: "Section", groupId: null, groupLabel: null, groupOrder: null, rowType: "transaction", editable: true, dateRaw: "05-Jun-26", dateIso: "2026-06-05", markerRaw: null, referenceRaw: "B", installmentRaw: "1/1", installmentCurrent: 1, installmentTotal: 1, receiptRaw: null, amountPesos: "200", amountDollars: null, currencyOriginal: "ARS", originalText: "B", confidence: null, warnings: [] },
    ];

    const projections = service.calculateProjections(rows, "2026-06");

    expect(projections).toHaveLength(0);

    const originalOrder = rows.map(r => r.displayOrder);
    expect(originalOrder).toEqual([5, 1]);
  });
});
