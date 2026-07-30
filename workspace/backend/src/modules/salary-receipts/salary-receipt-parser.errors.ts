import { AppError } from "../../shared/errors.js";
import type { SalaryReceiptParseDiagnostics } from "./salary-receipt-parser.types.js";

export class UnsupportedSalaryReceiptLayoutError extends AppError {
  constructor() {
    super(
      "SALARY_RECEIPT_LAYOUT_UNSUPPORTED",
      "El formato de este recibo todavía no está soportado por el parser determinístico. Eliminá el borrador fallido desde Importaciones y conservá un RAW anonimizado de pdfplumber para agregar este layout sin exponer datos personales.",
      422,
    );
    this.name = "UnsupportedSalaryReceiptLayoutError";
  }
}

export class AmbiguousSalaryReceiptLayoutError extends AppError {
  constructor(public readonly parserIds: string[]) {
    super(
      "SALARY_RECEIPT_LAYOUT_AMBIGUOUS",
      `Más de un parser reconoce el recibo: ${parserIds.join(", ")}. No se importó ningún dato.`,
      422,
    );
    this.name = "AmbiguousSalaryReceiptLayoutError";
  }
}

export class SalaryReceiptTextExtractionEmptyError extends AppError {
  constructor() {
    super(
      "SALARY_RECEIPT_TEXT_EXTRACTION_EMPTY",
      "El PDF no contiene texto utilizable. Puede ser un documento escaneado; OCR no está habilitado y no se usará IA como fallback.",
      422,
    );
    this.name = "SalaryReceiptTextExtractionEmptyError";
  }
}

export class SalaryReceiptPreviewValidationError extends AppError {
  constructor(public readonly issues: string[]) {
    super(
      "SALARY_RECEIPT_PREVIEW_INVALID",
      `El parser produjo una vista previa inválida: ${issues.join("; ")}`,
      422,
    );
    this.name = "SalaryReceiptPreviewValidationError";
  }
}

export class SalaryReceiptParserIncompleteError extends AppError {
  constructor(public readonly diagnostics: SalaryReceiptParseDiagnostics) {
    const missing = diagnostics.requiredFieldsMissing.length
      ? diagnostics.requiredFieldsMissing.join(", ")
      : "ninguno";
    super(
      "SALARY_RECEIPT_PARSER_INCOMPLETE",
      `El parser ${diagnostics.parserId}@${diagnostics.parserVersion} no pudo completar el recibo. Campos faltantes: ${missing}. Líneas monetarias sin explicar: ${diagnostics.unexplainedMonetaryLineCount}. No se importó ningún dato.`,
      422,
    );
    this.name = "SalaryReceiptParserIncompleteError";
  }
}

export class SalaryReceiptTotalsMismatchError extends AppError {
  constructor(
    public readonly field: "gross" | "deductions" | "net",
    public readonly printedCents: number,
    public readonly calculatedCents: number,
  ) {
    super(
      "SALARY_RECEIPT_TOTALS_MISMATCH",
      `El total ${field} impreso (${printedCents} centavos) no coincide con el total calculado (${calculatedCents} centavos). No se importó ningún dato.`,
      422,
    );
    this.name = "SalaryReceiptTotalsMismatchError";
  }
}
