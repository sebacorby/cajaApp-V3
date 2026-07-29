import { describe, expect, it } from "vitest";
import { stableSerialize } from "../../serializers/response.js";
import { occurrence } from "./test-data.js";

describe("RN-016 — deterministic serialization", () => {
  it("serializes equivalent object insertion orders to identical bytes", () => {
    const first = {
      rows: [occurrence()],
      summary: { usd: "0.00", ars: "100.00" },
      range: { to: "2026-08", from: "2026-08" },
    };
    const second = {
      range: { from: "2026-08", to: "2026-08" },
      summary: { ars: "100.00", usd: "0.00" },
      rows: [occurrence()],
    };
    expect(stableSerialize(first)).toBe(stableSerialize(second));
    expect(stableSerialize(first)).not.toContain("timestamp");
  });

  it("does not add a request-time field", () => {
    const serialized = stableSerialize({ value: 1 });
    expect(serialized).toBe('{"value":1}');
  });
});
