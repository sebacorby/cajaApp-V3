import { describe, expect, it } from "vitest";
import {
  monthKeyWithOffset,
  monthSequence,
  requireMonthKey,
} from "../../rules/month-sequence.js";

describe("RN-001 — calendar month sequence", () => {
  it("advances July to August without using day arithmetic", () => {
    expect(monthKeyWithOffset("2026-07", 1)).toBe("2026-08");
  });

  it("rolls December into the next year", () => {
    expect(monthKeyWithOffset("2026-12", 1)).toBe("2027-01");
  });

  it("advances February to March in leap and non-leap years", () => {
    expect(monthKeyWithOffset("2028-02", 1)).toBe("2028-03");
    expect(monthKeyWithOffset("2027-02", 1)).toBe("2027-03");
  });

  it("keeps zero offset stable", () => {
    expect(monthKeyWithOffset("2026-02", 0)).toBe("2026-02");
  });

  it("creates an inclusive six-month sequence", () => {
    expect(monthSequence("2026-07", 6)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("rejects impossible month keys", () => {
    expect(() => requireMonthKey("2026-13")).toThrow();
  });
});
