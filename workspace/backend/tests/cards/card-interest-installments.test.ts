import { describe, expect, it } from "vitest";
import type { CardStatementRow } from "../../src/modules/cards/cards.types.js";
import type { CardPaymentMovement } from "../../src/modules/cards/card-payments.service.js";
import { resolveInstallmentSequence } from "../../src/shared/installment-sequence.js";
import { installmentProjectionService } from "../../src/modules/projections/installment-projection.service.js";
import {
  deriveMissingInstallmentMonths,
  repairMovementInstallmentSequence,
} from "../../src/modules/cards/card-payments-presentation.js";

function interestRow(input: {
  id: string;
  installmentRaw: string | null;
  referenceRaw: string | null;
  originalText: string;
  amountPesos: string;
}): CardStatementRow {
  return {
    id: input.id,
    sectionId: "section-1",
    groupId: "group-1",
    displayOrder: 1,
    rowType: "charge",
    dateRaw: null,
    dateIso: null,
    installmentRaw: input.installmentRaw,
    referenceRaw: input.referenceRaw,
    originalText: input.originalText,
    amountPesos: input.amountPesos,
    amountDollars: null,
    currencyOriginal: "ARS",
    confidence: 1,
  } as CardStatementRow;
}

describe("interest installment projection", () => {
  it("resolves an installment sequence from source text when installmentRaw is null", () => {
    expect(
      resolveInstallmentSequence(
        null,
        "INTERESES",
        "16-Oct-25 INTERESES 09/12 67.479,45",
      ),
    ).toEqual({ raw: "9/12", current: 9, total: 12 });
  });

  it("projects INTERESES 09/12 from originalText when installmentRaw is null", () => {
    const projections = installmentProjectionService.calculateProjections(
      [
        interestRow({
          id: "interest-09",
          installmentRaw: null,
          referenceRaw: "INTERESES",
          originalText: "16-Oct-25 INTERESES 09/12 67.479,45",
          amountPesos: "67479.45",
        }),
      ],
      "2026-07",
    );

    expect(projections.map((item) => [item.monthKey, item.installmentCurrent])).toEqual([
      ["2026-08", 10],
      ["2026-09", 11],
      ["2026-10", 12],
    ]);
    expect(projections.every((item) => item.amountPesos === "67479.45")).toBe(true);
  });

  it("projects INTERESES 07/12 from reference text through December", () => {
    const projections = installmentProjectionService.calculateProjections(
      [
        interestRow({
          id: "interest-07",
          installmentRaw: null,
          referenceRaw: "INTERESES 07/12",
          originalText: "11-Dic-25 INTERESES 07/12 83.791,29",
          amountPesos: "83791.29",
        }),
      ],
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

  it("repairs only missing months from a sequence embedded in source text", () => {
    const missing = deriveMissingInstallmentMonths({
      statementMonthKey: "2026-07",
      installmentRaw: "INTERESES 09/12",
      existingMonthKeys: ["2026-07", "2026-09"],
      rangeFrom: "2026-07",
      rangeTo: "2026-12",
    });

    expect(missing).toEqual([
      { monthKey: "2026-08", installmentNumber: 10, installmentTotal: 12 },
      { monthKey: "2026-10", installmentNumber: 12, installmentTotal: 12 },
    ]);
  });

  it("repairs an accepted INTERESES 09/12 using the visible movement when no persisted row can be linked", () => {
    const movement: CardPaymentMovement = {
      id: "matrix-interest-09",
      sourceType: "statement_row",
      description: "INTERESES 09/12",
      dateIso: "2025-10-16",
      cells: [
        {
          monthKey: "2026-07",
          status: "confirmed",
          installmentNumber: null,
          installmentTotal: null,
          ars: "67479.45",
          usd: "0.00",
        },
      ],
    };

    const repaired = repairMovementInstallmentSequence({
      movement,
      row: null,
      statementMonthKey: "2026-07",
      rangeFrom: "2026-07",
      rangeTo: "2026-12",
    });

    expect(repaired).toBe(3);
    expect(
      movement.cells.map((cell) => [cell.monthKey, cell.installmentNumber, cell.ars]),
    ).toEqual([
      ["2026-07", null, "67479.45"],
      ["2026-08", 10, "67479.45"],
      ["2026-09", 11, "67479.45"],
      ["2026-10", 12, "67479.45"],
    ]);
  });
});
