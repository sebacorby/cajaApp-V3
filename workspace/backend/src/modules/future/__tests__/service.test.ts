import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { FutureDebtService } from "../future.service.js";
import type { FutureDebtQuery, FutureDebtReader } from "../future.types.js";
import { datasetA } from "./fixtures/dataset-a.js";
import { datasetB } from "./fixtures/dataset-b.js";
import { datasetC } from "./fixtures/dataset-c.js";
import { datasetD } from "./fixtures/dataset-d.js";
import {
  createFutureTestDatabase,
  resetFutureTestDatabase,
  seedFutureFixture,
} from "./fixtures/test-db.js";
import type { FutureFixture } from "./fixtures/support.js";

describe("FutureDebtService — persisted projection datasets", () => {
  let db: PrismaClient;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const harness = await createFutureTestDatabase();
    db = harness.db;
    closeDatabase = harness.close;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function read(
    fixture: FutureFixture,
    query: FutureDebtQuery = {
      from: "2026-08",
      months: 6,
      includeCurrentPeriod: false,
    },
  ) {
    await resetFutureTestDatabase(db);
    await seedFutureFixture(db, fixture);
    const service = new FutureDebtService(db as unknown as FutureDebtReader, {
      warn: () => undefined,
      info: () => undefined,
    });
    return service.getFutureDebt(query);
  }

  it("FEAT-016 Dataset A returns exactly five future ARS rows and calendar totals", async () => {
    const response = await read(datasetA);
    const rows = response.months.flatMap((month) =>
      month.cards.flatMap((card) => card.rows),
    );
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.installmentLabel)).toEqual([
      "2/3",
      "4/6",
      "3/3",
      "5/6",
      "6/6",
    ]);
    expect(response.months.map((month) => month.monthKey)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(response.months.map((month) => month.totals.ars)).toEqual([
      "35000.00",
      "35000.00",
      "25000.00",
    ]);
    expect(response.summary).toEqual({ ars: "95000.00", usd: "0.00" });
  });

  it("FEAT-018 Dataset B keeps ARS and USD totals separate", async () => {
    const response = await read(datasetB);
    expect(response.summary).toEqual({ ars: "10000.00", usd: "40.00" });
    expect(response.months[0].totals).toEqual({
      ars: "10000.00",
      usd: "40.00",
    });
    expect(response.months[0].cards[0].totals).toEqual({
      ars: "10000.00",
      usd: "40.00",
    });
  });

  it("FEAT-019 Dataset C deduplicates one economic occurrence", async () => {
    const response = await read(datasetC);
    const rows = response.months.flatMap((month) =>
      month.cards.flatMap((card) => card.rows),
    );
    expect(rows).toHaveLength(3);
    expect(response.diagnostics.duplicateOccurrences).toBe(1);
    expect(response.summary.ars).toBe("90000.00");
  });

  it("FEAT-020 Dataset D puts unsafe rows in pendientes and excludes all totals", async () => {
    const response = await read(datasetD);
    expect(response.months).toHaveLength(0);
    expect(response.summary).toEqual({ ars: "0.00", usd: "0.00" });
    expect(response.pendientes.rows).toHaveLength(3);
    expect(
      response.pendientes.rows.map((row) => row.diagnostic).sort(),
    ).toEqual([
      "invalid_installment",
      "missing_card_reference",
      "missing_currency",
    ]);
    expect(response.diagnostics).toMatchObject({
      invalidInstallmentRows: 1,
      missingCurrencyRows: 1,
      missingCardRows: 1,
    });
  });

  it("reads statement and manual purchase projections without adding source purchase amount", async () => {
    const fixture = structuredClone(datasetB);
    fixture.manualPurchases = [
      {
        id: "purchase-manual",
        statementId: "stmt-b",
        cardLast4: "2222",
        holderName: "JAVI",
        purchaseDate: "2026-07-01",
        description: "Compra manual",
        currency: "ARS",
        amountRaw: "90000.00",
        installments: 3,
      },
    ];
    fixture.projections.push(
      {
        id: "projection-manual-1",
        statementId: "stmt-b",
        rowId: "purchase-manual",
        monthKey: "2026-08",
        label: "Agosto-2026",
        installmentCurrent: 1,
        installmentTotal: 3,
        amountPesosRaw: "30000.00",
        amountDollarsRaw: null,
        currencyOriginal: "ARS",
        isManual: true,
      },
      {
        id: "projection-manual-2",
        statementId: "stmt-b",
        rowId: "purchase-manual",
        monthKey: "2026-09",
        label: "Setiembre-2026",
        installmentCurrent: 2,
        installmentTotal: 3,
        amountPesosRaw: "30000.00",
        amountDollarsRaw: null,
        currencyOriginal: "ARS",
        isManual: true,
      },
      {
        id: "projection-manual-3",
        statementId: "stmt-b",
        rowId: "purchase-manual",
        monthKey: "2026-10",
        label: "Octubre-2026",
        installmentCurrent: 3,
        installmentTotal: 3,
        amountPesosRaw: "30000.00",
        amountDollarsRaw: null,
        currencyOriginal: "ARS",
        isManual: true,
      },
    );
    const response = await read(fixture);
    expect(response.summary.ars).toBe("100000.00");
    expect(
      response.months
        .flatMap((month) => month.cards.flatMap((card) => card.rows))
        .filter((row) => row.originType === "manual_card_purchase"),
    ).toHaveLength(3);
  });

  it("keeps projections from multiple statements and reports persisted months outside the window", async () => {
    const fixture = structuredClone(datasetA);
    fixture.statements.push({
      id: "stmt-a-2",
      status: "superseded",
      periodLabel: "2026-08-01",
      periodKey: "2026-08",
      isActiveForPeriod: false,
      bankName: "Banco A",
      brand: "Mastercard",
      holderName: "JAVI",
    });
    fixture.groups.push({
      id: "group-a-2",
      statementId: "stmt-a-2",
      groupKey: "card-a-2",
      label: "Mastercard",
      cardLast4: "5678",
      holderName: "JAVI",
    });
    fixture.rows.push({
      id: "row-a-2",
      statementId: "stmt-a-2",
      groupKey: "card-a-2",
      rowType: "transaction",
      referenceRaw: "SECOND",
      dateIso: "2026-08-01",
      installmentRaw: "1/2",
      originalText: "Segundo resumen",
    });
    fixture.projections.push({
      id: "projection-a-2-1",
      statementId: "stmt-a-2",
      rowId: "row-a-2",
      monthKey: "2027-03",
      label: "Marzo-2027",
      installmentCurrent: 2,
      installmentTotal: 2,
      amountPesosRaw: "7000.00",
      amountDollarsRaw: null,
      currencyOriginal: "ARS",
      isManual: false,
    });
    const response = await read(fixture, {
      from: "2026-08",
      months: 1,
      includeCurrentPeriod: false,
    });
    expect(response.months[0].totals.ars).toBe("35000.00");
    expect(response.horizon.persistedMonths).toContain("2027-03");
    expect(response.horizon.persisted).toBe(true);
  });
});
