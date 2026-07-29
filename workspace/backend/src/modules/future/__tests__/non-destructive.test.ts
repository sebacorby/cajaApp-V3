import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { buildApp } from "../../../app.js";
import { FutureDebtService } from "../future.service.js";
import type { FutureDebtReader } from "../future.types.js";
import { datasetA } from "./fixtures/dataset-a.js";
import {
  createFutureTestDatabase,
  seedFutureFixture,
} from "./fixtures/test-db.js";

type Snapshot = { projectionCount: number; checksum: string };

async function snapshot(db: PrismaClient): Promise<Snapshot> {
  const [projections, statements, groups, rows, manualPurchases] = await Promise.all([
    db.cardInstallmentProjection.findMany({ orderBy: { id: "asc" } }),
    db.cardStatement.findMany({ orderBy: { id: "asc" } }),
    db.cardStatementGroup.findMany({ orderBy: { id: "asc" } }),
    db.cardStatementRow.findMany({ orderBy: { id: "asc" } }),
    db.manualCardPurchase.findMany({ orderBy: { id: "asc" } }),
  ]);
  const canonical = JSON.stringify({ projections, statements, groups, rows, manualPurchases });
  return {
    projectionCount: projections.length,
    checksum: createHash("sha256").update(canonical).digest("hex"),
  };
}

describe("RN-009 — future-debt reads are non-destructive", () => {
  let db: PrismaClient;
  let app: FastifyInstance;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const harness = await createFutureTestDatabase();
    db = harness.db;
    closeDatabase = harness.close;
    await seedFutureFixture(db, datasetA);
    app = await buildApp({
      futureDebtService: new FutureDebtService(
        db as unknown as FutureDebtReader,
        { warn: () => undefined, info: () => undefined },
      ),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("keeps persisted counts/checksum unchanged after 100 sequential reads", async () => {
    const before = await snapshot(db);
    for (let index = 0; index < 100; index += 1) {
      const response = await app.inject({
        method: "GET",
        url: "/api/future-debt?from=2026-08&months=6&includeCurrentPeriod=false",
      });
      expect(response.statusCode).toBe(200);
    }
    const after = await snapshot(db);
    expect(after).toEqual(before);
  });
});
