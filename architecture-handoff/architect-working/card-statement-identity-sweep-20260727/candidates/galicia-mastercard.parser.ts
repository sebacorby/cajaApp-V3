import type { CardStatementParseResult } from "./card-statement-parser.types.js";
import {
  isGaliciaMastercardStatement as isGaliciaMastercardStatementBase,
  parseGaliciaMastercardStatement as parseGaliciaMastercardStatementBase,
} from "./galicia-mastercard.parser.base.js";

export function extractGaliciaMastercardAccountNumber(
  rawText: string,
): string | null {
  return /N[°º]?\s*de\s*Socio:\s*([0-9-]+)/i.exec(rawText)?.[1] ?? null;
}

function applyAccountIdentity(
  result: CardStatementParseResult,
  rawText: string,
): CardStatementParseResult {
  const source = result.preview.source as typeof result.preview.source & {
    accountNumber?: string | null;
  };
  source.accountNumber = extractGaliciaMastercardAccountNumber(rawText);
  return result;
}

export const isGaliciaMastercardStatement = isGaliciaMastercardStatementBase;

export function parseGaliciaMastercardStatement(
  rawText: string,
  pageCount: number,
): CardStatementParseResult {
  return applyAccountIdentity(
    parseGaliciaMastercardStatementBase(rawText, pageCount),
    rawText,
  );
}
