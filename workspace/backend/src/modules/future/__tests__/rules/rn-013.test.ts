import { describe, expect, it } from "vitest";
import { partitionByValidity } from "../../rules/diagnostics.js";
import { occurrence } from "./test-data.js";

describe("RN-013 — invalid data partition", () => {
  it("routes invalid installments to pending diagnostics and not totals", () => {
    const result = partitionByValidity([
      occurrence({ installmentCurrent: null, installmentTotal: null }),
    ]);
    expect(result.included).toHaveLength(0);
    expect(result.pending[0]?.diagnostic).toBe("invalid_installment");
    expect(result.diagnostics.invalidInstallmentRows).toBe(1);
  });

  it("routes unsupported currency to pending diagnostics and not totals", () => {
    const result = partitionByValidity([
      occurrence({ currencyOriginal: "MIXED" }),
    ]);
    expect(result.included).toHaveLength(0);
    expect(result.pending[0]?.diagnostic).toBe("missing_currency");
    expect(result.diagnostics.missingCurrencyRows).toBe(1);
  });

  it("routes missing cards to pending diagnostics and not card totals", () => {
    const result = partitionByValidity([
      occurrence({ cardId: null, cardLast4: null, holderName: null }),
    ]);
    expect(result.included).toHaveLength(0);
    expect(result.pending[0]?.diagnostic).toBe("missing_card_reference");
    expect(result.diagnostics.missingCardRows).toBe(1);
  });
});
