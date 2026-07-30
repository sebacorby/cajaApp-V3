import type { CardStatementPreview } from "../cards/cards.types.js";

export type StatementLayout =
  | "galicia-mastercard"
  | "galicia-visa"
  | "adaptive-tabular"
  | "adaptive-narrative";

export type ParserDiagnosticLine = {
  pageNumber: number;
  lineNumber: number;
  text: string;
  reason: string;
};

export type CardStatementParseDiagnostics = {
  layout: StatementLayout;
  parserId?: string;
  parserVersion?: string;
  detectionScore?: number;
  detectionSignals?: string[];
  sourcePageCount: number;
  sourceLineCount: number;
  candidateTransactionLines: number;
  parsedTransactionLines: number;
  unexplainedTransactionLines: ParserDiagnosticLine[];
  parsedRows: number;
  futureReferenceRows: number;
  warnings: string[];
  durationMs: number;
};

export type CardStatementParseResult = {
  preview: CardStatementPreview;
  diagnostics: CardStatementParseDiagnostics;
};

export class UnsupportedStatementLayoutError extends Error {
  constructor(public readonly detectedText: string) {
    super("Formato de resumen de tarjeta no soportado por el parser programático.");
    this.name = "UnsupportedStatementLayoutError";
  }
}

export class StatementParseCompletenessError extends Error {
  constructor(
    public readonly diagnostics: CardStatementParseDiagnostics,
  ) {
    super(
      `El parser no pudo interpretar ${diagnostics.unexplainedTransactionLines.length} movimiento(s) financiero(s) del resumen.`,
    );
    this.name = "StatementParseCompletenessError";
  }
}
