import { describe, expect, it } from "vitest";
import { resolveRecognizableCardReferences } from "../helpers/recognizable-card-reference.js";
import type { FutureDebtResponse } from "../future.types.js";

function baseResponse(): FutureDebtResponse {
  return {
    range: {
      from: "2026-07",
      to: "2026-12",
      months: 6,
      includeCurrentPeriod: false,
      currentPeriodKey: "2026-07",
    },
    summary: { ars: "0.00", usd: "0.00" },
    horizon: { persisted: true, persistedMonths: ["2026-08"] },
    months: [],
    pendientes: {
      diagnostics: ["missing_card_reference:2"],
      rows: [
        {
          id: "projection-mastercard",
          monthKey: "2026-08",
          description: "MERPAGO*SCENTERTUC",
          installmentNumber: 3,
          installmentTotal: 18,
          installmentLabel: "3/18",
          amount: "268333.33",
          currency: "ARS",
          originType: "card_statement",
          originReference: "statement-1",
          sourceLabel: "MASTERCARD BLACK sin referencia",
          cardId: null,
          cardLast4: null,
          holderName: null,
          cardLabel: null,
          status: "confirmed",
          rowType: "future_installment",
          diagnostic: "missing_card_reference",
          diagnosticDetail: "La ocurrencia no tiene una referencia de tarjeta identificable.",
        },
        {
          id: "projection-generic-visa",
          monthKey: "2026-08",
          description: "Compra generica",
          installmentNumber: 2,
          installmentTotal: 3,
          installmentLabel: "2/3",
          amount: "1000.00",
          currency: "ARS",
          originType: "card_statement",
          originReference: "statement-2",
          sourceLabel: "VISA sin referencia",
          cardId: null,
          cardLast4: null,
          holderName: null,
          cardLabel: null,
          status: "confirmed",
          rowType: "future_installment",
          diagnostic: "missing_card_reference",
          diagnosticDetail: "La ocurrencia no tiene una referencia de tarjeta identificable.",
        },
      ],
    },
    diagnostics: {
      duplicateOccurrences: 0,
      invalidInstallmentRows: 0,
      missingCurrencyRows: 0,
      missingCardRows: 2,
      warnings: ["missing_card_reference"],
    },
  };
}

describe("resolveRecognizableCardReferences", () => {
  it("promotes a specific Mastercard Black label without inventing last4", () => {
    const result = resolveRecognizableCardReferences(baseResponse());

    expect(result.months).toHaveLength(1);
    expect(result.months[0].cards).toHaveLength(1);
    expect(result.months[0].cards[0].cardLabel).toBe("MASTERCARD BLACK");
    expect(result.months[0].cards[0].cardLast4).toBe("");
    expect(result.months[0].cards[0].rows[0].amount).toBe("268333.33");
    expect(result.summary.ars).toBe("268333.33");
  });

  it("does not guess a generic VISA reference", () => {
    const result = resolveRecognizableCardReferences(baseResponse());

    expect(result.pendientes.rows).toHaveLength(1);
    expect(result.pendientes.rows[0].sourceLabel).toBe("VISA sin referencia");
    expect(result.diagnostics.missingCardRows).toBe(1);
    expect(result.diagnostics.warnings).toContain("missing_card_reference");
  });
});
