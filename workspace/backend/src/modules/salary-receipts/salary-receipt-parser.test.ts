import { describe, expect, it } from "vitest";
import {
  AmbiguousSalaryReceiptLayoutError,
  UnsupportedSalaryReceiptLayoutError,
} from "./salary-receipt-parser.errors.js";
import { SalaryReceiptParserRegistry } from "./salary-receipt-parser.js";
import type {
  SalaryReceiptParser,
  SalaryReceiptParserInput,
} from "./salary-receipt-parser.types.js";
import {
  formatSalaryAmountFromCents,
  normalizeSalaryReceiptText,
  parseSalaryAmountToCents,
  splitSalaryReceiptLines,
} from "./salary-receipt-parser.utils.js";

function parser(id: string, supports: boolean): SalaryReceiptParser {
  return {
    id,
    version: "1.0.0",
    supports: () => supports,
    parse: (_input: SalaryReceiptParserInput) => {
      throw new Error("not needed");
    },
  };
}

describe("salary receipt parser utilities", () => {
  it.each([
    ["1.234,56", 123456],
    ["$ 1.234,50", 123450],
    ["1234.56", 123456],
    ["1,234.56", 123456],
    ["USD 1,234.56", 123456],
    ["-250,10", -25010],
    ["-1,234.56", -123456],
  ])("parses %s to exact cents", (value, expected) => {
    expect(parseSalaryAmountToCents(value)).toBe(expected);
  });

  it("rejects ambiguous or malformed separators", () => {
    expect(() => parseSalaryAmountToCents("1.23.4,56")).toThrow(
      "Importe no reconocido",
    );
    expect(() => parseSalaryAmountToCents("1,23,4.56")).toThrow(
      "Importe no reconocido",
    );
  });

  it("formats exact cents without floating point operations", () => {
    expect(formatSalaryAmountFromCents(123456)).toBe("1234.56");
    expect(formatSalaryAmountFromCents(-5)).toBe("-0.05");
  });

  it("normalizes line endings and repeated horizontal whitespace", () => {
    const raw = " HABER   REMUNERATIVO\r\n\r\n  DESCUENTO\t  100,00 ";
    expect(normalizeSalaryReceiptText(raw)).toBe(
      "HABER REMUNERATIVO\n\n DESCUENTO 100,00",
    );
    expect(splitSalaryReceiptLines(raw)).toEqual([
      "HABER REMUNERATIVO",
      "DESCUENTO 100,00",
    ]);
  });
});

describe("SalaryReceiptParserRegistry", () => {
  it("fails closed when no parser supports the layout", () => {
    const registry = new SalaryReceiptParserRegistry([parser("one", false)]);
    expect(() =>
      registry.parse({ rawText: "unknown", pageCount: 1 }),
    ).toThrow(UnsupportedSalaryReceiptLayoutError);
  });

  it("rejects ambiguous layout detection", () => {
    const registry = new SalaryReceiptParserRegistry([
      parser("one", true),
      parser("two", true),
    ]);
    expect(() =>
      registry.parse({ rawText: "ambiguous", pageCount: 1 }),
    ).toThrow(AmbiguousSalaryReceiptLayoutError);
  });
});
