import { describe, expect, it } from "vitest";
import { sortCards, sortMonths, sortOccurrences } from "../../rules/ordering.js";
import { occurrence } from "./test-data.js";

describe("RN-015 — stable ordering", () => {
  it("sorts months chronologically without mutating the input", () => {
    const input = [{ monthKey: "2026-10" }, { monthKey: "2026-08" }, { monthKey: "2026-09" }];
    expect(sortMonths(input).map((month) => month.monthKey)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(input.map((month) => month.monthKey)).toEqual(["2026-10", "2026-08", "2026-09"]);
  });

  it("sorts cards by last four digits, holder, then id", () => {
    const input = [
      { cardId: "b", cardLast4: "9999", holderName: "A" },
      { cardId: "c", cardLast4: "1234", holderName: "Z" },
      { cardId: "a", cardLast4: "1234", holderName: "A" },
    ];
    expect(sortCards(input).map((card) => card.cardId)).toEqual(["a", "c", "b"]);
  });

  it("sorts rows by origin reference, installment, and id", () => {
    const input = [
      occurrence({ id: "z", originReference: "B", installmentCurrent: 2 }),
      occurrence({ id: "b", originReference: "A", installmentCurrent: 3 }),
      occurrence({ id: "a", originReference: "A", installmentCurrent: 2 }),
    ];
    expect(sortOccurrences(input).map((row) => row.id)).toEqual(["a", "b", "z"]);
    expect(input.map((row) => row.id)).toEqual(["z", "b", "a"]);
  });
});
