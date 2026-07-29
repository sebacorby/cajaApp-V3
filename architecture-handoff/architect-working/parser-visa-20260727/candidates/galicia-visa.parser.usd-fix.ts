import type { CardStatementParseResult } from "./card-statement-parser.types.js";
import {
  isGaliciaVisaStatement as isGaliciaVisaStatementBase,
  parseGaliciaVisaStatement as parseGaliciaVisaStatementBase,
} from "./galicia-visa.parser.base.js";

const explicitUsdPattern = /USD\s+(-?[\d.]+,\d{2})\s+(\d{4,6})\s+(-?[\d.]+,\d{2})\s*$/i;
const trailingMoneyPattern = /\s+-?[\d.]+,\d{2}\s*$/;

function compactAmount(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function normalizeExplicitUsdRows(
  result: CardStatementParseResult,
): CardStatementParseResult {
  for (const row of result.preview.rows) {
    if (!row.amountPesos || row.amountDollars) continue;

    const explicitUsd = explicitUsdPattern.exec(row.originalText);
    if (!explicitUsd) continue;

    const [, , receiptRaw, finalUsdAmount] = explicitUsd;
    if (compactAmount(row.amountPesos) !== compactAmount(finalUsdAmount)) continue;

    row.amountPesos = null;
    row.amountDollars = finalUsdAmount;
    row.currencyOriginal = "USD";
    row.receiptRaw = row.receiptRaw ?? receiptRaw;

    if (row.referenceRaw) {
      row.referenceRaw = row.referenceRaw.replace(trailingMoneyPattern, "").trim();
    }
  }

  return result;
}

export const isGaliciaVisaStatement = isGaliciaVisaStatementBase;

export function parseGaliciaVisaStatement(
  rawText: string,
  pageCount: number,
): CardStatementParseResult {
  return normalizeExplicitUsdRows(
    parseGaliciaVisaStatementBase(rawText, pageCount),
  );
}
