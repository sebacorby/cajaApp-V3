import { describe, expect, it } from "vitest";
import type { CardPaymentsResponse } from "../../src/modules/cards/card-payments.service.js";
import { presentCardPayments } from "../../src/modules/cards/card-payments-presentation.js";

function fixture(): CardPaymentsResponse {
  return {
    baseline: {
      statementId: "statement-1",
      periodKey: "2026-07",
      bankName: "Mastercard",
      brand: "MASTERCARD BLACK",
      fileName: "master-galicia-julio2026.pdf",
      currentDueDate: "2026-07-02",
      nextClosingDate: null,
      nextDueDate: null,
      total: { ars: "1425613.43", usd: "0.00" },
      acceptedAt: "2026-07-26T00:00:00.000Z",
    },
    range: { from: "2026-07", to: "2026-08", months: 2 },
    months: [
      {
        monthKey: "2026-07",
        label: "Jul 2026",
        status: "confirmed",
        totals: { ars: "804547.93", usd: "0.00" },
      },
      {
        monthKey: "2026-08",
        label: "Ago 2026",
        status: "projected",
        totals: { ars: "804547.93", usd: "0.00" },
      },
    ],
    cards: [
      {
        cardId: "card-1",
        cardLabel: "MASTERCARD BLACK",
        cardLast4: null,
        holderName: "CORBELLA, JAVIER SEBAS",
        movements: [
          {
            id: "row-1",
            sourceType: "statement_row",
            description: "Compra ejemplo",
            dateIso: "2026-06-28",
            cells: [
              {
                monthKey: "2026-07",
                status: "confirmed",
                installmentNumber: 1,
                installmentTotal: 3,
                ars: "804547.93",
                usd: "0.00",
              },
              {
                monthKey: "2026-08",
                status: "projected",
                installmentNumber: 2,
                installmentTotal: 3,
                ars: "804547.93",
                usd: "0.00",
              },
            ],
          },
        ],
        totalsByMonth: [
          { monthKey: "2026-07", totals: { ars: "804547.93", usd: "0.00" } },
          { monthKey: "2026-08", totals: { ars: "804547.93", usd: "0.00" } },
        ],
      },
    ],
    issuerValidation: {
      available: true,
      items: [
        {
          referenceId: "reference-1",
          issuerPeriodLabel: "Julio-26",
          issuerPeriodKey: "2026-07",
          targetPaymentMonthKey: "2026-08",
          periodBasis: "statement_month",
          issuerAmount: { ars: "955818.67", usd: "0.00" },
          calculatedInstallments: { ars: "804547.93", usd: "0.00" },
          difference: { ars: "-151270.74", usd: "0.00" },
          status: "mismatch",
        },
      ],
    },
    warnings: [],
  };
}

describe("card payments presentation", () => {
  it("uses accepted summary and issuer references as automatic output constraints", async () => {
    const result = await presentCardPayments(fixture());

    expect(result.months[0].totals.ars).toBe("1425613.43");
    expect(result.months[1].totals.ars).toBe("955818.67");
    expect(result.cards[0].totalsByMonth[0].totals.ars).toBe("1425613.43");
    expect(result.cards[0].totalsByMonth[1].totals.ars).toBe("955818.67");

    expect(result.months[0].adjustmentDetail?.kind).toBe("confirmed_statement_total");
    expect(result.months[1].adjustmentDetail?.kind).toBe("issuer_reference_adjustment");
    expect(result.months[1].adjustmentDetail?.adjustment.ars).toBe("151270.74");

    expect(result.issuerValidation.items[0].status).toBe("matched");
    expect(result.issuerValidation.items[0].difference.ars).toBe("0.00");
    expect(result.autoReconciliation.adjusted).toBe(true);
  });
});
