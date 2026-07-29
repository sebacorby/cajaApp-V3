import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { cardsService } from "../../src/modules/cards/cards.service.js";

describe("discardDraft", () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.cardStatementDraftRow.deleteMany({ where: { draft: { status: { in: ["preview_ready", "failed"] } } } });
    await prisma.cardStatementDraftGroup.deleteMany({ where: { draft: { status: { in: ["preview_ready", "failed"] } } } });
    await prisma.cardStatementDraftSection.deleteMany({ where: { draft: { status: { in: ["preview_ready", "failed"] } } } });
    await prisma.cardStatementDraft.deleteMany({ where: { status: { in: ["preview_ready", "failed"] } } });
  });

  it("deletes a preview_ready draft and returns { ok: true, deletedId }", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "to-discard.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "abc", storagePath: "/tmp/to-discard.pdf" },
    });
    const draft = await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "preview_ready" },
    });

    const result = await cardsService.discardDraft(draft.id);

    expect(result).toEqual({ ok: true, deletedId: draft.id });

    // Verify draft is gone
    const found = await prisma.cardStatementDraft.findUnique({ where: { id: draft.id } });
    expect(found).toBeNull();

    // Verify document is gone
    const foundDoc = await prisma.uploadedDocument.findUnique({ where: { id: doc.id } });
    expect(foundDoc).toBeNull();
  });

  it("deletes a failed draft and returns { ok: true, deletedId }", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "failed-discard.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "def", storagePath: "/tmp/failed-discard.pdf" },
    });
    const draft = await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "failed" },
    });

    const result = await cardsService.discardDraft(draft.id);

    expect(result).toEqual({ ok: true, deletedId: draft.id });

    const found = await prisma.cardStatementDraft.findUnique({ where: { id: draft.id } });
    expect(found).toBeNull();
  });

  it("cascade-deletes draft children (sections, groups, rows)", async () => {
    const doc = await prisma.uploadedDocument.create({
      data: { fileName: "cascade.pdf", mimeType: "application/pdf", sizeBytes: 100, sha256: "ghi", storagePath: "/tmp/cascade.pdf" },
    });
    const draft = await prisma.cardStatementDraft.create({
      data: { documentId: doc.id, status: "preview_ready" },
    });
    await prisma.cardStatementDraftSection.create({
      data: { draftId: draft.id, sectionKey: "sec1", label: "Section 1", displayOrder: 1 },
    });
    await prisma.cardStatementDraftGroup.create({
      data: { draftId: draft.id, groupKey: "grp1", sectionKey: "sec1", label: "Group 1", displayOrder: 1 },
    });
    await prisma.cardStatementDraftRow.create({
      data: { draftId: draft.id, sectionKey: "sec1", displayOrder: 1, rowType: "transaction", originalText: "Test row" },
    });

    await cardsService.discardDraft(draft.id);

    const sections = await prisma.cardStatementDraftSection.findMany({ where: { draftId: draft.id } });
    const groups = await prisma.cardStatementDraftGroup.findMany({ where: { draftId: draft.id } });
    const rows = await prisma.cardStatementDraftRow.findMany({ where: { draftId: draft.id } });

    expect(sections).toHaveLength(0);
    expect(groups).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });

  it("throws NotFoundError when draftId does not exist", async () => {
    await expect(cardsService.discardDraft("non-existent-id")).rejects.toThrow("Draft");
  });
});
