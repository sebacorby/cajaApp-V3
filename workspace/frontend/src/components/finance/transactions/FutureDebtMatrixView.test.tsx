import { describe, expect, it } from "vitest";

describe("FutureDebtMatrixView", () => {
  it("keeps one movement identity across monthly installments", () => {
    const sourceId = "purchase-a";
    const rows = [
      { sourceId, month: "2027-01", installment: "1/3" },
      { sourceId, month: "2027-02", installment: "2/3" },
      { sourceId, month: "2027-03", installment: "3/3" },
    ];
    expect(new Set(rows.map((row) => row.sourceId)).size).toBe(1);
    expect(rows.map((row) => row.month)).toEqual(["2027-01", "2027-02", "2027-03"]);
  });
});
