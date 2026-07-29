import { describe, expect, it } from "vitest";
import { effectivePeriodKey } from "../../rules/exclusion.js";
import { occurrence } from "./test-data.js";

describe("RN-008 — persisted month key authority", () => {
  it("uses monthKey even when the purchase date is in another month", () => {
    const row = occurrence({ dateIso: "2026-06-28", monthKey: "2026-08" });
    expect(effectivePeriodKey(row)).toBe("2026-08");
  });
});
