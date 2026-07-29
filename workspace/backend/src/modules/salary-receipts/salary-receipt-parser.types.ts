import type { SalaryReceiptPreview } from "./salary-receipts.types.js";

export interface SalaryReceiptParserInput {
  rawText: string;
  pageCount: number;
  sourceFileName?: string;
}

export interface SalaryReceiptParseWarning {
  code: string;
  message: string;
  pageNumber?: number;
  lineNumber?: number;
}

export interface SalaryReceiptParseDiagnostics {
  parserId: string;
  parserVersion: string;
  pageCount: number;
  sourceLineCount: number;
  candidateConceptLineCount: number;
  parsedConceptCount: number;
  unexplainedMonetaryLineCount: number;
  requiredFieldsFound: string[];
  requiredFieldsMissing: string[];
  warnings: SalaryReceiptParseWarning[];
  totals: {
    printedGrossCents?: number;
    calculatedGrossCents: number;
    printedDeductionsCents?: number;
    calculatedDeductionsCents: number;
    printedNetCents?: number;
    calculatedNetCents: number;
  };
  durationMs: number;
}

export interface SalaryReceiptParseResult {
  preview: SalaryReceiptPreview;
  diagnostics: SalaryReceiptParseDiagnostics;
  parser: {
    id: string;
    version: string;
  };
}

export interface SalaryReceiptParser {
  readonly id: string;
  readonly version: string;
  supports(input: SalaryReceiptParserInput): boolean;
  parse(input: SalaryReceiptParserInput): SalaryReceiptParseResult;
}
