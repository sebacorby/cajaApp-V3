import { describe, expect, it } from "vitest";
import {
  addCents,
  emptyMoneyBucket,
  serializeMoneyBucket,
} from "../../rules/amount.js";

describe("RN-005 — currency separation", () => {
  it("adds ARS cents only to the ARS bucket", () => {
    const bucket = emptyMoneyBucket();
    addCents(bucket, "ARS", 100n);
    expect(bucket).toEqual({ ars: 100n, usd: 0n });
  });

  it("adds USD cents only to the USD bucket", () => {
    const bucket = emptyMoneyBucket();
    addCents(bucket, "USD", 100n);
    expect(bucket).toEqual({ ars: 0n, usd: 100n });
  });

  it("keeps mixed accumulation independent and serializes both totals", () => {
    const bucket = emptyMoneyBucket();
    addCents(bucket, "ARS", 10000n);
    addCents(bucket, "USD", 4000n);
    expect(bucket).toEqual({ ars: 10000n, usd: 4000n });
    expect(serializeMoneyBucket(bucket)).toEqual({ ars: "100.00", usd: "40.00" });
  });
});
