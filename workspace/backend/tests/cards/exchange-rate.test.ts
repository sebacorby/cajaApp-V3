import { describe, expect, it } from "vitest";
import type { CardExchangeRate } from "../../src/modules/cards/cards.types.js";
import { calculateCardMoneyEquivalents } from "../../src/modules/cards/cards.service.js";

const configuredRate: CardExchangeRate = {
  configured: true,
  pair: "USD_ARS",
  rate: "1.500,00",
  effectiveDate: "2026-07-12",
  source: "manual",
  status: "active",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

describe("card exchange rate equivalents", () => {
  it("combines original ARS and converted USD without floats", () => {
    expect(calculateCardMoneyEquivalents("1.000,00", "2.00", configuredRate)).toEqual({
      usdEquivalentPesos: "3.000,00",
      combinedTotalPesos: "4.000,00",
    });
  });

  it("keeps cent precision for small USD values", () => {
    expect(calculateCardMoneyEquivalents(null, "0.01", configuredRate)).toEqual({
      usdEquivalentPesos: "15,00",
      combinedTotalPesos: "15,00",
    });
  });

  it("does not invent equivalents when no quote is configured", () => {
    expect(calculateCardMoneyEquivalents("1.000,00", "2.00", {
      ...configuredRate,
      configured: false,
      rate: null,
      status: "missing",
    })).toEqual({
      usdEquivalentPesos: null,
      combinedTotalPesos: null,
    });
  });
});
