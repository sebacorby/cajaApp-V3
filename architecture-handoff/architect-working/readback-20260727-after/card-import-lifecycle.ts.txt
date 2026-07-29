import crypto from "crypto";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../shared/logger.js";

const ACTIVE_CARD_DRAFT_STATUSES = ["processing", "preview_ready"] as const;

function sha256Hex(file: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(file).digest("hex");
}

export async function releaseCardImportDocument(
  documentId: string,
  reason: string,
): Promise<boolean> {
  try {
    const [
      remainingStatements,
      activeCardDrafts,
      salaryReceipts,
      salaryReceiptDrafts,
    ] = await Promise.all([
      prisma.cardStatement.count({ where: { documentId } }),
      prisma.cardStatementDraft.count({
        where: {
          documentId,
          status: { in: [...ACTIVE_CARD_DRAFT_STATUSES] },
        },
      }),
      prisma.salaryReceipt.count({ where: { documentId } }),
      prisma.salaryReceiptDraft.count({ where: { documentId } }),
    ]);

    if (
      remainingStatements > 0 ||
      activeCardDrafts > 0 ||
      salaryReceipts > 0 ||
      salaryReceiptDrafts > 0
    ) {
      logger.info(
        {
          event: "card-import.release.skipped",
          documentId,
          reason,
          remainingStatements,
          activeCardDrafts,
          salaryReceipts,
          salaryReceiptDrafts,
        },
        "Card import document is still referenced and was not released",
      );
      return false;
    }

    const document = await prisma.uploadedDocument.findUnique({
      where: { id: documentId },
      select: { id: true, fileName: true, sha256: true },
    });

    if (!document) return false;

    // UploadedDocument owns the card draft and AI extraction run through
    // cascade relations. Removing the now-unreferenced document releases the
    // SHA-256 dedupe lock while leaving the physical cached PDF untouched.
    await prisma.uploadedDocument.delete({ where: { id: documentId } });

    logger.info(
      {
        event: "card-import.release.completed",
        documentId,
        fileName: document.fileName,
        sha256: document.sha256,
        reason,
      },
      "Released unreferenced card import document",
    );
    return true;
  } catch (error) {
    logger.error(
      {
        event: "card-import.release.failed",
        documentId,
        reason,
        err: error,
      },
      "Failed to release card import document",
    );
    return false;
  }
}

export async function purgeOrphanedAcceptedCardImportsForFile(
  file: Buffer | Uint8Array,
): Promise<number> {
  const sha256 = sha256Hex(file);

  const candidates = await prisma.uploadedDocument.findMany({
    where: { sha256 },
    select: {
      id: true,
      drafts: { select: { status: true } },
      statements: { select: { id: true } },
      salaryReceipts: { select: { id: true } },
      salaryReceiptDrafts: { select: { id: true } },
    },
  });

  let released = 0;

  for (const candidate of candidates) {
    const hasAcceptedDraft = candidate.drafts.some(
      (draft) => draft.status === "accepted",
    );
    const hasActiveDraft = candidate.drafts.some((draft) =>
      ACTIVE_CARD_DRAFT_STATUSES.includes(
        draft.status as (typeof ACTIVE_CARD_DRAFT_STATUSES)[number],
      ),
    );

    const isOrphanedAcceptedCardImport =
      candidate.statements.length === 0 &&
      hasAcceptedDraft &&
      !hasActiveDraft &&
      candidate.salaryReceipts.length === 0 &&
      candidate.salaryReceiptDrafts.length === 0;

    if (!isOrphanedAcceptedCardImport) continue;

    if (
      await releaseCardImportDocument(
        candidate.id,
        "orphaned_accepted_draft_before_reimport",
      )
    ) {
      released += 1;
    }
  }

  if (released > 0) {
    logger.info(
      {
        event: "card-import.orphaned-dedupe-locks-released",
        sha256,
        released,
      },
      "Released orphaned accepted card imports before reimport",
    );
  }

  return released;
}
