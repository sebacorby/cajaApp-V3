import { describe, expect, it } from "vitest";
import { aggregateOccurrences, emptyMoneyBucket, serializeMoneyBucket } from "../../rules/amount.js";
import { occurrence } from "./test-data.js";

describe("RN-011 — exact totals", () => {
  it("matches visible ARS detail exactly and leaves USD independent", () => {
    const result = aggregateOccurrences([
      occurrence({ amountPesosRaw: "10000.00" }),
      occurrence({ id: "p-2", amountPesosRaw: "15000.00" }),
      occurrence({ id: "p-3", amountPesosRaw: "25000.00" }),
    ]);
    expect(serializeMoneyBucket(result)).toEqual({ ars: "50000.00", usd: "0.00" });
  });

  it("returns zero buckets for an empty visible collection", () => {
    expect(aggregateOccurrences([])).toEqual(emptyMoneyBucket());
  });
});
