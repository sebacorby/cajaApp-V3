/**
 * Integration tests for `POST /api/card-statements/drafts/:draftId/accept`
 * with non-ISO `summary` dates.
 *
 * RED → GREEN wire-up verification: tests fail BEFORE the controller wires up
 * the date normalizer (Task R2-3) and pass AFTER (Task R2-4).
 *
 * Uses the project's existing dev.db (the singleton prisma in
 * `src/db/prisma.ts` always points there). Each test seeds a uniquely-named
 * draft so other tests' state is irrelevant.
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
      totalPesos: "100000.00",
      totalDollars: "100.00",
      minimumPaymentPesos: "10000.00",
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

async function seedPreviewReadyDraft(
  preview: CardStatementPreview,
): Promise<string> {
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
  return draft.id;
}

describe("POST /api/card-statements/drafts/:draftId/accept — non-ISO summary dates", () => {
  let app: FastifyInstance;

  // Track seeded rows so we can clean up between tests.
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
    // Clean up after each test so dev.db stays tidy AND so failures don't leak
    // state into subsequent tests. Best-effort: a cleanup error here does
    // not affect the test result.
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
      console.error("[cards.controller.accept.test] cleanup failed:", err);
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('accepts "13-Jul-26" as ISO "2026-07-13"', async () => {
    const preview = minimalPreview({
      summary: {
        totalPesos: "100000.00",
        totalDollars: "100.00",
        minimumPaymentPesos: "10000.00",
        currentDueDate: "13-Jul-26",
        nextClosingDate: "28-Jul-26",
        nextDueDate: "15/08/2026",
      },
    });
    const draftId = await seedPreviewReadyDraft(preview);
    seededDraftIds.push(draftId);
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
    });
    if (draft) seededDocumentIds.push(draft.documentId);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${draftId}/accept`,
      payload: { preview },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    createdStatementIds.push(body.statementId);

    const stmt = await prisma.cardStatement.findFirst({
      where: { draftId },
      orderBy: { createdAt: "desc" },
    });
    expect(stmt).not.toBeNull();
    expect(stmt!.currentDueDate).toBe("2026-07-13");
    expect(stmt!.nextClosingDate).toBe("2026-07-28");
    expect(stmt!.nextDueDate).toBe("2026-08-15");
  });

  it("accepts mixed formats across the three date fields", async () => {
    const preview = minimalPreview({
      summary: {
        totalPesos: "100000.00",
        totalDollars: "100.00",
        minimumPaymentPesos: "10000.00",
        currentDueDate: "2026-07-13",
        nextClosingDate: "28-Jul-26",
        nextDueDate: "15/08/2026",
      },
    });
    const draftId = await seedPreviewReadyDraft(preview);
    seededDraftIds.push(draftId);
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
    });
    if (draft) seededDocumentIds.push(draft.documentId);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${draftId}/accept`,
      payload: { preview },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    createdStatementIds.push(body.statementId);

    const stmt = await prisma.cardStatement.findFirst({
      where: { draftId },
      orderBy: { createdAt: "desc" },
    });
    expect(stmt).not.toBeNull();
    expect(stmt!.currentDueDate).toBe("2026-07-13");
    expect(stmt!.nextClosingDate).toBe("2026-07-28");
    expect(stmt!.nextDueDate).toBe("2026-08-15");
  });

  it("rejects unrecognizable format with HTTP 400 carrying field and value", async () => {
    const preview = minimalPreview({
      summary: {
        totalPesos: "100000.00",
        totalDollars: "100.00",
        minimumPaymentPesos: "10000.00",
        currentDueDate: "not a date",
        nextClosingDate: null,
        nextDueDate: null,
      },
    });
    const draftId = await seedPreviewReadyDraft(preview);
    seededDraftIds.push(draftId);
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
    });
    if (draft) seededDocumentIds.push(draft.documentId);

    const response = await app.inject({
      method: "POST",
      url: `/api/card-statements/drafts/${draftId}/accept`,
      payload: { preview },
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.message).toContain("currentDueDate");
    expect(body.message).toContain("not a date");

    const count = await prisma.cardStatement.count({ where: { draftId } });
    expect(count).toBe(0);
  });
});
