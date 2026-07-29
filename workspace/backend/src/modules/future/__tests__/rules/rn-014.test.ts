import { describe, expect, it } from "vitest";
import { toTraceability } from "../../rules/traceability.js";
import { occurrence } from "./test-data.js";

describe("RN-014 — traceability and functional confirmation", () => {
  it("projects accepted statement fields and confirms the obligation", () => {
    const row = toTraceability(occurrence({
      sourceType: "card_statement",
      sourceId: "row-77",
      originReference: "statement-77",
      description: "Compra trazable",
      monthKey: "2026-08",
      installmentCurrent: 4,
      installmentTotal: 6,
      amountPesosRaw: "25000.00",
      currencyOriginal: "ARS",
    }));
    expect(row).toMatchObject({
      id: "projection-1",
      monthKey: "2026-08",
      description: "Compra trazable",
      installmentNumber: 4,
      installmentTotal: 6,
      installmentLabel: "4/6",
      amount: "25000.00",
      currency: "ARS",
      originType: "card_statement",
      originReference: "statement-77",
      status: "confirmed",
    });
  });

  it("keeps safe origin details for a manual purchase", () => {
    const row = toTraceability(occurrence({
      sourceType: "manual_card_purchase",
      isManual: true,
      sourceId: "purchase-9",
      originReference: "purchase-9",
      currencyOriginal: "USD",
      amountPesosRaw: null,
      amountDollarsRaw: "40.00",
    }));
    expect(row.originType).toBe("manual_card_purchase");
    expect(row.originReference).toBe("purchase-9");
    expect(row.status).toBe("confirmed");
  });
});
