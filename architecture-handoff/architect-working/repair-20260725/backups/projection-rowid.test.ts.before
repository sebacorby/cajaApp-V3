/**
 * Integration test for Bug 1 (FEAT-027): CardInstallmentProjection.rowId
 * stores preview row IDs instead of persisted UUIDs after draft acceptance.
 *
 * RED: This test fails because acceptDraft() creates projections with
 * preview row IDs (e.g. "g-1" or preview UUIDs) rather than the actual
 * CardStatementRow.id UUIDs that the database generates.
 *
 * GREEN: After the fix, every projection.rowId will match a real
 * CardStatementRow.id, and normalizeProjection() can correctly join
 * projections to rows.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import type { CardStatementPreview } from "../../src/modules/cards/cards.types.js";

function minimalPreviewWithInstallment(
  overrides: Partial<CardStatementPreview> = {},
): CardStatementPreview {
  const sectionKey = `section-${Date.now()}-1`;
  const groupKey = `group-${Date.now()}-1`;
  return {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: "Visa",
      statementNumber: `test-${Math.random().toString(36).slice(2, 10)}`,
      pageCount: 1,
    },
    summary: {
      totalPesos: "150000.00",
      totalDollars: "150.00",
      minimumPaymentPesos: "15000.00",
      currentDueDate: "2026-07-15",
      nextClosingDate: "2026-07-28",
      nextDueDate: "2026-08-15",
    },
    sections: [
      { id: sectionKey, label: "Compras", displayOrder: 1 },
    ],
    groups: [
      {
        id: groupKey,
        sectionId: sectionKey,
        label: "Grupo 1",
        displayOrder: 1,
        cardLast4: "4521",
        holderName: "Juan Perez",
      },
    ],
    rows: [
      {
        id: `preview-row-${Date.now()}-1`,
        displayOrder: 1,
        sectionId: sectionKey,
        sectionLabel: "Compras",
        groupId: groupKey,
        groupLabel: "Grupo 1",
        groupOrder: 1,
        rowType: "transaction",
        editable: false,
        sourcePage: null,
        dateRaw: "2026-07-01",
        dateIso: "2026-07-01",
        markerRaw: null,
        referenceRaw: "Amazon.com",
        installmentRaw: "1/3",
        installmentCurrent: 1,
        installmentTotal: 3,
        receiptRaw: null,
        amountPesos: "50000.00",
        amountDollars: null,
        currencyOriginal: "ARS",
        originalText: "Amazon.com purchase",
        confidence: 0.99,
        warnings: [],
      },
    ],
    futureInstallmentsBlock: [],
    ...overrides,
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

describe("FEAT-027: CardInstallmentProjection.rowId after acceptDraft", () => {
  let app: FastifyInstance;

  let seededDraftIds: string[] = [];
  let seededDocumentIds: string[] = [];
  let createdStatementIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(() => {
    seededDraftIds = [];
    seededDocumentIds = [];
    createdStatementIds = [];
  });

  afterEach(async () => {
    try {
      if (createdStatementIds.length > 0) {
        await prisma.cardInstallmentProjection.deleteMany({
          where: { statementId: { in: createdStatementIds } },
        });
        await prisma.cardStatementRow.deleteMany({
          where: { statementId: { in: createdStatementIds } },
        });
        await prisma.cardStatementSection.deleteMany({
          where: { statementId: { in: createdStatementIds } },
        });
        await prisma.cardStatementGroup.deleteMany({
          where: { statementId: { in: createdStatementIds } },
        });
        await prisma.cardStatement.deleteMany({
          where: { id: { in: createdStatementIds } },
        });
      }
      if (seededDraftIds.length > 0) {
        await prisma.cardStatementDraftSection.deleteMany({
          where: { draftId: { in: seededDraftIds } },
        });
        await prisma.cardStatementDraftGroup.deleteMany({
          where: { draftId: { in: seededDraftIds } },
        });
        await prisma.cardStatementDraftRow.deleteMany({
          where: { draftId: { in: seededDraftIds } },
        });
        await prisma.cardStatementDraft.deleteMany({
          where: { id: { in: seededDraftIds } },
        });
      }
      if (seededDocumentIds.length > 0) {
        await prisma.uploadedDocument.deleteMany({
          where: { id: { in: seededDocumentIds } },
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[projection-rowid.test] cleanup failed:", err);
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("projection.rowId matches persisted CardStatementRow.id after draft acceptance", async () => {
    const preview = minimalPreviewWithInstallment();
    const { draftId, documentId } = await seedPreviewReadyDraft(preview);
    seededDraftIds.push(draftId);
    seededDocumentIds.push(documentId);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${draftId}/accept`,
      payload: { preview },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const statementId = body.statementId;
    createdStatementIds.push(statementId);

    // Fetch the persisted rows and projections
    const rows = await prisma.cardStatementRow.findMany({
      where: { statementId },
      orderBy: { displayOrder: "asc" },
    });
    const projections = await prisma.cardInstallmentProjection.findMany({
      where: { statementId },
      orderBy: { monthKey: "asc" },
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(projections.length).toBeGreaterThan(0);

    // Every non-manual projection's rowId must match exactly one persisted row.id
    const nonManualProjections = projections.filter((p) => !p.isManual);
    expect(nonManualProjections.length).toBeGreaterThan(0);

    for (const projection of nonManualProjections) {
      const matchedRow = rows.find((r) => r.id === projection.rowId);
      expect(matchedRow).toBeDefined(),
        `Projection id=${projection.id} has rowId="${projection.rowId}" which is not a persisted CardStatementRow.id. ` +
        `Available row ids: ${rows.map((r) => r.id).join(", ")}`;
    }
  });

  it("all non-manual projections for the new statement have valid rowId references", async () => {
    const preview = minimalPreviewWithInstallment();
    const { draftId, documentId } = await seedPreviewReadyDraft(preview);
    seededDraftIds.push(draftId);
    seededDocumentIds.push(documentId);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${draftId}/accept`,
      payload: { preview },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const statementId = body.statementId;
    createdStatementIds.push(statementId);

    // Verify the projections for our new statement don't have missing card references
    // by checking that each projection's rowId matches a real persisted row
    const rows = await prisma.cardStatementRow.findMany({
      where: { statementId },
      orderBy: { displayOrder: "asc" },
    });
    const projections = await prisma.cardInstallmentProjection.findMany({
      where: { statementId },
    });

    const nonManualProjections = projections.filter((p) => !p.isManual);
    const projectionsWithValidRowId = nonManualProjections.filter((p) =>
      rows.some((r) => r.id === p.rowId),
    );

    // After the fix, ALL non-manual projections should have valid rowId references
    expect(projectionsWithValidRowId).toHaveLength(nonManualProjections.length),
      `${nonManualProjections.length - projectionsWithValidRowId.length} of ${nonManualProjections.length} ` +
      `non-manual projections have rowId values that don't match any CardStatementRow.id`;
  });
});
