import { describe, expect, it } from "vitest";
import {
  excludesCurrentPeriod,
  filterCurrentPeriod,
} from "../../rules/exclusion.js";
import { occurrence } from "./test-data.js";

describe("RN-002 — current period exclusion", () => {
  it("excludes a projection in the active statement period by default", () => {
    expect(excludesCurrentPeriod(occurrence({ monthKey: "2026-07" }), "2026-07", false)).toBe(true);
    expect(filterCurrentPeriod([occurrence({ monthKey: "2026-07" })], "2026-07", false)).toHaveLength(0);
  });

  it("retains the active period when explicitly requested", () => {
    expect(excludesCurrentPeriod(occurrence({ monthKey: "2026-07" }), "2026-07", true)).toBe(false);
    expect(filterCurrentPeriod([occurrence({ monthKey: "2026-07" })], "2026-07", true)).toHaveLength(1);
  });

  it("does not exclude a different period", () => {
    expect(excludesCurrentPeriod(occurrence({ monthKey: "2026-08" }), "2026-07", false)).toBe(false);
  });
});
