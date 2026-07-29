import {
  AmbiguousSalaryReceiptLayoutError,
  UnsupportedSalaryReceiptLayoutError,
} from "./salary-receipt-parser.errors.js";
import type {
  SalaryReceiptParser,
  SalaryReceiptParserInput,
  SalaryReceiptParseResult,
} from "./salary-receipt-parser.types.js";

export class SalaryReceiptParserRegistry {
  constructor(private readonly parsers: readonly SalaryReceiptParser[]) {}

  parse(input: SalaryReceiptParserInput): SalaryReceiptParseResult {
    const compatible = this.parsers.filter((parser) => parser.supports(input));

    if (compatible.length === 0) {
      throw new UnsupportedSalaryReceiptLayoutError();
    }
    if (compatible.length > 1) {
      throw new AmbiguousSalaryReceiptLayoutError(
        compatible.map((parser) => parser.id),
      );
    }

    return compatible[0].parse(input);
  }

  list(): ReadonlyArray<{ id: string; version: string }> {
    return this.parsers.map(({ id, version }) => ({ id, version }));
  }
}
