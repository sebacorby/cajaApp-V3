import type { CardStatementParseResult } from "./card-statement-parser.types.js";
import {
  isGaliciaVisaStatement as isGaliciaVisaStatementBase,
  parseGaliciaVisaStatement as parseGaliciaVisaStatementBase,
} from "./galicia-visa.parser.base.js";

const explicitUsdPattern = /USD\s+(-?[\d.]+,\d{2})\s+(\d{4,6})\s+(-?[\d.]+,\d{2})\s*$/i;
const trailingMoneyPattern = /\s+-?[\d.]+,\d{2}\s*$/;
const planVIvaPattern = /DB IVA \$ PLAN V\s+(\d{4,6})\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s*$/i;

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
    row.receiptRaw = receiptRaw;

    if (row.referenceRaw) {
      row.referenceRaw = row.referenceRaw.replace(trailingMoneyPattern, "").trim();
    }
  }

  return result;
}

function normalizePlanVIvaRows(
  result: CardStatementParseResult,
): CardStatementParseResult {
  for (const row of result.preview.rows) {
    const planVIva = planVIvaPattern.exec(row.originalText);
    if (!planVIva) continue;

    const [, receiptRaw, , taxAmount] = planVIva;

    row.rowType = "tax";
    row.editable = false;
    row.referenceRaw = "DB IVA $ PLAN V";
    row.receiptRaw = receiptRaw;
    row.installmentRaw = null;
    row.installmentCurrent = null;
    row.installmentTotal = null;
    row.amountPesos = taxAmount;
    row.amountDollars = null;
    row.currencyOriginal = "ARS";
    row.groupId = null;
    row.groupLabel = null;
    row.groupOrder = null;
  }

  return result;
}

export const isGaliciaVisaStatement = isGaliciaVisaStatementBase;

export function parseGaliciaVisaStatement(
  rawText: string,
  pageCount: number,
): CardStatementParseResult {
  const result = parseGaliciaVisaStatementBase(rawText, pageCount);
  normalizeExplicitUsdRows(result);
  normalizePlanVIvaRows(result);
  return result;
}
