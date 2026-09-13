import { describe, expect, it } from "vitest";
import { getAiJobTimeoutMs } from "../../src/modules/ai/ai-processor-worker.js";

describe("getAiJobTimeoutMs", () => {
  it("preserves the configured positive timeout", () => {
    expect(getAiJobTimeoutMs(60_000)).toBe(60_000);
    expect(getAiJobTimeoutMs(480_000)).toBe(480_000);
  });

  it("rejects zero and negative values", () => {
    expect(() => getAiJobTimeoutMs(0)).toThrow(
      "jobTimeoutMs must be a positive finite number",
    );
    expect(() => getAiJobTimeoutMs(-1)).toThrow(
      "jobTimeoutMs must be a positive finite number",
    );
  });

  it("rejects non-finite values", () => {
    expect(() => getAiJobTimeoutMs(Number.POSITIVE_INFINITY)).toThrow(
      "jobTimeoutMs must be a positive finite number",
    );
    expect(() => getAiJobTimeoutMs(Number.NaN)).toThrow(
      "jobTimeoutMs must be a positive finite number",
    );
  });
});
