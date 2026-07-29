import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { cardsService } from "../../src/modules/cards/cards.service.js";

describe("listPendingDraftSummaries", () => {
  beforeEach(async () => {
    // Clean up any test drafts
    await prisma.cardStatementDraftRow.deleteMany({ where: { draft: { status: { in: ["preview_ready", "failed"] } } } });
    await prisma.cardStatementDraftGroup.deleteMany({ where: { draft: { status: { in: ["preview_ready", "failed"] } } } });
    await prisma.cardStatementDraftSection.deleteMany({ where: { draft: { status: { in: ["preview_ready", "failed"] } } } });
    await prisma.cardStatementDraft.deleteMany({ where: { status: { in: ["preview_ready", "failed"] } } });
  });

  it("returns only preview_ready and failed drafts when status is omitted (all)", async () => {
    // Seed a preview_ready draft
    const doc1 = await prisma.uploadedDocument.create({
      data: { fileName: "ready.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/ready.pdf" },
    });
    const draftReady = await prisma.cardStatementDraft.create({
      data: { documentId: doc1.id, status: "preview_ready" },
    });

    // Seed an unrelated imported draft (should be excluded)
    const doc2 = await prisma.uploadedDocument.create({
      data: { fileName: "imported.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "def", storagePath: "/tmp/imported.pdf" },
    });
    await prisma.cardStatementDraft.create({
      data: { documentId: doc2.id, status: "imported" },
    });

    const result = await cardsService.listPendingDraftSummaries({});

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(draftReady.id);
    expect(result[0].status).toBe("preview_ready");
  });

  it("returns only preview_ready drafts when status is preview_ready", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "ready.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/ready.pdf" },
    });
    await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "preview_ready" },
    });

    const result = await cardsService.listPendingDraftSummaries({ status: "preview_ready" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("preview_ready");
  });

  it("returns only failed drafts when status is failed", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "failed.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/failed.pdf" },
    });
    await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "failed" },
    });

    const result = await cardsService.listPendingDraftSummaries({ status: "failed" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("failed");
  });

  it("returns both preview_ready and failed when status is all", async () => {
    const doc1 = await prisma.uploadedDocument.create({
      data: { fileName: "ready.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/ready.pdf" },
    });
    const doc2 = await prisma.uploadedDocument.create({
      data: { fileName: "failed.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "def", storagePath: "/tmp/failed.pdf" },
    });
    await prisma.cardStatementDraft.create({ data: { documentId: doc1.id, status: "preview_ready" } });
    await prisma.cardStatementDraft.create({ data: { documentId: doc2.id, status: "failed" } });

    const result = await cardsService.listPendingDraftSummaries({ status: "all" });

    expect(result).toHaveLength(2);
    const statuses = result.map((r) => r.status);
    expect(statuses).toContain("preview_ready");
    expect(statuses).toContain("failed");
  });

  it("each summary contains id, status, createdAt, fileName", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "test-summary.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/test-summary.pdf" },
    });
    await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "preview_ready" },
    });

    const result = await cardsService.listPendingDraftSummaries({});

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("status", "preview_ready");
    expect(result[0]).toHaveProperty("createdAt");
    expect(result[0]).toHaveProperty("fileName", "test-summary.pdf");
  });

  it("failed draft includes errorMessage when AiExtractionRun.validationErrors is set", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "error-draft.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/error-draft.pdf" },
    });
    const aiRun = await prisma.aiExtractionRun.create({
      data: {
        documentId: doc.id,
        validationErrors: "No se pudo validar el resumen",
        promptFilePath: "/tmp/prompt.txt",
        promptHash: "abc",
        modelProvider: "test",
        modelBaseUrl: "http://test",
        modelName: "test",
        status: "failed",
      },
    });
    await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "failed", aiRunId: aiRun.id },
    });

    const result = await cardsService.listPendingDraftSummaries({ status: "failed" });

    expect(result).toHaveLength(1);
    expect(result[0].errorMessage).toBe("No se pudo validar el resumen");
  });

  it("pagination with limit returns correct number of items", async () => {
    const doc1 = await prisma.uploadedDocument.create({
      data: { fileName: "first.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "aaa", storagePath: "/tmp/first.pdf" },
    });
    const doc2 = await prisma.uploadedDocument.create({
      data: { fileName: "second.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "bbb", storagePath: "/tmp/second.pdf" },
    });
    await prisma.cardStatementDraft.create({ data: { documentId: doc1.id, status: "preview_ready" } });
    await prisma.cardStatementDraft.create({ data: { documentId: doc2.id, status: "failed" } });

    const result = await cardsService.listPendingDraftSummaries({ limit: 1 });

    expect(result).toHaveLength(1);
  });

  it("pagination with offset skips correct items", async () => {
    const doc1 = await prisma.uploadedDocument.create({
      data: { fileName: "first.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "aaa", storagePath: "/tmp/first.pdf" },
    });
    const doc2 = await prisma.uploadedDocument.create({
      data: { fileName: "second.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "bbb", storagePath: "/tmp/second.pdf" },
    });
    await prisma.cardStatementDraft.create({ data: { documentId: doc1.id, status: "preview_ready" } });
    await prisma.cardStatementDraft.create({ data: { documentId: doc2.id, status: "failed" } });

    const result = await cardsService.listPendingDraftSummaries({ offset: 1 });

    expect(result).toHaveLength(1);
  });

  it("returns empty array when no pending drafts exist", async () => {
    const result = await cardsService.listPendingDraftSummaries({});
    expect(result).toHaveLength(0);
  });
});
