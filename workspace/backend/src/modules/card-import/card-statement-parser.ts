import type { CardStatementParseResult } from "./card-statement-parser.types.js";
import { UnsupportedStatementLayoutError } from "./card-statement-parser.types.js";
import {
  parseAdaptiveCardStatement,
  scoreAdaptiveCardStatement,
} from "./adaptive-card-statement.parser.js";
import { normalizeAdaptiveCurrencies } from "./adaptive-card-statement.postprocess.js";
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
  const adaptive = scoreAdaptiveCardStatement(rawText);
  if (adaptive.score >= 8) {
    return normalizeAdaptiveCurrencies(
      parseAdaptiveCardStatement(rawText, pageCount),
    );
  }

  // Compatibilidad con documentos históricos ya aceptados. Los formatos
  // nuevos se seleccionan únicamente por evidencia estructural.
  if (isGaliciaVisaStatement(rawText)) {
    return parseGaliciaVisaStatement(rawText, pageCount);
  }
  if (isGaliciaMastercardStatement(rawText)) {
    return parseGaliciaMastercardStatement(rawText, pageCount);
  }
  throw new UnsupportedStatementLayoutError(rawText.slice(0, 500));
}
