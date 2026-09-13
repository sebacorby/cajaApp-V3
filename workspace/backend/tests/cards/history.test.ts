import { describe, expect, it } from "vitest";
import type { CardStatementPreview } from "../../src/modules/cards/cards.types.js";
import {
  buildCardStatementHistoryKey,
  resolveCardStatementPeriodKey,
} from "../../src/modules/cards/cards.service.js";


function preview(overrides: Partial<CardStatementPreview> = {}): CardStatementPreview {
  return {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: "Visa",
      statementNumber: "123",
      pageCount: 8,
    },
    summary: {
      totalPesos: "100.000,00",
      totalDollars: "10.00",
      minimumPaymentPesos: "10.000,00",
      currentDueDate: "2026-07-15",
      nextClosingDate: "2026-07-28",
      nextDueDate: "2026-08-15",
    },
    sections: [],
    groups: [],
    rows: [],
    futureInstallmentsBlock: [],
    ...overrides,
  };
}


describe("card statement history identity", () => {
  it("derives the period from the current due date", () => {
    expect(resolveCardStatementPeriodKey(preview())).toBe("2026-07");
  });


  it("falls back to the next closing date when the current due date is unavailable", () => {
    const input = preview({
      summary: {
        ...preview().summary,
        currentDueDate: null,
        nextClosingDate: "2026-08-02",
      },
    });
    expect(resolveCardStatementPeriodKey(input)).toBe("2026-08");
  });


  it("returns null when no valid statement date exists", () => {
    const input = preview({
      summary: {
        ...preview().summary,
        currentDueDate: null,
        nextClosingDate: null,
        nextDueDate: null,
      },
    });
    expect(resolveCardStatementPeriodKey(input)).toBeNull();
    expect(buildCardStatementHistoryKey(input, null)).toBeNull();
  });


  it("builds a stable account-period key independent from extracted card groups", () => {
    const first = preview({
      groups: [{ id: "g1", displayOrder: 1, label: "Titular", cardLast4: "1234", holderName: "Javi" }],
    });
    const corrected = preview({
      source: {
        ...preview().source,
        bankName: "  BANCO GALICIA ",
        brand: "VISA",
        statementNumber: " 123 ",
      },
      groups: [{ id: "g2", displayOrder: 1, label: "Adicional", cardLast4: "9876", holderName: "Javi" }],
    });


    const expected = "banco galicia|visa|statement:123|2026-07";
    expect(buildCardStatementHistoryKey(first, "2026-07")).toBe(expected);
    expect(buildCardStatementHistoryKey(corrected, "2026-07")).toBe(expected);
  });


  it("does not merge two statements from the same bank, brand and period", () => {
    const first = preview();
    const second = preview({
      source: { ...preview().source, statementNumber: "456" },
    });


    expect(buildCardStatementHistoryKey(first, "2026-07")).not.toBe(
      buildCardStatementHistoryKey(second, "2026-07"),
    );
  });


  it("uses an explicit unknown identity when the statement number is absent", () => {
    const input = preview({
      source: { ...preview().source, statementNumber: null },
    });


    expect(buildCardStatementHistoryKey(input, "2026-07")).toBe(
      "banco galicia|visa|unknown|2026-07",
    );
  });
});