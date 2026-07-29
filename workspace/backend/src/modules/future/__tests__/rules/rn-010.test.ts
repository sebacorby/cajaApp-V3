import { describe, expect, it } from "vitest";
import {
  filterToMonthRange,
  monthSequence,
  validateHorizon,
} from "../../rules/month-sequence.js";
import { occurrence } from "./test-data.js";

describe("RN-010 — bounded horizon", () => {
  it("uses six month keys by default", () => {
    expect(monthSequence("2026-08", 6)).toHaveLength(6);
    expect(monthSequence("2026-08", 6).at(-1)).toBe("2027-01");
  });

  it.each([1, 24])("accepts horizon boundary %s", (months) => {
    expect(validateHorizon(months)).toBe(months);
  });

  it.each([0, 25])("rejects horizon %s", (months) => {
    expect(() => validateHorizon(months)).toThrow();
  });

  it("filters out-of-range rows without changing the input", () => {
    const outside = occurrence({ monthKey: "2027-02" });
    const inside = occurrence({ id: "inside", monthKey: "2026-08" });
    const input = [outside, inside];
    const filtered = filterToMonthRange(input, "2026-08", 6);
    expect(filtered).toEqual([inside]);
    expect(input).toEqual([outside, inside]);
  });
});
