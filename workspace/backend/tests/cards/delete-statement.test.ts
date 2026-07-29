/**
 * Integration tests for `DELETE /api/card-statements/statements/:statementId`
 * (FEAT-028 — Delete Accepted Card Statements)
 *
 * RED: These tests fail because the route does not exist yet.
 * GREEN: After implementing the route and deleteStatement() service method,
 * these tests will pass.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import type { CardStatementPreview } from "../../src/modules/cards/cards.types.js";

function minimalPreview(
  overrides: Partial<CardStatementPreview> = {},
): CardStatementPreview {
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
    sections: [],
    groups: [],
    rows: [],
    futureInstallmentsBlock: [],
    ...overrides,
  };
}

async function seedAcceptedStatement(
  preview: CardStatementPreview,
): Promise<{ statementId: string; documentId: string }> {
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

  // Accept the draft via service
  const { cardsService } = await import("../../src/modules/cards/cards.service.js");
  const result = await cardsService.acceptDraft(draft.id, preview);

  return { statementId: result.statementId, documentId: document.id };
}

async function seedAcceptedStatementWithInstallments(
  cardLast4: string,
): Promise<{ statementId: string; documentId: string }> {
  const sectionKey = `section-${Date.now()}-1`;
  const groupKey = `group-${Date.now()}-1`;

  const preview = minimalPreview({
    source: {
      bankName: "Banco Galicia",
      brand: "Visa",
      statementNumber: `test-${Math.random().toString(36).slice(2, 10)}`,
      pageCount: 1,
    },
    sections: [{ id: sectionKey, label: "Compras", displayOrder: 1 }],
    groups: [
      {
        id: groupKey,
        sectionId: sectionKey,
        label: "Grupo 1",
        displayOrder: 1,
        cardLast4,
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
  });

  return seedAcceptedStatement(preview);
}

describe("DELETE /api/card-statements/statements/:statementId — FEAT-028", () => {
  let app: FastifyInstance;

  let createdStatementIds: string[] = [];
  let seededDocumentIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(() => {
    createdStatementIds = [];
    seededDocumentIds = [];
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
      if (seededDocumentIds.length > 0) {
        await prisma.cardStatementDraft.deleteMany({
          where: { documentId: { in: seededDocumentIds } },
        });
        await prisma.uploadedDocument.deleteMany({
          where: { id: { in: seededDocumentIds } },
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[delete-statement.test] cleanup failed:", err);
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("returns 404 for non-existent statement", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await app.inject({
      method: "DELETE",
      url: `/api/card-statements/statements/${fakeId}`,
    });

    // After GREEN: should be 404 with NOT_FOUND code
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 400 when attempting to delete a non-accepted statement", async () => {
    // Create and accept a statement
    const { statementId, documentId } = await seedAcceptedStatementWithInstallments("4521");
    createdStatementIds.push(statementId);
    seededDocumentIds.push(documentId);

    // Manually set the statement status to 'archived' to simulate a non-accepted state
    await prisma.cardStatement.update({
      where: { id: statementId },
      data: { status: "archived" },
    });

    // Attempt to delete the archived statement — should fail with 400
    const response = await app.inject({
      method: "DELETE",
      url: `/api/card-statements/statements/${statementId}`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("cascade-deletes an accepted statement with installments and returns { success: true, deletedId }", async () => {
    const { statementId, documentId } = await seedAcceptedStatementWithInstallments("4521");
    createdStatementIds.push(statementId);
    seededDocumentIds.push(documentId);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/card-statements/statements/${statementId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual({ success: true, deletedId: statementId });

    // Verify statement is gone
    const stmt = await prisma.cardStatement.findUnique({ where: { id: statementId } });
    expect(stmt).toBeNull();

    // Verify projections are cascade-deleted
    const projections = await prisma.cardInstallmentProjection.findMany({
      where: { statementId },
    });
    expect(projections).toHaveLength(0);

    // Verify sections are cascade-deleted
    const sections = await prisma.cardStatementSection.findMany({
      where: { statementId },
    });
    expect(sections).toHaveLength(0);

    // Verify groups are cascade-deleted
    const groups = await prisma.cardStatementGroup.findMany({
      where: { statementId },
    });
    expect(groups).toHaveLength(0);

    // Verify rows are cascade-deleted
    const rows = await prisma.cardStatementRow.findMany({
      where: { statementId },
    });
    expect(rows).toHaveLength(0);
  });

  it("deleting a statement with no projections succeeds", async () => {
    // Create an accepted statement with no installment rows
    const preview = minimalPreview({
      sections: [{ id: `sec-${Date.now()}`, label: "Sin compras", displayOrder: 1 }],
      groups: [],
      rows: [],
    });
    const { statementId, documentId } = await seedAcceptedStatement(preview);
    createdStatementIds.push(statementId);
    seededDocumentIds.push(documentId);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/card-statements/statements/${statementId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.deletedId).toBe(statementId);
  });
});
