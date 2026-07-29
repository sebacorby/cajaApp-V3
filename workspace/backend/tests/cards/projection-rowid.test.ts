import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import type { CardStatementPreview } from "../../src/modules/cards/cards.types.js";

function buildPreview(): CardStatementPreview {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sectionId = `section-${suffix}`;
  const groupId = `group-${suffix}`;

  return {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: "Visa",
      statementNumber: `projection-rowid-${suffix}`,
      pageCount: 1,
    },
    summary: {
      totalPesos: "50000.00",
      totalDollars: "0.00",
      minimumPaymentPesos: "5000.00",
      currentDueDate: "2026-07-15",
      nextClosingDate: "2026-07-28",
      nextDueDate: "2026-08-15",
    },
    sections: [{ id: sectionId, label: "Compras", displayOrder: 1 }],
    groups: [
      {
        id: groupId,
        sectionId,
        label: "Visa 4521",
        displayOrder: 1,
        cardLast4: "4521",
        holderName: "JAVI",
      },
    ],
    rows: [
      {
        id: `preview-row-${suffix}`,
        displayOrder: 1,
        sectionId,
        sectionLabel: "Compras",
        groupId,
        groupLabel: "Visa 4521",
        groupOrder: 1,
        rowType: "transaction",
        editable: false,
        sourcePage: null,
        dateRaw: "01/07/2026",
        dateIso: "2026-07-01",
        markerRaw: null,
        referenceRaw: "COMPRA TEST",
        installmentRaw: "1/3",
        installmentCurrent: 1,
        installmentTotal: 3,
        receiptRaw: null,
        amountPesos: "50000.00",
        amountDollars: null,
        currencyOriginal: "ARS",
        originalText: "COMPRA TEST 1/3 50000.00",
        confidence: 0.99,
        warnings: [],
      },
    ],
    futureInstallmentsBlock: [],
  };
}

describe("CardInstallmentProjection.rowId integrity", () => {
  let app: FastifyInstance;
  const statementIds: string[] = [];
  const draftIds: string[] = [];
  const documentIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    if (statementIds.length > 0) {
      await prisma.cardInstallmentProjection.deleteMany({
        where: { statementId: { in: statementIds } },
      });
      await prisma.cardStatementRow.deleteMany({
        where: { statementId: { in: statementIds } },
      });
      await prisma.cardStatementGroup.deleteMany({
        where: { statementId: { in: statementIds } },
      });
      await prisma.cardStatementSection.deleteMany({
        where: { statementId: { in: statementIds } },
      });
      await prisma.cardStatement.deleteMany({ where: { id: { in: statementIds } } });
      statementIds.splice(0);
    }

    if (draftIds.length > 0) {
      await prisma.cardStatementDraftRow.deleteMany({ where: { draftId: { in: draftIds } } });
      await prisma.cardStatementDraftGroup.deleteMany({ where: { draftId: { in: draftIds } } });
      await prisma.cardStatementDraftSection.deleteMany({ where: { draftId: { in: draftIds } } });
      await prisma.cardStatementDraft.deleteMany({ where: { id: { in: draftIds } } });
      draftIds.splice(0);
    }

    if (documentIds.length > 0) {
      await prisma.uploadedDocument.deleteMany({ where: { id: { in: documentIds } } });
      documentIds.splice(0);
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("persists every non-manual projection with a real CardStatementRow.id", async () => {
    const preview = buildPreview();
    const document = await prisma.uploadedDocument.create({
      data: {
        fileName: `projection-rowid-${Date.now()}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1,
        sha256: `projection-rowid-${Date.now()}-${Math.random()}`,
        storagePath: `storage/projection-rowid-${Date.now()}.pdf`,
        pageCount: 1,
      },
    });
    documentIds.push(document.id);

    const draft = await prisma.cardStatementDraft.create({
      data: {
        documentId: document.id,
        status: "preview_ready",
        previewJson: JSON.stringify(preview),
      },
    });
    draftIds.push(draft.id);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${draft.id}/accept`,
      payload: { preview },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { statementId: string };
    expect(body.statementId).toBeTruthy();
    statementIds.push(body.statementId);

    const [rows, projections] = await Promise.all([
      prisma.cardStatementRow.findMany({
        where: { statementId: body.statementId },
        select: { id: true },
      }),
      prisma.cardInstallmentProjection.findMany({
        where: { statementId: body.statementId, isManual: false },
        select: { id: true, rowId: true },
      }),
    ]);

    expect(rows.length).toBeGreaterThan(0);
    expect(projections.length).toBeGreaterThan(0);

    const persistedRowIds = new Set(rows.map((row) => row.id));
    for (const projection of projections) {
      expect(
        persistedRowIds.has(projection.rowId),
        `Projection ${projection.id} references non-persisted rowId ${projection.rowId}`,
      ).toBe(true);
    }
  });
});
