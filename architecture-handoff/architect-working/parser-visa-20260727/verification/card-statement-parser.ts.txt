import type { CardStatementParseResult } from "./card-statement-parser.types.js";
import { UnsupportedStatementLayoutError } from "./card-statement-parser.types.js";
import {
  isGaliciaVisaStatement,
  parseGaliciaVisaStatement,
} from "./galicia-visa.parser.js";
import {
  isGaliciaMastercardStatement,
  parseGaliciaMastercardStatement,
} from "./galicia-mastercard.parser.js";

export function parseCardStatementRaw(
  rawText: string,
  pageCount: number,
): CardStatementParseResult {
  if (isGaliciaVisaStatement(rawText)) {
    return parseGaliciaVisaStatement(rawText, pageCount);
  }
  if (isGaliciaMastercardStatement(rawText)) {
    return parseGaliciaMastercardStatement(rawText, pageCount);
  }
  throw new UnsupportedStatementLayoutError(rawText.slice(0, 500));
}
