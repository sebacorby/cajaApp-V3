import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";
import { StatementParseCompletenessError } from "./card-statement-parser.types.js";
import {
  isGaliciaVisaStatement,
  parseGaliciaVisaStatement,
} from "./galicia-visa.parser.js";

const fixturePath = path.resolve(
  process.cwd(),
  "src/modules/card-import/__fixtures__/galicia-visa-julio2026.raw.txt",
);
const raw = fs.readFileSync(fixturePath, "utf8");

describe("Galicia Visa deterministic parser", () => {
  it("detects and parses the Galicia Visa layout", () => {
    expect(isGaliciaVisaStatement(raw)).toBe(true);

    const result = parseGaliciaVisaStatement(raw, 4);

    expect(result.diagnostics.layout).toBe("galicia-visa");
    expect(result.diagnostics.unexplainedTransactionLines).toEqual([]);
    expect(result.diagnostics.parsedTransactionLines).toBe(
      result.diagnostics.candidateTransactionLines,
    );
    expect(result.diagnostics.futureReferenceRows).toBe(6);
    expect(cardStatementPreviewSchema.safeParse(result.preview).success).toBe(true);
  });

  it("extracts statement identity, totals and billing dates", () => {
    const { preview } = parseGaliciaVisaStatement(raw, 4);

    expect(preview.source.bankName).toBe("Banco Galicia");
    expect(preview.source.brand).toBe("VISA");
    expect(preview.source.statementNumber).toBe("VI00000000001089271");
    expect(preview.summary.totalPesos).toBe("1.924.476,04");
    expect(preview.summary.totalDollars).toBe("3,22");
    expect(preview.summary.minimumPaymentPesos).toBe("621.010,00");
    expect(preview.summary.currentDueDate).toBe("2026-07-13");
    expect(preview.summary.nextClosingDate).toBe("2026-07-30");
    expect(preview.summary.nextDueDate).toBe("2026-08-07");
  });

  it("preserves card groups, installments and explicit USD movements", () => {
    const { preview } = parseGaliciaVisaStatement(raw, 4);

    expect(preview.groups.map((group) => group.cardLast4)).toEqual(["8238", "9138"]);

    const juanita = preview.rows.find((row) => row.referenceRaw === "MERPAGO*JUANITAJO");
    expect(juanita?.installmentRaw).toBe("01/06");
    expect(juanita?.amountPesos).toBe("49.666,70");
    expect(juanita?.groupId).toBe("visa-card-9138");

    const planV = preview.rows.find((row) => row.referenceRaw?.includes("VISA PLAN V"));
    expect(planV?.installmentRaw).toBe("09/12");
    expect(planV?.groupId).toBe("visa-card-9138");

    const microsoft = preview.rows.find((row) => row.originalText.includes("MicrosoftUSD"));
    expect(microsoft?.referenceRaw).toBe("Microsoft*Micros MicrosoftUSD");
    expect(microsoft?.receiptRaw).toBe("029107");
    expect(microsoft?.amountPesos).toBeNull();
    expect(microsoft?.amountDollars).toBe("3,22");
    expect(microsoft?.currencyOriginal).toBe("USD");
  });

  it("keeps issuer future-installment totals as reference rows", () => {
    const { preview } = parseGaliciaVisaStatement(raw, 4);

    expect(preview.futureInstallmentsBlock.map((row) => [row.referenceRaw, row.amountPesos])).toEqual([
      ["Julio/26", "1.590.554,41"],
      ["Agosto/26", "1.303.256,35"],
      ["Setiembre/26", "1.089.796,82"],
      ["Octubre/26", "768.264,88"],
      ["Noviembre/26", "383.518,84"],
      ["Diciembre/26", "0,00"],
    ]);
  });

  it("fails closed when a dated financial line cannot be parsed", () => {
    const broken = raw.replace(
      "06-06-26 * MERPAGO*JUANITAJO 01/06 148961 49.666,70",
      "06-06-26 * MERPAGO*JUANITAJO 01/06 148961",
    );

    expect(() => parseGaliciaVisaStatement(broken, 4)).toThrow(
      StatementParseCompletenessError,
    );
  });
});
