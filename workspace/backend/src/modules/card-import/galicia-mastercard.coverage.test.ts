import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseGaliciaMastercardStatement } from "./galicia-mastercard.parser.js";
import { StatementParseCompletenessError } from "./card-statement-parser.types.js";

const fixturePath = path.resolve(
  process.cwd(),
  "src/modules/card-import/__fixtures__/mastercard-galicia-julio2026.raw.txt",
);

describe("Galicia Mastercard parser coverage gate", () => {
  it("blocks the import instead of silently losing a dated financial line", () => {
    const raw = fs
      .readFileSync(fixturePath, "utf8")
      .replace(
        "27-May-26 PAYU*AR*UBER 08528 4.290,00",
        "27-May-26 PAYU*AR*UBER 08528 SIN-IMPORTE",
      );

    try {
      parseGaliciaMastercardStatement(raw, 6);
      throw new Error("Expected StatementParseCompletenessError");
    } catch (error) {
      expect(error).toBeInstanceOf(StatementParseCompletenessError);
      const typed = error as StatementParseCompletenessError;
      expect(typed.diagnostics.candidateTransactionLines).toBe(53);
      expect(typed.diagnostics.parsedTransactionLines).toBe(52);
      expect(typed.diagnostics.unexplainedTransactionLines).toHaveLength(1);
      expect(typed.diagnostics.unexplainedTransactionLines[0]?.text).toContain("SIN-IMPORTE");
    }
  });
});
