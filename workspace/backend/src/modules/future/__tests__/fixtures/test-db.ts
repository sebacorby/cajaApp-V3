import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { FutureFixture } from "./support.js";

const execFileAsync = promisify(execFile);
let databaseSequence = 0;
const FIXED_DATE = new Date("2026-07-01T00:00:00.000Z");

type TestPrisma = PrismaClient;

function databaseUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

async function clearDatabase(db: TestPrisma): Promise<void> {
  const tables = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'",
  );
  await db.$executeRawUnsafe("PRAGMA foreign_keys = OFF");
  for (const table of tables) {
    const safeName = table.name.replace(/"/g, '""');
    await db.$executeRawUnsafe(`DELETE FROM "${safeName}"`);
  }
  await db.$executeRawUnsafe("PRAGMA foreign_keys = ON");
}

export async function createFutureTestDatabase(): Promise<{
  db: TestPrisma;
  filePath: string;
  close: () => Promise<void>;
}> {
  databaseSequence += 1;
  const filePath = path.join(
    os.tmpdir(),
    `cajaapp-future-${process.pid}-${databaseSequence}.db`,
  );
  await fs.rm(filePath, { force: true });

  const template = path.resolve(process.cwd(), "prisma", "dev.db");
  try {
    await fs.copyFile(template, filePath);
  } catch {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    await execFileAsync(npx, ["prisma", "migrate", "deploy"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl(filePath) },
    });
  }

  const db = new PrismaClient({
    datasources: { db: { url: databaseUrl(filePath) } },
  });
  await db.$connect();
  await clearDatabase(db);

  return {
    db,
    filePath,
    close: async () => {
      await db.$disconnect();
      await fs.rm(filePath, { force: true });
    },
  };
}

export async function resetFutureTestDatabase(db: TestPrisma): Promise<void> {
  await clearDatabase(db);
}

export async function seedFutureFixture(db: TestPrisma, fixture: FutureFixture): Promise<void> {
  for (const statement of fixture.statements) {
    const documentId = `document-${statement.id}`;
    await db.uploadedDocument.create({
      data: {
        id: documentId,
        fileName: `${statement.id}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1,
        sha256: `sha-${statement.id}`,
        storagePath: `storage/${statement.id}.pdf`,
        pageCount: 1,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      },
    });
    await db.cardStatement.create({
      data: {
        id: statement.id,
        documentId,
        status: statement.status,
        periodKey: statement.periodLabel?.slice(0, 7) ?? null,
        periodLabel: statement.periodLabel,
        isActiveForPeriod: statement.isActiveForPeriod,
        bankName: statement.bankName ?? null,
        brand: statement.brand ?? null,
        holderName: statement.holderName ?? null,
        version: 1,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      },
    });
  }

  for (const group of fixture.groups) {
    await db.cardStatementGroup.create({
      data: {
        id: group.id,
        statementId: group.statementId,
        groupKey: group.groupKey,
        sectionKey: "consumption-detail",
        label: group.label,
        displayOrder: 1,
        cardLast4: group.cardLast4,
        holderName: group.holderName,
      },
    });
  }

  for (const row of fixture.rows) {
    await db.cardStatementRow.create({
      data: {
        id: row.id,
        statementId: row.statementId,
        sectionKey: "consumption-detail",
        groupKey: row.groupKey,
        displayOrder: 1,
        rowType: row.rowType,
        editable: true,
        dateIso: row.dateIso,
        installmentRaw: row.installmentRaw,
        referenceRaw: row.referenceRaw,
        currencyOriginal: row.currencyOriginal ?? "ARS",
        amountPesosRaw: row.amountPesosRaw ?? null,
        amountDollarsRaw: row.amountDollarsRaw ?? null,
        originalText: row.originalText,
      },
    });
  }

  for (const purchase of fixture.manualPurchases) {
    await db.manualCardPurchase.create({
      data: {
        id: purchase.id,
        statementId: purchase.statementId,
        cardLast4: purchase.cardLast4,
        holderName: purchase.holderName,
        purchaseDate: purchase.purchaseDate,
        description: purchase.description,
        currency: purchase.currency,
        amountRaw: purchase.amountRaw,
        installments: purchase.installments,
        notes: purchase.notes ?? null,
        createdAt: FIXED_DATE,
      },
    });
  }

  for (const projection of fixture.projections) {
    await db.cardInstallmentProjection.create({
      data: {
        id: projection.id,
        statementId: projection.statementId,
        rowId: projection.rowId,
        monthKey: projection.monthKey,
        label: projection.label,
        installmentCurrent: projection.installmentCurrent,
        installmentTotal: projection.installmentTotal,
        amountPesosRaw: projection.amountPesosRaw,
        amountDollarsRaw: projection.amountDollarsRaw,
        currencyOriginal: projection.currencyOriginal,
        isManual: projection.isManual,
        createdAt: FIXED_DATE,
      },
    });
  }
}

export function asFutureDebtReader(db: TestPrisma) {
  return db;
}
