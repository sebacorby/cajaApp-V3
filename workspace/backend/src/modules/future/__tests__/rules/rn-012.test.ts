import { describe, expect, it } from "vitest";
import { persistedMonthKeys } from "../../rules/persistence.js";
import { occurrence } from "./test-data.js";

describe("RN-012 — persisted projections", () => {
  it("reports persisted months from supplied occurrences without recalculating them", () => {
    const rows = [
      occurrence({ monthKey: "2026-08" }),
      occurrence({ id: "p-2", monthKey: "2027-03" }),
    ];
    expect(persistedMonthKeys(rows)).toEqual(["2026-08", "2027-03"]);
    expect(rows[1].monthKey).toBe("2027-03");
  });

  it("does not depend on the current clock", () => {
    const rows = [occurrence({ monthKey: "2030-01" })];
    const first = persistedMonthKeys(rows);
    const second = persistedMonthKeys(rows);
    expect(first).toEqual(second);
  });
});
