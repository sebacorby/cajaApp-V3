import { beforeAll, afterAll, describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../app.js";
import { futureDebtResponseSchema } from "../future.schemas.js";
import { FutureDebtService } from "../future.service.js";
import { datasetA } from "./fixtures/dataset-a.js";
import { FixtureReader } from "./fixtures/support.js";
import {
  createFutureTestDatabase,
  seedFutureFixture,
  resetFutureTestDatabase,
} from "./fixtures/test-db.js";
import type { PrismaClient } from "@prisma/client";
import { logger } from "../../../shared/logger.js";

describe("GET /api/future-debt — HTTP contract", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const reader = new FixtureReader();
    reader.load(datasetA);
    app = await buildApp({ futureDebtService: new FutureDebtService(reader) });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the locked envelope for an explicit six-month query", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/future-debt?from=2026-08&months=6&includeCurrentPeriod=false",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.range).toMatchObject({
      from: "2026-08",
      to: "2027-01",
      months: 6,
      includeCurrentPeriod: false,
    });
    expect(futureDebtResponseSchema.parse(body)).toEqual(body);
    expect(body).not.toHaveProperty("income");
    expect(body).not.toHaveProperty("other_commitment");
    expect(body.months[0].cards[0].rows[0]).toMatchObject({
      cardId: "group-a",
      cardLast4: "1234",
      holderName: "JAVI",
      cardLabel: "Visa •••• 1234",
    });
  });

  it("applies UTC current-month, six-month, and false-boolean defaults", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/future-debt",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.range.months).toBe(6);
    expect(body.range.includeCurrentPeriod).toBe(false);
    expect(body.range.from).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(body.range.to).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it("accepts the valid horizon boundaries and literal booleans", async () => {
    for (const months of [1, 24]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/future-debt?from=2026-08&months=${months}&includeCurrentPeriod=true`,
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).range.months).toBe(months);
      expect(JSON.parse(response.body).range.includeCurrentPeriod).toBe(true);
    }
  });

  it.each([
    "from=invalid",
    "from=2026-13",
    "from=2026-08&months=0",
    "from=2026-08&months=25",
    "from=2026-08&months=1.5",
    "from=2026-08&months=abc",
    "from=2026-08&months=1e1",
    "from=2026-08&includeCurrentPeriod=1",
    "from=2026-08&includeCurrentPeriod=False",
    "from=2026-08&includeCurrentPeriod=falsey",
  ])("rejects ambiguous or invalid query %s", async (query) => {
    const response = await app.inject({
      method: "GET",
      url: `/api/future-debt?${query}`,
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ code: "INVALID_QUERY" });
  });

  it("removes the old path and keeps the new surface GET-only", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/api/future-commitments" }))
        .statusCode,
    ).toBe(404);
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      expect(
        (await app.inject({ method, url: "/api/future-debt" })).statusCode,
      ).toBe(404);
    }
  });

  it("includes the active current period only when requested", async () => {
    const reader = new FixtureReader();
    reader.load({
      ...datasetA,
      projections: [{ ...datasetA.projections[0], monthKey: "2026-07" }],
    });
    const localApp = await buildApp({
      futureDebtService: new FutureDebtService(reader),
    });
    const hidden = await localApp.inject({
      method: "GET",
      url: "/api/future-debt?from=2026-07&months=1",
    });
    const shown = await localApp.inject({
      method: "GET",
      url: "/api/future-debt?from=2026-07&months=1&includeCurrentPeriod=true",
    });
    expect(JSON.parse(hidden.body).months).toHaveLength(0);
    expect(JSON.parse(shown.body).months).toHaveLength(1);
    await localApp.close();
  });
});

describe("DELETE /api/future-debt/rows/:id", () => {
  // Use a real Prisma database so we can test write operations
  let app: FastifyInstance;
  let db: PrismaClient;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    const { db: testDb, close } = await createFutureTestDatabase();
    db = testDb;
    closeDb = close;
    app = await buildApp({
      futureDebtService: new FutureDebtService(db, logger, db),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  beforeEach(async () => {
    await resetFutureTestDatabase(db);
  });

  it("returns 404 for non-existent ID", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/future-debt/rows/c000000000000000000000000",
    });
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 400 for malformed ID (not a CUID)", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/future-debt/rows/not-a-cuid",
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("INVALID_ID");
  });

  it("deletes a regular (non-manual) projection row and returns 204", async () => {
    // Seed: one statement + one projection (non-manual) with CUID-format IDs
    const { projections, ...rest } = datasetA;
    const regularProjection = projections.find((p) => !p.isManual)!;
    const projectionId = "c000000000000000000000001";
    await seedFutureFixture(db, {
      ...rest,
      projections: [{ ...regularProjection, id: projectionId }],
    });

    // Verify it exists in GET
    const beforeResponse = await app.inject({
      method: "GET",
      url: "/api/future-debt?from=2026-08&months=1",
    });
    expect(beforeResponse.statusCode).toBe(200);
    const beforeBody = JSON.parse(beforeResponse.body);
    const rowIds = beforeBody.months.flatMap(
      (m: { cards: { rows: { id: string }[] }[] }) =>
        m.cards.flatMap((c: { rows: { id: string }[] }) =>
          c.rows.map((r) => r.id),
        ),
    );
    expect(rowIds).toContain(projectionId);

    // Delete it
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/future-debt/rows/${projectionId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe("");

    // Verify it's gone from GET
    const afterResponse = await app.inject({
      method: "GET",
      url: "/api/future-debt?from=2026-08&months=1",
    });
    expect(afterResponse.statusCode).toBe(200);
    const afterBody = JSON.parse(afterResponse.body);
    const afterRowIds = afterBody.months.flatMap(
      (m: { cards: { rows: { id: string }[] }[] }) =>
        m.cards.flatMap((c: { rows: { id: string }[] }) =>
          c.rows.map((r) => r.id),
        ),
    );
    expect(afterRowIds).not.toContain(projectionId);
  });

  it("deletes a manual projection row and cascades to ManualCardPurchase", async () => {
    // Create a manual purchase and its projection with CUID-format IDs
    const manualPurchaseId = "c000000000000000000000002";
    const manualProjectionId = "c000000000000000000000003";
    const statementId = "stmt-manual";
    const manualDataset = {
      statements: [
        {
          id: statementId,
          status: "accepted" as const,
          periodLabel: "2026-07-01",
          periodKey: "2026-07",
          isActiveForPeriod: true,
          bankName: "Banco Test",
          brand: "Visa",
          holderName: "TEST",
        },
      ],
      groups: [],
      rows: [],
      manualPurchases: [
        {
          id: manualPurchaseId,
          statementId,
          cardLast4: "9999",
          holderName: "Test User",
          purchaseDate: "2026-07-01",
          description: "Test manual purchase",
          currency: "ARS",
          amountRaw: "5000.00",
          installments: 1,
        },
      ],
      projections: [
        {
          id: manualProjectionId,
          statementId,
          rowId: manualPurchaseId, // for manual rows, rowId = manualPurchase.id
          monthKey: "2026-08",
          label: "Agosto-2026",
          installmentCurrent: 1,
          installmentTotal: 1,
          amountPesosRaw: "5000.00",
          amountDollarsRaw: null,
          currencyOriginal: "ARS",
          isManual: true,
        },
      ],
      expected: {},
    };

    await seedFutureFixture(db, manualDataset);

    // Verify both exist
    const beforeCount = await db.manualCardPurchase.count({
      where: { id: manualPurchaseId },
    });
    expect(beforeCount).toBe(1);
    const beforeProjCount = await db.cardInstallmentProjection.count({
      where: { id: manualProjectionId },
    });
    expect(beforeProjCount).toBe(1);

    // Delete the projection
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/future-debt/rows/${manualProjectionId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    // Verify both are gone
    const afterManualCount = await db.manualCardPurchase.count({
      where: { id: manualPurchaseId },
    });
    expect(afterManualCount).toBe(0);
    const afterProjCount = await db.cardInstallmentProjection.count({
      where: { id: manualProjectionId },
    });
    expect(afterProjCount).toBe(0);
  });
});
