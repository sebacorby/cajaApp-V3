import { describe, expect, it } from "vitest";
import {
  deduplicateOccurrences,
  occurrenceIdentity,
} from "../../rules/identity.js";
import { occurrence } from "./test-data.js";

describe("RN-006 — economic occurrence identity", () => {
  it("collides when all six identity dimensions are equal", () => {
    const first = occurrence();
    const second = occurrence({ id: "projection-copy" });
    expect(occurrenceIdentity(first)).toBe(occurrenceIdentity(second));
    expect(deduplicateOccurrences([first, second])).toMatchObject({
      occurrences: [first],
      duplicateOccurrences: 1,
    });
  });

  it.each([
    ["installmentCurrent", { installmentCurrent: 3 }],
    ["monthKey", { monthKey: "2026-09" }],
    ["currency", { currencyOriginal: "USD", amountPesosRaw: null, amountDollarsRaw: "40.00" }],
    ["card", { cardId: "card-2" }],
    ["source type", { sourceType: "manual_card_purchase", isManual: true }],
    ["source id", { sourceId: "row-2" }],
  ] as const)("changes when %s changes", (_name, change) => {
    expect(occurrenceIdentity(occurrence())).not.toBe(occurrenceIdentity(occurrence(change)));
  });
});
