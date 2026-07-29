import type { SalaryReceiptParseDiagnostics } from "./salary-receipt-parser.types.js";

export class UnsupportedSalaryReceiptLayoutError extends Error {
  readonly code = "SALARY_RECEIPT_LAYOUT_UNSUPPORTED";

  constructor() {
    super("El formato de este recibo todavía no está soportado.");
    this.name = "UnsupportedSalaryReceiptLayoutError";
  }
}

export class AmbiguousSalaryReceiptLayoutError extends Error {
  readonly code = "SALARY_RECEIPT_LAYOUT_AMBIGUOUS";

  constructor(public readonly parserIds: string[]) {
    super(`Más de un parser reconoce el recibo: ${parserIds.join(", ")}.`);
    this.name = "AmbiguousSalaryReceiptLayoutError";
  }
}

export class SalaryReceiptParserIncompleteError extends Error {
  readonly code = "SALARY_RECEIPT_PARSER_INCOMPLETE";

  constructor(public readonly diagnostics: SalaryReceiptParseDiagnostics) {
    super("El parser no pudo interpretar todas las líneas monetarias relevantes.");
    this.name = "SalaryReceiptParserIncompleteError";
  }
}

export class SalaryReceiptTotalsMismatchError extends Error {
  readonly code = "SALARY_RECEIPT_TOTALS_MISMATCH";

  constructor(
    public readonly field: "gross" | "deductions" | "net",
    public readonly printedCents: number,
    public readonly calculatedCents: number,
  ) {
    super(`El total ${field} impreso no coincide con el total calculado.`);
    this.name = "SalaryReceiptTotalsMismatchError";
  }
}
