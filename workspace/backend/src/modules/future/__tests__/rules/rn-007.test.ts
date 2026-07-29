import { describe, expect, it } from "vitest";
import {
  isSourcePurchase,
  onlyPersistedOccurrences,
} from "../../rules/exclusion.js";
import { occurrence } from "./test-data.js";

describe("RN-007 — source purchase exclusion", () => {
  it("does not treat a manual purchase source as a future occurrence", () => {
    const source = { sourceType: "manual_card_purchase" as const, isManual: true };
    expect(isSourcePurchase(source)).toBe(true);
    expect(onlyPersistedOccurrences([
      { ...occurrence({ sourceType: "manual_card_purchase", isManual: true }), rowType: "source_purchase" },
      { ...occurrence({ sourceType: "manual_card_purchase", isManual: true, id: "purchase-1" }), rowType: "source_purchase" },
    ])).toHaveLength(0);
  });

  it("retains only persisted projection occurrences", () => {
    const projected = occurrence({ sourceType: "card_statement", isManual: false });
    expect(onlyPersistedOccurrences([projected])).toEqual([projected]);
  });
});
