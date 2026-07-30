import { describe, expect, it } from "vitest";
import {
  analyzeSalaryReceiptExtras,
  isSacConcept,
} from "./salary-receipt-extras.js";

describe("salary receipt extras", () => {
  it.each([
    "S.A.C.",
    "SAC",
    "Sueldo anual complementario",
    "Aguinaldo",
  ])("recognizes %s as SAC", (label) => {
    expect(isSacConcept(label)).toBe(true);
  });

  it("separates a combined SAC receipt from the recurring monthly net", () => {
    const result = analyzeSalaryReceiptExtras({
      grossAmount: "7206936.60",
      netAmount: "5866997.00",
      items: [
        {
          label: "Sueldo anual complementario (SAC)",
          amount: "2402312.00",
          originalText: "12 S.A.C. 180,00 2.402.312,00",
        },
      ],
    });

    expect(result.hasSac).toBe(true);
    expect(result.sacOnly).toBe(false);
    expect(result.strategy).toBe("gross-ratio");
    expect(result.recurringNetAmount).toBe("3911331.50");
    expect(result.sacNetEstimate).toBe("1955665.50");
  });

  it("does not alter an ordinary salary receipt", () => {
    expect(
      analyzeSalaryReceiptExtras({
        grossAmount: "1000000.00",
        netAmount: "800000.00",
        items: [
          {
            label: "Sueldo básico",
            amount: "1000000.00",
            originalText: "Sueldo básico 1.000.000,00",
          },
        ],
      }),
    ).toEqual({
      hasSac: false,
      sacOnly: false,
      sacGrossAmount: "0.00",
      sacNetEstimate: "0.00",
      recurringNetAmount: "800000.00",
      strategy: "none",
    });
  });

  it("classifies an exclusive SAC receipt without creating a monthly base", () => {
    const result = analyzeSalaryReceiptExtras({
      grossAmount: "500000.00",
      netAmount: "430000.00",
      items: [
        {
          label: "SAC",
          amount: "500000.00",
          originalText: "SAC 500.000,00",
        },
      ],
    });

    expect(result.sacOnly).toBe(true);
    expect(result.recurringNetAmount).toBe("0.00");
    expect(result.sacNetEstimate).toBe("430000.00");
  });
});
