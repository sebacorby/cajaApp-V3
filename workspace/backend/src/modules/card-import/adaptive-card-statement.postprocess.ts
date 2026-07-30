import type { CardStatementParseResult } from "./card-statement-parser.types.js";

const USD_SIGNAL = /(?:\bUSD\b|U\$S|D[ÓO]LARES?|USA\s*,\s*USD)/i;

export function normalizeAdaptiveCurrencies(
  result: CardStatementParseResult,
): CardStatementParseResult {
  for (const row of [...result.preview.rows, ...result.preview.futureInstallmentsBlock]) {
    if (
      row.amountPesos &&
      !row.amountDollars &&
      USD_SIGNAL.test(row.originalText)
    ) {
      row.amountDollars = row.amountPesos;
      row.amountPesos = null;
      row.currencyOriginal = "USD";
      row.warnings = [
        ...row.warnings,
        "Moneda USD inferida desde una marca explícita en la línea original.",
      ];
    }
  }
  return result;
}
