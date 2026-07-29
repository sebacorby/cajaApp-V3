import { describe, expect, it } from "vitest";
import { normalizeManualCardAssignments } from "../../src/modules/cards/card-payments-manual-normalizer.js";
import type { CardPaymentsResponse } from "../../src/modules/cards/card-payments.service.js";

function response(): CardPaymentsResponse {
  return {
    baseline: {
      statementId: "statement-1",
      periodKey: "2026-07",
      bankName: "Banco",
      brand: "Mastercard",
      fileName: "resumen.pdf",
      currentDueDate: "2026-07-28",
      nextClosingDate: "2026-08-10",
      nextDueDate: "2026-08-28",
      total: { ars: "1000.00", usd: "0.00" },
      acceptedAt: "2026-07-26T00:00:00.000Z",
    },
    range: { from: "2026-07", to: "2026-08", months: 2 },
    months: [
      { monthKey: "2026-07", label: "Jul 2026", status: "confirmed", totals: { ars: "1000.00", usd: "0.00" } },
      { monthKey: "2026-08", label: "Ago 2026", status: "projected", totals: { ars: "150.00", usd: "0.00" } },
    ],
    cards: [
      {
        cardId: "group-1",
        cardLabel: "MASTERCARD BLACK",
        cardLast4: null,
        holderName: "Javier",
        movements: [],
        totalsByMonth: [
          { monthKey: "2026-07", totals: { ars: "1000.00", usd: "0.00" } },
          { monthKey: "2026-08", totals: { ars: "100.00", usd: "0.00" } },
        ],
      },
      {
        cardId: "manual-card:NONE:MASTERCARD BLACK",
        cardLabel: "Tarjeta •••• NONE",
        cardLast4: "NONE",
        holderName: "MASTERCARD BLACK",
        movements: [
          {
            id: "manual:purchase-1",
            sourceType: "manual_purchase",
            description: "Compra nueva",
            dateIso: "2026-07-26",
            cells: [
              {
                monthKey: "2026-08",
                status: "projected",
                installmentNumber: 1,
                installmentTotal: 1,
                ars: "50.00",
                usd: "0.00",
              },
            ],
          },
        ],
        totalsByMonth: [
          { monthKey: "2026-07", totals: { ars: "0.00", usd: "0.00" } },
          { monthKey: "2026-08", totals: { ars: "50.00", usd: "0.00" } },
        ],
      },
    ],
    issuerValidation: { available: false, items: [] },
    warnings: [],
  };
}

describe("manual card payment normalization", () => {
  it("merges a no-last4 manual purchase into the selected named card", () => {
    const result = normalizeManualCardAssignments(response());

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].cardLabel).toBe("MASTERCARD BLACK");
    expect(result.cards[0].movements).toHaveLength(1);
    expect(result.cards[0].movements[0].description).toBe("Compra nueva");
    expect(
      result.cards[0].totalsByMonth.find((item) => item.monthKey === "2026-08")
        ?.totals.ars,
    ).toBe("150.00");
  });
});
