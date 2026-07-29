import { describe, expect, it } from "vitest";
import {
  applyIncomeIncrease,
  calculateRecurringIncomeProjection,
  enumerateIncomeMonths,
  formatIncomeCents,
  parseIncomeAmount,
  parseIncomeBasisPoints,
} from "../../src/modules/incomes/incomes.service.js";

function source(events: Array<{
  id: string;
  monthKey: string;
  kind: string;
  amountRaw: string;
  status: string;
}> = []) {
  return {
    id: "source-1",
    name: "Sueldo UAT",
    employer: "Empresa",
    kind: "salary",
    currency: "ARS",
    baseAmountRaw: "1.000.000,00",
    startMonthKey: "2026-01",
    increaseEveryMonths: 3,
    increasePercentRaw: "10",
    events,
  };
}

describe("income calculations", () => {

  it("parses and formats ARS and USD without floating point arithmetic", () => {
    expect(parseIncomeAmount("1.000.000,25", "ARS")).toBe(100_000_025n);
    expect(parseIncomeAmount("1,000,000.25", "USD")).toBe(100_000_025n);
    expect(parseIncomeAmount("1.000", "ARS")).toBe(100_000n);
    expect(parseIncomeAmount("1,000", "USD")).toBe(100_000n);
    expect(formatIncomeCents(100_000_025n, "ARS")).toBe("1.000.000,25");
    expect(formatIncomeCents(100_000_025n, "USD")).toBe("1,000,000.25");
    expect(parseIncomeBasisPoints("10,25")).toBe(1_025);
  });

  it("rejects negative income amounts", () => {
    expect(() => parseIncomeAmount("-1,00", "ARS")).toThrow();
  });
  it("applies periodic increases using integer cents", () => {
    expect(applyIncomeIncrease(100_000_000n, 1_000, 0)).toBe(100_000_000n);
    expect(applyIncomeIncrease(100_000_000n, 1_000, 1)).toBe(110_000_000n);
    expect(applyIncomeIncrease(100_000_000n, 1_000, 2)).toBe(121_000_000n);
  });

  it("projects the base and quarterly increases", () => {
    expect(calculateRecurringIncomeProjection(source(), "2026-03").amount).toBe(100_000_000n);
    expect(calculateRecurringIncomeProjection(source(), "2026-04").amount).toBe(110_000_000n);
    expect(calculateRecurringIncomeProjection(source(), "2026-07").amount).toBe(121_000_000n);
  });

  it("uses a permanent adjustment as the new increase anchor", () => {
    const adjusted = source([
      {
        id: "adjustment-1",
        monthKey: "2026-05",
        kind: "permanent_adjustment",
        amountRaw: "1.500.000,00",
        status: "actual",
      },
    ]);

    expect(calculateRecurringIncomeProjection(adjusted, "2026-05").amount).toBe(150_000_000n);
    expect(calculateRecurringIncomeProjection(adjusted, "2026-07").amount).toBe(150_000_000n);
    expect(calculateRecurringIncomeProjection(adjusted, "2026-08").amount).toBe(165_000_000n);
  });

  it("applies a monthly override only to its exact month", () => {
    const adjusted = source([
      {
        id: "adjustment-1",
        monthKey: "2026-05",
        kind: "permanent_adjustment",
        amountRaw: "1.500.000,00",
        status: "actual",
      },
      {
        id: "override-1",
        monthKey: "2026-06",
        kind: "monthly_override",
        amountRaw: "1.550.000,00",
        status: "actual",
      },
    ]);

    expect(calculateRecurringIncomeProjection(adjusted, "2026-06").amount).toBe(155_000_000n);
    expect(calculateRecurringIncomeProjection(adjusted, "2026-07").amount).toBe(150_000_000n);
  });

  it("rejects inverted and oversized ranges", () => {
    expect(() => enumerateIncomeMonths("2026-03", "2026-02")).toThrow();
    expect(() => enumerateIncomeMonths("2026-01", "2029-01")).toThrow();
  });
});
