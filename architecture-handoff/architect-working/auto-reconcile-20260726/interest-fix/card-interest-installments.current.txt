import { describe, expect, it } from "vitest";
import type { CardStatementRow } from "../../src/modules/cards/cards.types.js";
import { installmentProjectionService } from "../../src/modules/projections/installment-projection.service.js";
import { deriveMissingInstallmentMonths } from "../../src/modules/cards/card-payments-presentation.js";

function interestRow(input: {
  id: string;
  installmentRaw: string;
  amountPesos: string;
}): CardStatementRow {
  return {
    id: input.id,
    sectionId: "section-1",
    groupId: "group-1",
    displayOrder: 1,
    rowType: "interest",
    dateRaw: null,
    dateIso: null,
    installmentRaw: input.installmentRaw,
    referenceRaw: `INTERESES ${input.installmentRaw}`,
    originalText: `INTERESES ${input.installmentRaw}`,
    amountPesos: input.amountPesos,
    amountDollars: null,
    currencyOriginal: "ARS",
    confidence: 1,
  } as CardStatementRow;
}

describe("interest installment projection", () => {
  it("projects INTERESES 09/12 even when rowType is not transaction", () => {
    const projections = installmentProjectionService.calculateProjections(
      [interestRow({ id: "interest-09", installmentRaw: "09/12", amountPesos: "67479.45" })],
      "2026-07",
    );

    expect(projections.map((item) => [item.monthKey, item.installmentCurrent])).toEqual([
      ["2026-08", 10],
      ["2026-09", 11],
      ["2026-10", 12],
    ]);
    expect(projections.every((item) => item.amountPesos === "67479.45")).toBe(true);
  });

  it("projects INTERESES 07/12 through December", () => {
    const projections = installmentProjectionService.calculateProjections(
      [interestRow({ id: "interest-07", installmentRaw: "07/12", amountPesos: "83791.29" })],
      "2026-07",
    );

    expect(projections.map((item) => [item.monthKey, item.installmentCurrent])).toEqual([
      ["2026-08", 8],
      ["2026-09", 9],
      ["2026-10", 10],
      ["2026-11", 11],
      ["2026-12", 12],
    ]);
  });

  it("repairs only missing months for an already accepted statement", () => {
    const missing = deriveMissingInstallmentMonths({
      statementMonthKey: "2026-07",
      installmentRaw: "09/12",
      existingMonthKeys: ["2026-07", "2026-09"],
      rangeFrom: "2026-07",
      rangeTo: "2026-12",
    });

    expect(missing).toEqual([
      { monthKey: "2026-08", installmentNumber: 10, installmentTotal: 12 },
      { monthKey: "2026-10", installmentNumber: 12, installmentTotal: 12 },
    ]);
  });
});
