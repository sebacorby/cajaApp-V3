import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../app.js";
import { FutureDebtService } from "../future.service.js";
import { datasetC } from "./fixtures/dataset-c.js";
import { FixtureReader } from "./fixtures/support.js";

describe("RN-016 — future-debt wire determinism", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const reader = new FixtureReader();
    reader.load({
      ...datasetC,
      projections: [...datasetC.projections].reverse(),
      groups: [...datasetC.groups].reverse(),
      rows: [...datasetC.rows].reverse(),
    });
    app = await buildApp({ futureDebtService: new FutureDebtService(reader) });
    await app.ready();
  });

  afterAll(async () => app.close());

  it("returns byte-identical JSON twice and keeps month/card/row order stable", async () => {
    const first = await app.inject({ method: "GET", url: "/api/future-debt?from=2026-08&months=6" });
    const second = await app.inject({ method: "GET", url: "/api/future-debt?from=2026-08&months=6" });
    expect(first.body).toBe(second.body);
    const body = JSON.parse(first.body);
    expect(body.months.map((month: { monthKey: string }) => month.monthKey)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(body.months.flatMap((month: { cards: Array<{ rows: Array<{ installmentNumber: number }> }> }) => month.cards.flatMap((card) => card.rows.map((row) => row.installmentNumber)))).toEqual([2, 3, 4]);
    expect(body).not.toHaveProperty("timestamp");
    expect(body).not.toHaveProperty("generatedAt");
  });
});
