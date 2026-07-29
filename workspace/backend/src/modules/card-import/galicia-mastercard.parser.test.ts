import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";
import { parseGaliciaMastercardStatement } from "./galicia-mastercard.parser.js";

const fixturePath = path.resolve(
  process.cwd(),
  "src/modules/card-import/__fixtures__/mastercard-galicia-julio2026.raw.txt",
);
const raw = fs.readFileSync(fixturePath, "utf8");

describe("Galicia Mastercard deterministic parser", () => {
  it("parses every dated financial line in the real Mastercard fixture", () => {
    const result = parseGaliciaMastercardStatement(raw, 6);

    expect(result.diagnostics.candidateTransactionLines).toBe(53);
    expect(result.diagnostics.parsedTransactionLines).toBe(53);
    expect(result.diagnostics.unexplainedTransactionLines).toEqual([]);
    expect(result.diagnostics.futureReferenceRows).toBe(6);
    expect(cardStatementPreviewSchema.safeParse(result.preview).success).toBe(true);
  });

  it("extracts the statement identity, totals and billing dates", () => {
    const { preview } = parseGaliciaMastercardStatement(raw, 6);

    expect(preview.source.bankName).toBe("Banco Galicia");
    expect(preview.source.brand).toContain("MASTERCARD BLACK");
    expect(preview.source.statementNumber).toBe("027012704157");
    expect(preview.summary.totalPesos).toBe("1.425.613,43");
    expect(preview.summary.totalDollars).toBe("0,00");
    expect(preview.summary.minimumPaymentPesos).toBe("875.680,00");
    expect(preview.summary.currentDueDate).toBe("2026-07-13");
    expect(preview.summary.nextClosingDate).toBe("2026-07-30");
    expect(preview.summary.nextDueDate).toBe("2026-08-07");
  });

  it("preserves installment sequences required by the existing projection engine", () => {
    const { preview } = parseGaliciaMastercardStatement(raw, 6);
    const byDescription = new Map(
      preview.rows.map((row) => [row.referenceRaw ?? "", row]),
    );

    expect(byDescription.get("JUANITA JO")?.installmentRaw).toBe("12/18");
    expect(byDescription.get("MERPAGO*SCENTERTUC")?.installmentRaw).toBe("02/18");
    expect(byDescription.get("IARA CALZADOS")?.installmentRaw).toBe("01/03");
    expect(byDescription.get("TODO MODA 655")?.installmentRaw).toBe("01/03");
    expect(byDescription.get("RAIDERS JEANS")?.installmentRaw).toBe("01/03");
    expect(byDescription.get("M Y S")?.installmentRaw).toBe("01/03");
    expect(byDescription.get("MERPAGO*VER")?.installmentRaw).toBe("01/06");
    expect(byDescription.get("XL")?.installmentRaw).toBe("01/03");
  });

  it("keeps issuer future-installment totals as reference rows", () => {
    const { preview } = parseGaliciaMastercardStatement(raw, 6);

    expect(preview.futureInstallmentsBlock.map((row) => [row.referenceRaw, row.amountPesos])).toEqual([
      ["Julio-26", "955.818,67"],
      ["Agosto-26", "955.818,67"],
      ["Septiembre-26", "820.801,97"],
      ["Octubre-26", "562.204,31"],
      ["Noviembre-26", "562.204,31"],
      ["Diciembre-26", "302.342,21"],
    ]);
  });
});
