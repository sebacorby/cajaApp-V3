import { describe, expect, it } from "vitest";
import {
  normalizeOriginalAmount,
  preserveOriginalAmount,
} from "../../rules/amount.js";
import { occurrence } from "./test-data.js";

describe("RN-004 — original installment amount", () => {
  it("preserves the full ARS amount for every future occurrence", () => {
    const source = { currency: "ARS" as const, amountPesosRaw: "18000.00", amountDollarsRaw: null };
    expect(normalizeOriginalAmount(source)).toEqual({ currency: "ARS", cents: 1800000n });
    expect(preserveOriginalAmount(occurrence({ installmentCurrent: 4, installmentTotal: 6, amountPesosRaw: "18000.00" }))).toBe("18000.00");
  });

  it.each([
    ["ARS", "1.234,56", 123456n],
    ["ARS", "1234.56", 123456n],
    ["ARS", "1,234.56", 123456n],
    ["ARS", "1,234", 123400n],
    ["USD", "1,234.56", 123456n],
    ["USD", "1234.56", 123456n],
    ["USD", "1,234", 123400n],
  ] as const)("parses %s source format %s as exact cents", (currency, raw, cents) => {
    const source = currency === "ARS"
      ? { currency, amountPesosRaw: raw, amountDollarsRaw: null }
      : { currency, amountPesosRaw: null, amountDollarsRaw: raw };
    expect(normalizeOriginalAmount(source)).toEqual({ currency, cents });
  });
});
