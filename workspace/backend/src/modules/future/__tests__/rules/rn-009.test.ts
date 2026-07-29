import { describe, expect, it } from "vitest";
import { aggregateOccurrences } from "../../rules/amount.js";
import { occurrence } from "./test-data.js";

describe("RN-009 — non-mutating aggregation", () => {
  it("does not mutate a frozen collection or its rows", () => {
    const row = Object.freeze(occurrence({ amountPesosRaw: "100.00" }));
    const input = Object.freeze([row]);
    expect(() => aggregateOccurrences(input)).not.toThrow();
    expect(input).toEqual([row]);
    expect(row.amountPesosRaw).toBe("100.00");
  });
});
