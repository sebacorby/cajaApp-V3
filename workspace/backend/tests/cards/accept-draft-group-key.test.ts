import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import type { CardStatementPreview } from "../../src/modules/cards/cards.types.js";

function previewWithRealGroupSemantics(): CardStatementPreview {
  return {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: "Mastercard",
      statementNumber: `test-${Math.random().toString(36).slice(2, 10)}`,
      pageCount: 1,
    },
    summary: {
      totalPesos: "268333.33",
      totalDollars: "0.00",
      minimumPaymentPesos: "10000.00",
      currentDueDate: "2026-07-15",
      nextClosingDate: "2026-07-28",
      nextDueDate: "2026-08-15",
    },
    sections: [{ id: "s-1", displayOrder: 1, label: "Consumos" }],
    groups: [
      {
        id: "g-mastercard-black",
        displayOrder: 1,
        label: "MASTERCARD BLACK",
        cardLast4: "1234",
        holderName: "Javier",
      },
    ],
    rows: [
      {
        id: "row-scentertuc",
        displayOrder: 1,
        sourcePage: 1,
        sectionId: "s-1",
        sectionLabel: "Consumos",
        groupId: "g-mastercard-black",
        groupLabel: "MASTERCARD BLACK",
        groupOrder: 1,
        rowType: "transaction",
        editable: false,
        dateRaw: "11/05/2026",
        dateIso: "2026-05-11",
        markerRaw: null,
        referenceRaw: "MERPAGO*SCENTERTUC",
        installmentRaw: "2/18",
        installmentCurrent: 2,
        installmentTotal: 18,
        receiptRaw: "01624",
        amountPesos: "268333.33",
        amountDollars: null,
        currencyOriginal: "ARS",
        originalText: "11-May-26 MERPAGO*SCENTERTUC 02/18 01624 268.333,33",
        confidence: 0.99,
        warnings: [],
      },
      {
        id: "row-iara",
        displayOrder: 2,
        sourcePage: 1,
        sectionId: "s-1",
        sectionLabel: "Consumos",
        groupId: "g-mastercard-black",
        groupLabel: "MASTERCARD BLACK",
        groupOrder: 1,
        rowType: "transaction",
        editable: false,
        dateRaw: "06/06/2026",
        dateIso: "2026-06-06",
        markerRaw: null,
        referenceRaw: "IARA CALZADOS",
        installmentRaw: "1/3",
        installmentCurrent: 1,
        installmentTotal: 3,
        receiptRaw: "01003",
        amountPesos: "21666.68",
        amountDollars: null,
        currencyOriginal: "ARS",
        originalText: "06-Jun-26 IARA CALZADOS 01/03 01003 21.666,68",
        confidence: 0.99,
        warnings: [],
      },
    ],
    futureInstallmentsBlock: [],
  };
}

async function seedPreviewReadyDraft(
  preview: CardStatementPreview,
): Promise<{ draftId: string; documentId: string }> {
  const document = await prisma.uploadedDocument.create({
    data: {
      fileName: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1,
      sha256: `sha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      storagePath: `storage/test-${Date.now()}.pdf`,
      pageCount: 1,
    },
  });
  const draft = await prisma.cardStatementDraft.create({
    data: {
      documentId: document.id,
      status: "preview_ready",
      previewJson: JSON.stringify(preview),
    },
  });
  return { draftId: draft.id, documentId: document.id };
}

describe("accepted statement row/group/projection linkage", () => {
  let app: FastifyInstance;
  let documentIds: string[] = [];
  let statementIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(() => {
    documentIds = [];
    statementIds = [];
  });

  afterEach(async () => {
    if (statementIds.length > 0) {
      await prisma.cardStatement.deleteMany({ where: { id: { in: statementIds } } });
    }
    if (documentIds.length > 0) {
      await prisma.uploadedDocument.deleteMany({ where: { id: { in: documentIds } } });
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("keeps each projection linked to its own row and the real card group", async () => {
    const preview = previewWithRealGroupSemantics();
    const seeded = await seedPreviewReadyDraft(preview);
    documentIds.push(seeded.documentId);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${seeded.draftId}/accept`,
      payload: { preview },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { statementId: string };
    statementIds.push(body.statementId);

    const [rows, groups, projections] = await Promise.all([
      prisma.cardStatementRow.findMany({
        where: { statementId: body.statementId },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.cardStatementGroup.findMany({
        where: { statementId: body.statementId },
      }),
      prisma.cardInstallmentProjection.findMany({
        where: { statementId: body.statementId, isManual: false },
        orderBy: [{ monthKey: "asc" }, { installmentCurrent: "asc" }],
      }),
    ]);

    const scentertuc = rows.find((row) => row.referenceRaw === "MERPAGO*SCENTERTUC");
    const iara = rows.find((row) => row.referenceRaw === "IARA CALZADOS");
    expect(scentertuc).toBeDefined();
    expect(iara).toBeDefined();

    const group = groups.find((item) => item.groupKey === "g-mastercard-black");
    expect(group).toBeDefined();
    expect(group?.cardLast4).toBe("1234");

    expect(scentertuc?.groupKey).toBe("g-mastercard-black");
    expect(iara?.groupKey).toBe("g-mastercard-black");

    const scentertucProjection = projections.find(
      (projection) =>
        projection.amountPesosRaw === "268333.33" &&
        projection.installmentCurrent === 3,
    );
    const iaraProjection = projections.find(
      (projection) =>
        projection.amountPesosRaw === "21666.68" &&
        projection.installmentCurrent === 2,
    );

    expect(scentertucProjection?.rowId).toBe(scentertuc?.id);
    expect(iaraProjection?.rowId).toBe(iara?.id);
    expect(scentertucProjection?.rowId).not.toBe(iara?.id);
    expect(iaraProjection?.rowId).not.toBe(scentertuc?.id);
  });
});
