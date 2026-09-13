import { describe, expect, it } from "vitest";
import {
  looksLikeSalaryReceipt,
  normalizeSalaryAmount,
  normalizeSalaryReceiptModelResponse,
  recalculateSalaryReceiptPreview,
} from "../../src/modules/salary-receipts/salary-receipt-extraction.service.js";
import { buildSalaryReceiptHistoryKey } from "../../src/modules/salary-receipts/salary-receipts.service.js";

const preview = normalizeSalaryReceiptModelResponse({
  source: {
    employerName: "Empresa Demo SA",
    employerTaxId: "30-00000000-0",
    employeeName: "Persona Demo",
    employeeTaxId: "20-00000000-0",
    period: "06/2026",
    paymentDate: "04/07/2026",
    currency: "ARS",
  },
  items: [
    { kind: "haber", code: "001", label: "Sueldo básico", amount: "$ 1.200.000,00", page: 1 },
    { kind: "earning", code: "014", label: "Antigüedad", amount: "250.000,00", page: 1 },
    { kind: "deduction", code: "501", label: "Jubilación", amount: "159.500,00", page: 1 },
    { kind: "deduction", code: "502", label: "Obra social", amount: "87.000,00", page: 1 },
  ],
}, 1);

describe("salary receipt normalization", () => {
  it("normalizes Argentine and international decimal amounts", () => {
    expect(normalizeSalaryAmount("$ 1.234.567,89")).toBe("1234567.89");
    expect(normalizeSalaryAmount("1,234.56")).toBe("1234.56");
    expect(normalizeSalaryAmount("250000")).toBe("250000.00");
  });

  it("recognizes salary receipt vocabulary", () => {
    expect(looksLikeSalaryReceipt("RECIBO DE HABERES CUIL 20-1 TOTAL HABERES TOTAL DESCUENTOS NETO A COBRAR")).toBe(true);
    expect(looksLikeSalaryReceipt("RESUMEN DE TARJETA CONSUMOS Y PAGO MINIMO")).toBe(false);
  });

  it("preserves concept order and calculates authoritative totals", () => {
    expect(preview.source.periodMonthKey).toBe("2026-06");
    expect(preview.source.payDate).toBe("2026-07-04");
    expect(preview.items.map((item) => item.label)).toEqual([
      "Sueldo básico",
      "Antigüedad",
      "Jubilación",
      "Obra social",
    ]);
    expect(preview.summary).toEqual({
      grossAmount: "1450000.00",
      deductionsAmount: "246500.00",
      netAmount: "1203500.00",
    });
  });

  it("recalculates the draft after user edits", () => {
    const updated = recalculateSalaryReceiptPreview({
      ...preview,
      items: preview.items.map((item) =>
        item.code === "014" ? { ...item, amount: "300.000,00" } : item,
      ),
    });
    expect(updated.summary.grossAmount).toBe("1500000.00");
    expect(updated.summary.netAmount).toBe("1253500.00");
  });

  it("builds a stable employer-employee-period identity", () => {
    expect(buildSalaryReceiptHistoryKey(preview)).toBe(
      "tax:30-00000000-0|tax:20-00000000-0|2026-06",
    );
  });
});
